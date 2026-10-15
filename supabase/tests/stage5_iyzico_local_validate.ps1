$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

$repoRoot=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
Set-Location -LiteralPath $repoRoot

$container='hizmetpey-stage5-iyzico-pg'
$volume='hizmetpey-stage5-iyzico-pgdata'
$database='tekniko_stage10_test'
$scopeLabel='stage5-iyzico-local'

function Assert-IsolatedTarget {
  $containerJsonRaw=docker container inspect $container
  if($LASTEXITCODE-ne 0){throw "Missing isolated container: $container"}
  $containerJson=($containerJsonRaw | ConvertFrom-Json)[0]
  if($containerJson.Name-ne "/$container"){throw 'Unexpected container identity'}
  if($containerJson.Config.Labels.'hizmetpey.scope'-ne $scopeLabel){
    throw 'Isolated container label mismatch'
  }
  if($containerJson.Config.Image-ne 'postgres:16-alpine'){
    throw 'Unexpected container image'
  }
  if(-not $containerJson.State.Running){throw 'Isolated container is not running'}
  if($containerJson.HostConfig.NetworkMode-ne 'none'){
    throw 'Isolated container must use network=none'
  }
  if($containerJson.HostConfig.PublishAllPorts){throw 'Published ports are forbidden'}
  if(@($containerJson.HostConfig.PortBindings.PSObject.Properties).Count-ne 0){
    throw 'Host port bindings are forbidden'
  }
  $dataMount=@($containerJson.Mounts | Where-Object Destination -eq '/var/lib/postgresql/data')
  if($dataMount.Count-ne 1 -or $dataMount[0].Type-ne 'volume' -or
     $dataMount[0].Name-ne $volume){
    throw 'Unexpected PostgreSQL data mount'
  }

  $volumeJsonRaw=docker volume inspect $volume
  if($LASTEXITCODE-ne 0){throw "Missing isolated volume: $volume"}
  $volumeJson=($volumeJsonRaw | ConvertFrom-Json)[0]
  if($volumeJson.Name-ne $volume -or
     $volumeJson.Labels.'hizmetpey.scope'-ne $scopeLabel){
    throw 'Isolated volume identity or label mismatch'
  }
}

function Wait-Postgres {
  for($attempt=0;$attempt-lt 30;$attempt++){
    docker exec $container pg_isready -U postgres -d postgres *> $null
    if($LASTEXITCODE-eq 0){return}
    Start-Sleep -Seconds 1
  }
  throw 'Isolated PostgreSQL did not become ready'
}

function Invoke-Postgres([string]$sql,[string]$db=$database){
  Assert-IsolatedTarget
  $sql | docker exec -i $container psql -X -U postgres -d $db -v ON_ERROR_STOP=1
  if($LASTEXITCODE-ne 0){throw 'PostgreSQL command failed'}
}

function Run-SqlFile([string]$relativePath){
  $path=Join-Path $repoRoot $relativePath
  if(-not (Test-Path -LiteralPath $path -PathType Leaf)){
    throw "Missing SQL file: $relativePath"
  }
  Write-Host "=== $relativePath ===" -ForegroundColor Cyan
  Invoke-Postgres (Get-Content -LiteralPath $path -Raw)
}

function Run-Stage9Base {
  $relativePath='supabase/migrations/20261007213150_assignment_timeout_redistribution.sql'
  $path=Join-Path $repoRoot $relativePath
  $sql=Get-Content -LiteralPath $path -Raw
  $sql=[regex]::Replace(
    $sql,
    'create extension if not exists pg_cron[\s\S]*?\$cron_setup\$;',
    '-- pg_cron is Supabase-managed and omitted only in this disposable PostgreSQL test'
  )
  Write-Host "=== $relativePath (pg_cron block omitted) ===" -ForegroundColor Cyan
  Invoke-Postgres $sql
}

Assert-IsolatedTarget
Wait-Postgres

# This is the only destructive statement in this runner. It can execute only
# after the exact container, label, volume, network and port guards above pass.
Invoke-Postgres "drop database if exists $database with (force);" 'postgres'
Invoke-Postgres "create database $database;" 'postgres'

Run-SqlFile 'supabase/tests/stage10_local_fixture.sql'

# Stage 5 finance-only location fixture. Values are copied from the repository's
# authoritative Turkey seed (20260926000003_turkey_locations.sql).
Invoke-Postgres @'
insert into public.cities(name,plate_code,is_active)
select 'ANKARA',6,true
where not exists(select 1 from public.cities where plate_code=6);
insert into public.districts(city_id,name,is_active)
select c.id,'ÇANKAYA',true from public.cities c
where c.plate_code=6
  and not exists(select 1 from public.districts d
    where d.city_id=c.id and d.name='ÇANKAYA');
'@

