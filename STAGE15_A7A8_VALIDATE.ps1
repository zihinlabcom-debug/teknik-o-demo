$ErrorActionPreference="Stop"
$container="tekniko-operation-pg"
$db="tekniko_operation_test"
function RunSql($f){ Write-Host "=== $f ===" -ForegroundColor Cyan; Get-Content $f -Raw | docker exec -i $container psql -U postgres -d $db -v ON_ERROR_STOP=1; if($LASTEXITCODE-ne 0){throw "SQL FAIL: $f"}}
function RunCmd($name,[scriptblock]$cmd){Write-Host "=== $name ===" -ForegroundColor Cyan; & $cmd; if($LASTEXITCODE-ne 0){throw "FAIL: $name"}}

docker inspect $container *> $null; if($LASTEXITCODE-ne 0){throw "Docker container yok: $container"}
docker exec $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $db WITH (FORCE);"; if($LASTEXITCODE-ne 0){throw "DB drop fail"}
docker exec $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $db;"; if($LASTEXITCODE-ne 0){throw "DB create fail"}

RunSql "supabase/tests/operation_core_local_fixture.sql"
RunSql "supabase/migrations/20261004000001_service_category_integrity.sql"
RunSql "supabase/migrations/20261004000002_operation_core.sql"
RunSql "supabase/migrations/20261004000003_dispatch_atomic_accept.sql"
RunSql "supabase/verify_operation_core.sql"
RunSql "supabase/migrations/20261004000004_operation_security_rls.sql"
RunSql "supabase/verify_operation_security.sql"
RunSql "supabase/migrations/20261004000005_accepted_price_snapshot.sql"
RunSql "supabase/migrations/20261004000006_operational_event_history.sql"
RunSql "supabase/verify_accepted_price_events.sql"
RunSql "supabase/migrations/20261004000007_operation_lifecycle_guard.sql"
RunSql "supabase/migrations/20261004000008_operation_access_hardening.sql"
RunSql "supabase/verify_operation_application.sql"
RunSql "supabase/tests/accepted_price_events_integration.sql"
RunSql "supabase/tests/operation_application_integration.sql"
RunCmd "accepted price concurrency" { node supabase/tests/accepted_price_concurrency.mjs $container }
RunCmd "dispatch concurrency" { node supabase/tests/dispatch_concurrency.mjs $container }
RunCmd "npm test" { npm.cmd test }
RunCmd "npm build" { npm.cmd run build }

$diffTargets=@(
  "src/app/admin/talepler/[id]/page.tsx",
  "src/app/admin/talepler/page.tsx",
  "src/app/api/operations/dispatches/[id]/accept/route.ts",
  "src/app/api/operations/jobs/[id]/complete/route.ts",
  "src/app/api/operations/jobs/[id]/start/route.ts",
  "src/app/api/operations/quotes/[id]/accept/route.ts",
  "src/app/musteri/taleplerim/[id]/page.tsx",
  "src/app/musteri/taleplerim/page.tsx",
  "src/app/usta/aktif-isler/page.tsx",
  "src/app/usta/is/[id]/page.tsx",
  "src/app/usta/yeni-isler/page.tsx",
  "src/components/operation-action-button.tsx",
  "src/lib/operation-server.ts",
  "supabase/migrations/20261004000007_operation_lifecycle_guard.sql",
  "supabase/migrations/20261004000008_operation_access_hardening.sql",
  "supabase/tests/accepted_price_events_integration.sql",
  "supabase/tests/operation_application_integration.sql",
  "supabase/verify_operation_application.sql",
  "tests/helpers/register-ui.mjs",
  "tests/helpers/register-operation-ui.mjs",
  "tests/helpers/operation-server-test-double.mjs",
  "tests/operation-panel.test.mjs",
  "tests/stage15-operation-application.test.mjs"
)
RunCmd "A7+A8 scoped git diff --check" { git diff --check -- $diffTargets }
Write-Host "STAGE 1.5 AŞAMA 7+8 LOCAL GATE: PASS" -ForegroundColor Green
