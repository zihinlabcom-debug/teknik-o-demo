$ErrorActionPreference='Stop'
Set-Location 'C:\Users\ibetu\teknik-o-demo'
$container='tekniko-operation-pg'
$db='tekniko_operation_test'
function RunSql($f){Write-Host "=== $f ===" -ForegroundColor Cyan; Get-Content $f -Raw | docker exec -i $container psql -U postgres -d $db -v ON_ERROR_STOP=1; if($LASTEXITCODE-ne 0){throw "SQL FAIL: $f"}}
function RunCmd($name,[scriptblock]$cmd){Write-Host "=== $name ===" -ForegroundColor Cyan; & $cmd; if($LASTEXITCODE-ne 0){throw "FAIL: $name"}}

docker inspect $container *> $null;if($LASTEXITCODE-ne 0){throw "Docker container yok: $container"}
docker exec $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $db WITH (FORCE);";if($LASTEXITCODE-ne 0){throw 'DB drop fail'}
docker exec $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $db;";if($LASTEXITCODE-ne 0){throw 'DB create fail'}

RunSql 'supabase/tests/operation_core_local_fixture.sql'
RunSql 'supabase/migrations/20261004000001_service_category_integrity.sql'
RunSql 'supabase/migrations/20261004000002_operation_core.sql'
RunSql 'supabase/migrations/20261004000003_dispatch_atomic_accept.sql'
RunSql 'supabase/migrations/20261004000004_operation_security_rls.sql'
RunSql 'supabase/migrations/20261004000005_accepted_price_snapshot.sql'
RunSql 'supabase/migrations/20261004000006_operational_event_history.sql'
RunSql 'supabase/migrations/20261004000007_operation_lifecycle_guard.sql'
RunSql 'supabase/migrations/20261004000008_operation_access_hardening.sql'
RunSql 'supabase/migrations/20261005000001_service_request_creation.sql'
RunSql 'supabase/verify_service_request_creation.sql'
RunSql 'supabase/tests/service_request_creation_integration.sql'
RunCmd 'npm test' { npm.cmd test }
RunCmd 'npm build --webpack' { npm.cmd run build -- --webpack }

$targets=@(
 'src/lib/operation-server.ts','src/components/service-result.tsx','src/app/dashboard/page.tsx','src/app/teshis/page.tsx',
 'src/app/api/operations/requests/route.ts','supabase/migrations/20261005000001_service_request_creation.sql',
 'supabase/verify_service_request_creation.sql','supabase/tests/service_request_creation_integration.sql','tests/stage2-service-request.test.mjs'
)
RunCmd 'Stage 2 scoped diff check' { git diff --check -- $targets }
Write-Host 'STAGE 2 REAL SERVICE REQUEST LOCAL GATE: PASS' -ForegroundColor Green
