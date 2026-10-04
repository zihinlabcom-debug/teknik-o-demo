import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('lifecycle migration protects terminal jobs and server RPCs',()=>{
  const sql=read('supabase/migrations/20261004000007_operation_lifecycle_guard.sql');
  assert.match(sql,/Terminal job status is immutable/); assert.match(sql,/start_service_job/); assert.match(sql,/complete_service_job/); assert.match(sql,/Appointment job reference is immutable/);
});
test('access hardening narrows technician visibility and event ACL',()=>{
  const sql=read('supabase/migrations/20261004000008_operation_access_hardening.sql');
  assert.match(sql,/c\.status='offered'/); assert.match(sql,/d\.status in \('pending','broadcasting'\)/); assert.match(sql,/revoke all on public\.operational_events from service_role/); assert.match(sql,/grant select,insert on public\.operational_events to service_role/);
});
test('operation mutations stay in shared server layer and client has no service key',()=>{
  const server=read('src/lib/operation-server.ts'), button=read('src/components/operation-action-button.tsx');
  assert.match(server,/adminSupabase/); assert.match(server,/currentAccount/); assert.doesNotMatch(button,/SERVICE_ROLE|service_role|SUPABASE_SERVICE_ROLE_KEY/);
  for(const p of ['src/app/api/operations/quotes/[id]/accept/route.ts','src/app/api/operations/dispatches/[id]/accept/route.ts','src/app/api/operations/jobs/[id]/start/route.ts','src/app/api/operations/jobs/[id]/complete/route.ts'])assert.match(read(p),/operationErrorResponse/);
});
