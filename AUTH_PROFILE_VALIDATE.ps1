$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$root=(Resolve-Path -LiteralPath '.').Path
$base=Get-Content -LiteralPath (Join-Path $root 'STAGE10_VALIDATE.ps1') -Raw
$base=$base.Replace('Set-Location $PSScriptRoot','')
$base=$base.Replace('$container=''tekniko-stage10-pg''','$container=''tekniko-auth-profile-pg''')
. ([scriptblock]::Create($base))
function RunAuthSql([string]$file){
  Write-Host "=== $file ===" -ForegroundColor Cyan
  Get-Content -LiteralPath $file -Raw | docker exec -i tekniko-auth-profile-pg psql -U postgres -d tekniko_stage10_test -v ON_ERROR_STOP=1
  if($LASTEXITCODE-ne 0){throw "SQL FAIL: $file"}
}
docker exec tekniko-auth-profile-pg psql -U postgres -d tekniko_stage10_test -v ON_ERROR_STOP=1 -c "alter table public.customer_addresses add column if not exists city text,add column if not exists district text;create unique index if not exists technician_service_areas_city_unique on public.technician_service_areas(technician_id,city_id) where district_id is null;create unique index if not exists technician_service_areas_district_unique on public.technician_service_areas(technician_id,city_id,district_id) where district_id is not null;"
RunAuthSql 'supabase/migrations/20261011000625_customer_technician_auth_profiles.sql'
RunAuthSql 'supabase/migrations/20261011084530_auth_profile_security_hardening.sql'
RunAuthSql 'supabase/tests/auth_profile_integration.sql'
Write-Host 'AUTH PROFILE LOCAL DATABASE GATE: PASS' -ForegroundColor Green
