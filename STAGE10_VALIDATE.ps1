$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$container='tekniko-stage10-pg'
$db='tekniko_stage10_test'
function RunSql([string]$file){Write-Host "=== $file ===" -ForegroundColor Cyan;Get-Content -LiteralPath $file -Raw | docker exec -i $container psql -U postgres -d $db -v ON_ERROR_STOP=1;if($LASTEXITCODE-ne 0){throw "SQL FAIL: $file"}}
function RunStage9Base(){
  $file='supabase/migrations/20261007213150_assignment_timeout_redistribution.sql'
  Write-Host "=== $file (local pg_cron block omitted) ===" -ForegroundColor Cyan
  $sql=Get-Content -LiteralPath $file -Raw
  $sql=[regex]::Replace($sql,'create extension if not exists pg_cron[\s\S]*?\$cron_setup\$;','-- pg_cron is Supabase-managed and intentionally omitted in disposable PostgreSQL')
  $sql | docker exec -i $container psql -U postgres -d $db -v ON_ERROR_STOP=1
  if($LASTEXITCODE-ne 0){throw "SQL FAIL: $file"}
}
docker inspect $container *> $null
if($LASTEXITCODE-ne 0){docker run --name $container -e POSTGRES_PASSWORD=postgres -d postgres:16-alpine | Out-Null;Start-Sleep -Seconds 4}
docker exec $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $db WITH (FORCE);"
docker exec $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $db;"
RunSql 'supabase/tests/stage10_local_fixture.sql'
$migrations=@(
 '20261004000001_service_category_integrity.sql','20261004000002_operation_core.sql','20261004000003_dispatch_atomic_accept.sql','20261004000004_operation_security_rls.sql','20261004000005_accepted_price_snapshot.sql','20261004000006_operational_event_history.sql','20261004000007_operation_lifecycle_guard.sql','20261004000008_operation_access_hardening.sql','20261004231649_service_request_creation.sql','20261005012645_stage2_service_role_reads.sql','20261005025943_service_request_assessment_snapshot.sql','20261005122856_stage3_accepted_maximum_price.sql','20261005145000_stage4_technician_management.sql','20261005165245_technician_signup_onboarding.sql'
)
foreach($name in $migrations){RunSql "supabase/migrations/$name"}
RunSql 'supabase/tests/stage4_final_local_storage_stub.sql'
foreach($name in @('20261005193656_stage4_final_product_corrections.sql','20261006221345_stage5_find_eligible_technicians.sql','20261006225806_stage5_remove_fixed_active_job_capacity.sql','20261006230127_stage5_require_approved_category_on_accept.sql','20261007005802_service_request_scheduling_model.sql','20261007012744_add_scheduled_service_request_rpc.sql','20261007012821_harden_unpriced_service_request_compatibility.sql','20261007012845_add_scheduled_priced_service_request_rpc.sql','20261007012856_harden_priced_service_request_compatibility.sql','20261007032904_enforce_single_active_job_and_appointment.sql','20261007043358_create_service_appointment_rpc.sql','20261007073033_allow_direct_job_completion.sql')){RunSql "supabase/migrations/$name"}
RunStage9Base
foreach($name in @('20261008000451_start_initial_distribution_on_request_creation.sql','20261008094945_stage9_admin_manual_assignment.sql','20261008135114_stage9_admin_manual_assignment_candidates.sql','20261008150736_stage9_final_assignment_boundary.sql','20261009120000_stage10_case_core.sql','20261009121000_stage10_case_workflows.sql','20261009122000_stage10_private_evidence_kpi_admin.sql')){RunSql "supabase/migrations/$name"}
RunSql 'supabase/tests/stage10_case_integration.sql'
RunSql 'supabase/tests/stage10_audit_integration.sql'
Write-Host 'STAGE 10 LOCAL DATABASE GATE: PASS' -ForegroundColor Green
