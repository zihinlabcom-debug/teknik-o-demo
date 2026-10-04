import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync(new URL('../supabase/migrations/20261004000001_service_category_integrity.sql',import.meta.url),'utf8');
const verify=readFileSync(new URL('../supabase/verify_core_schema.sql',import.meta.url),'utf8');
const boilerVerify=readFileSync(new URL('../supabase/tests/boiler_data_model_verification.sql',import.meta.url),'utf8');

test('category verification checks required seeds without fixing total active count',()=>{
  assert.match(verify,/required_seed_categories_active/);
  assert.match(verify,/left join public\.service_categories c on c\.code=required\.code/i);
  assert.doesNotMatch(verify,/count\(\*\)\s*=\s*4\s+from public\.service_categories/i);
  assert.doesNotMatch(boilerVerify,/count\(\*\)\s+from public\.service_categories\)\s*<>\s*4/i);
  assert.match(verify,/no_duplicate_category_code/);
});

test('request/category pairing has a validated composite FK and retains nullable references',()=>{
  assert.match(migration,/foreign key \(service_type_id, category_id\)\s+references public\.service_types\(id, category_id\)/i);
  assert.match(migration,/match simple on delete no action not valid/i);
  assert.match(migration,/validate constraint service_requests_service_type_category_fk/i);
  assert.doesNotMatch(migration,/alter column (category_id|service_type_id) set not null/i);
});

test('RLS and raw-data guards tolerate extra tables and manufacturer rows',()=>{
  assert.match(verify,/unnest\(array\[/i);
  assert.match(verify,/c\.oid is null or c\.relrowsecurity is distinct from true/i);
  assert.doesNotMatch(verify,/count\(\*\)\s*=\s*13\s+from pg_class/i);
  assert.match(verify,/count\(\*\)\s*>=\s*1422\s+from public\.official_error_codes_raw/i);
  assert.doesNotMatch(verify,/count\(\*\)\s*=\s*1422\s+from public\.official_error_codes_raw/i);
  assert.doesNotMatch(boilerVerify,/count\(\*\)\s+from public\.official_error_codes_raw\)\s*<>\s*1422/i);
});
