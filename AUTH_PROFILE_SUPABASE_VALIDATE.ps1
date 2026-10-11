$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot
$localWorkdir='test-results/auth-profile-security-final-stack'

function RunLocalSql([string]$file){
  Write-Host "=== $file ===" -ForegroundColor Cyan
  Get-Content -LiteralPath $file -Raw |
    docker exec -i $container psql -U postgres -d postgres -v ON_ERROR_STOP=1
  if($LASTEXITCODE-ne 0){throw "SQL FAIL: $file"}
}

$containers=@(docker ps --filter 'name=supabase_db_auth-profile-final-20261011' --format '{{.Names}}')
if($containers.Count-ne 1){throw 'Disposable feature Supabase database is not uniquely running'}
$container=$containers[0]

$status=npx --yes supabase@2.119.0 status -o env --workdir $localWorkdir
function LocalValue([string]$name){
  $line=$status | Where-Object {$_ -match "^$name="} | Select-Object -First 1
  if(!$line){throw "Missing local Supabase status value: $name"}
  return ($line.Substring($name.Length+1)).Trim('"')
}
$apiLine=$status | Where-Object {$_ -match '^API_URL='} | Select-Object -First 1
$apiUrl=if($apiLine){($apiLine.Substring(8)).Trim('"')}else{
  ([uri](LocalValue 'STORAGE_S3_URL')).GetLeftPart([System.UriPartial]::Authority)
}
if(([uri]$apiUrl).Host -notin @('127.0.0.1','localhost')){
  throw 'Refusing non-loopback Supabase validation'
}

$ready=docker exec $container psql -U postgres -d postgres -tAc "select to_regprocedure('public.sync_verified_account_phone(uuid,text)') is not null"
if($ready.Trim()-ne 't'){
  RunLocalSql 'supabase/tests/auth_profile_supabase_bootstrap.sql'
  RunLocalSql 'supabase/migrations/20261011000625_customer_technician_auth_profiles.sql'
}
RunLocalSql 'supabase/migrations/20261011084530_auth_profile_security_hardening.sql'

$env:NEXT_PUBLIC_SUPABASE_URL=$apiUrl
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=LocalValue 'ANON_KEY'
$env:SUPABASE_SERVICE_ROLE_KEY=LocalValue 'SERVICE_ROLE_KEY'
node scripts/verify-auth-profile-security-local.mjs
if($LASTEXITCODE-ne 0){throw 'Auth/Storage/RLS integration failed'}

Write-Host 'AUTH PROFILE DISPOSABLE SUPABASE GATE: PASS' -ForegroundColor Green
