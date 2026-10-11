$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot

# Reuse the already verified Stage 10 + Auth/Profile disposable chain in a
# dedicated container. No linked or remote Supabase project is used.
$base=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'AUTH_PROFILE_VALIDATE.ps1') -Raw
$base=[regex]::Replace($base,'(?m)^Set-Location \$PSScriptRoot\r?\n','')
$base=$base.Replace('tekniko-auth-profile-pg','tekniko-stage12-finance-pg')
. ([scriptblock]::Create($base))

function RunStage12Sql([string]$file){
  Write-Host "=== $file ===" -ForegroundColor Cyan
  Get-Content -LiteralPath $file -Raw |
    docker exec -i tekniko-stage12-finance-pg psql -U postgres -d tekniko_stage10_test -v ON_ERROR_STOP=1
  if($LASTEXITCODE-ne 0){throw "SQL FAIL: $file"}
}

RunStage12Sql 'supabase/migrations/20261011215411_stage12_finance_core.sql'
RunStage12Sql 'supabase/migrations/20261011215509_stage12_finance_gate_lifecycle.sql'
RunStage12Sql 'supabase/tests/stage12_finance_integration.sql'
node 'supabase/tests/stage12_finance_concurrency.mjs' 'tekniko-stage12-finance-pg'
if($LASTEXITCODE-ne 0){throw 'Stage 12 finance concurrency test failed'}

Write-Host 'STAGE 12 FINANCE LOCAL DATABASE GATE: PASS' -ForegroundColor Green