$baseMigrations=@(
  '20261004000001_service_category_integrity.sql',
  '20261004000002_operation_core.sql',
  '20261004000003_dispatch_atomic_accept.sql',
  '20261004000004_operation_security_rls.sql',
  '20261004000005_accepted_price_snapshot.sql',
  '20261004000006_operational_event_history.sql',
  '20261004000007_operation_lifecycle_guard.sql',
  '20261004000008_operation_access_hardening.sql',
  '20261004231649_service_request_creation.sql',
  '20261005012645_stage2_service_role_reads.sql',
  '20261005025943_service_request_assessment_snapshot.sql',
  '20261005122856_stage3_accepted_maximum_price.sql',
  '20261005145000_stage4_technician_management.sql',
  '20261005165245_technician_signup_onboarding.sql'
)
foreach($name in $baseMigrations){Run-SqlFile "supabase/migrations/$name"}
Run-SqlFile 'supabase/tests/stage4_final_local_storage_stub.sql'

$operationMigrations=@(
  '20261005193656_stage4_final_product_corrections.sql',
  '20261006221345_stage5_find_eligible_technicians.sql',
  '20261006225806_stage5_remove_fixed_active_job_capacity.sql',
  '20261006230127_stage5_require_approved_category_on_accept.sql',
  '20261007005802_service_request_scheduling_model.sql',
  '20261007012744_add_scheduled_service_request_rpc.sql',
  '20261007012821_harden_unpriced_service_request_compatibility.sql',
  '20261007012845_add_scheduled_priced_service_request_rpc.sql',
  '20261007012856_harden_priced_service_request_compatibility.sql',
  '20261007032904_enforce_single_active_job_and_appointment.sql',
  '20261007043358_create_service_appointment_rpc.sql',
  '20261007073033_allow_direct_job_completion.sql'
)
foreach($name in $operationMigrations){Run-SqlFile "supabase/migrations/$name"}
Run-Stage9Base

$stage9And10Migrations=@(
  '20261008000451_start_initial_distribution_on_request_creation.sql',
  '20261008094945_stage9_admin_manual_assignment.sql',
  '20261008135114_stage9_admin_manual_assignment_candidates.sql',
  '20261008150736_stage9_final_assignment_boundary.sql',
  '20261009120000_stage10_case_core.sql',
  '20261009121000_stage10_case_workflows.sql',
  '20261009122000_stage10_private_evidence_kpi_admin.sql'
)
foreach($name in $stage9And10Migrations){Run-SqlFile "supabase/migrations/$name"}

Invoke-Postgres @'
alter table public.customer_addresses
  add column if not exists city text,
  add column if not exists district text;
create unique index if not exists technician_service_areas_city_unique
  on public.technician_service_areas(technician_id,city_id)
  where district_id is null;
create unique index if not exists technician_service_areas_district_unique
  on public.technician_service_areas(technician_id,city_id,district_id)
  where district_id is not null;
'@
Run-SqlFile 'supabase/migrations/20261011000625_customer_technician_auth_profiles.sql'
Run-SqlFile 'supabase/migrations/20261011084530_auth_profile_security_hardening.sql'
Run-SqlFile 'supabase/migrations/20261011215411_stage12_finance_core.sql'
Run-SqlFile 'supabase/migrations/20261011215509_stage12_finance_gate_lifecycle.sql'
Run-SqlFile 'supabase/migrations/20261014193758_stage12_iyzico_integration_draft.sql'

# Existing Stage 12 fixture supplies the authoritative disposable test accounts
# and proves the fake finance path before the reconciliation upgrade.
Run-SqlFile 'supabase/tests/stage12_finance_integration.sql'
Run-SqlFile 'supabase/tests/stage5_iyzico_reconciliation_upgrade_setup.sql'
Run-SqlFile 'supabase/migrations/20261015104311_stage12_iyzico_reconciliation_issue_resolution.sql'
Run-SqlFile 'supabase/tests/stage5_iyzico_reconciliation_resolution.sql'
Run-SqlFile 'supabase/tests/stage5_iyzico_db_integration.sql'

node 'supabase/tests/stage5_iyzico_db_concurrency.mjs' $container
if($LASTEXITCODE-ne 0){throw 'Stage 5 iyzico concurrency test failed'}

# The named, labelled volume must retain journal state across a server restart.
Assert-IsolatedTarget
docker restart $container | Out-Null
if($LASTEXITCODE-ne 0){throw 'Isolated PostgreSQL restart failed'}
Wait-Postgres
Assert-IsolatedTarget
$restartCount=(docker exec $container psql -X -q -t -A -U postgres -d $database `
  -v ON_ERROR_STOP=1 -c "select count(*) from public.finance_iyzico_operations where business_operation_key like 'stage5:concurrency:%' and state='unknown'")
if($LASTEXITCODE-ne 0 -or [int]$restartCount.Trim()-lt 1){
  throw 'Durable iyzico operation did not survive PostgreSQL restart'
}

Write-Host 'STAGE 5.2 IYZICO LOCAL DATABASE GATE: PASS' -ForegroundColor Green
