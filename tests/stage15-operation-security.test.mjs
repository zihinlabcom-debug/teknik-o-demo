import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const chat=fs.readFileSync('src/app/api/chat/route.ts','utf8');
const diagnose=fs.readFileSync('src/app/api/diagnose/route.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20261004000004_operation_security_rls.sql','utf8');

for (const [name,source] of [['chat',chat],['diagnose',diagnose]]) {
  test(`${name} requires an active account before parsing or diagnosis`,()=>{
    const authIndex=source.indexOf('await currentAccount()');
    const jsonIndex=source.indexOf('await req.json()');
    const diagnoseIndex=source.indexOf('await diagnoseService(');
    assert.ok(authIndex>=0 && authIndex<jsonIndex && authIndex<diagnoseIndex);
    assert.match(source,/status:\s*401/);
    assert.doesNotMatch(source,/adminSupabase|SUPABASE_SERVICE_ROLE_KEY/);
  });
}

test('operation RLS uses job ownership and keeps client writes closed',()=>{
  assert.match(migration,/can_access_service_request/);
  assert.match(migration,/from public\.service_jobs j/);
  assert.match(migration,/revoke insert, update, delete/i);
  assert.match(migration,/revoke select on public\.operational_events from authenticated/i);
  assert.match(migration,/service_dispatch_candidates_read/);
});
