import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261008000451_start_initial_distribution_on_request_creation.sql');

test('priced request creation starts initial distribution after accepting the shown price',()=>{
  assert.match(migration,/perform public\.accept_service_quote\(v_quote\.id,p_customer_id\);[\s\S]*perform public\.start_service_distribution_cycle\(\s*v_request_id,\s*v_quote\.id,\s*null\s*\);/);
});

test('idempotent priced-request retry also ensures the initial distribution exists',()=>{
  assert.match(migration,/if found then[\s\S]*Existing accepted price mismatch[\s\S]*perform public\.start_service_distribution_cycle\(\s*v_request_id,\s*v_quote\.id,\s*null\s*\);[\s\S]*return jsonb_build_object/);
});

test('one initial distribution cycle is enforced per request independently of redistributions',()=>{
  assert.match(migration,/service_distribution_cycles_one_initial_request_idx/);
  assert.match(migration,/on public\.service_distribution_cycles\(service_request_id\)\s*where source_job_id is null/);
  assert.match(migration,/where service_request_id=p_service_request_id\s*and source_job_id is null/);
  assert.match(migration,/Initial distribution quote mismatch/);
});

test('timeout redistribution path remains keyed by source job',()=>{
  assert.match(migration,/where source_job_id=p_source_job_id/);
  assert.match(migration,/Redistribution source job must be cancelled and match the accepted quote/);
  assert.match(migration,/when p_source_job_id is null\s*then 'distribution\.started'\s*else 'distribution\.redistributed'/);
});

test('migration refuses ambiguous legacy state instead of silently choosing among duplicate initial cycles',()=>{
  assert.match(migration,/group by service_request_id\s*having count\(\*\)>1/);
  assert.match(migration,/Duplicate initial distribution cycles exist/);
});
