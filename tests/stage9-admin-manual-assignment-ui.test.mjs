import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

const sql=read('supabase/migrations/20261008123000_stage9_admin_manual_assignment_candidates.sql');
const server=read('src/lib/admin-manual-assignment.ts');
const facade=read('apps/admin/src/lib/operation-server.ts');
const route=read('apps/admin/src/app/api/admin/requests/[id]/manual-assignment/route.ts');
const panel=read('apps/admin/src/components/manual-assignment-panel.tsx');
const page=read('apps/admin/src/app/admin/talepler/[id]/page.tsx');

test('candidate RPC is SECURITY DEFINER with restricted search path',()=>{
  assert.match(sql,/security definer\s+set search_path=''/i);
  assert.match(sql,/create or replace function public\.admin_manual_assignment_candidates/i);
});

test('candidate RPC only grants execution to service_role',()=>{
  assert.match(sql,/revoke all on function public\.admin_manual_assignment_candidates\(uuid,uuid\)\s+from public,anon,authenticated/i);
  assert.match(sql,/grant execute on function public\.admin_manual_assignment_candidates\(uuid,uuid\)\s+to service_role/i);
});

test('candidate RPC checks active admin identity',()=>{
  assert.match(sql,/where u\.id=p_admin_user_id/i);
  assert.match(sql,/v_admin_role<>'admin'/i);
  assert.match(sql,/v_admin_active is distinct from true/i);
});

test('candidate RPC requires completed three-round distribution',()=>{
  assert.match(sql,/c\.status='active'/i);
  assert.match(sql,/v_cycle\.status<>'exhausted'/i);
  assert.match(sql,/v_cycle\.current_round<>3/i);
});

test('candidate RPC rejects requests with active jobs',()=>{
  assert.match(sql,/j\.status in \('assigned','in_progress'\)/i);
  assert.match(sql,/Request already has an active job/i);
});

test('candidate RPC requires accepted quote',()=>{
  assert.match(sql,/q\.id=v_cycle\.quote_id/i);
  assert.match(sql,/q\.status='accepted'/i);
});

test('candidate eligibility requires active approved technician and category',()=>{
  assert.match(sql,/u\.role='technician'/i);
  assert.match(sql,/u\.is_active=true/i);
  assert.match(sql,/tp\.approval_status='approved'/i);
  assert.match(sql,/tsc\.approval_status='approved'/i);
  assert.match(sql,/tsc\.category_id=v_category_id/i);
});

test('candidate eligibility requires matching service area',()=>{
  assert.match(sql,/tsa\.city_id=v_city_id/i);
  assert.match(sql,/tsa\.district_id is null or tsa\.district_id=v_district_id/i);
});

test('candidate eligibility excludes permanently excluded technicians',()=>{
  assert.match(sql,/not exists\(\s*select 1\s+from public\.service_request_technician_exclusions e/i);
  assert.match(sql,/e\.service_request_id=p_service_request_id/i);
  assert.match(sql,/e\.technician_id=u\.id/i);
});

test('candidate availability and active job count are informational',()=>{
  assert.match(sql,/tp\.is_available/i);
  assert.match(sql,/as active_job_count/i);
  assert.doesNotMatch(sql,/and tp\.is_available\s*=\s*true/i);
  assert.doesNotMatch(sql,/and active_job_count\s*(?:<|<=|=)\s*\d+/i);
});

test('server operation checks admin session before using service role',()=>{
  assert.match(server,/requireRole\('admin'\)/);
  assert.match(server,/p_admin_user_id:account\.id/);
  assert.match(server,/adminSupabase\(\)\.rpc/);
  assert.match(server,/import 'server-only'/);
});

test('assignment uses existing Stage 9 RPC with mandatory reason',()=>{
  assert.match(server,/rpc\('admin_manual_assign_service_job'/);
  assert.match(server,/normalizedReason\.length<3\|\|normalizedReason\.length>500/);
  assert.match(server,/requireId\(idempotencyKey\)/);
  assert.match(server,/p_idempotency_key:idempotencyKey/);
  assert.doesNotMatch(server,/p_idempotency_key:randomUUID\(\)/);
  assert.match(facade,/adminManualAssignmentCandidates,adminManualAssignServiceJob/);
});

test('route accepts limited fields without trusting client admin identity',()=>{
  assert.match(route,/typeof body\.technicianId!=='string'/);
  assert.match(route,/typeof body\.reason!=='string'/);
  assert.match(route,/adminManualAssignServiceJob\(\s*id,\s*body\.technicianId,\s*body\.reason/);
  assert.doesNotMatch(route,/body\.adminUserId|body\.adminId|body\.assignment_source/);
  assert.match(route,/operationErrorResponse\(error\)/);
  assert.match(route,/Cache-Control':'no-store'/);
});

test('manual assignment panel shows unavailable technicians and active jobs',()=>{
  assert.match(panel,/candidate\.is_available\?'Müsait':'Müsait değil'/);
  assert.match(panel,/Aktif iş: \{candidate\.active_job_count\}/);
  assert.doesNotMatch(panel,/disabled=\{[^}]*candidate\.is_available/s);
  assert.match(panel,/router\.refresh\(\)/);
});

test('manual assignment idempotency flows through API and panel',()=>{
  assert.match(route,/typeof body\.idempotencyKey!=='string'/);
  assert.match(route,/body\.idempotencyKey/);
  assert.match(panel,/idempotencyKey:crypto\.randomUUID\(\)/);
  assert.match(panel,/const operation=attempt\?\?/);
  assert.match(panel,/setAttempt\(operation\)/);
  assert.match(panel,/body:JSON\.stringify\(operation\)/);
  assert.match(panel,/attempt\.technicianId!==candidate\.technician_id/);
});

test('admin request detail reads quote identity for latest cycle',()=>{
  const readSource=read('src/lib/admin-request-read.ts');
  assert.match(readSource,/service_distribution_cycles'\)\.select\('id,quote_id,/);
});
test('manual assignment panel opens only after eligible distribution',()=>{
  assert.match(page,/latestCycle\?\.status==='exhausted'/);
  assert.match(page,/latestCycle\.current_round===3/);
  assert.match(page,/!d\.cycles\.some\(c=>c\.status==='active'\)/);
  assert.match(page,/!d\.jobs\.some\(j=>j\.status==='assigned'\|\|j\.status==='in_progress'\)/);
  assert.match(page,/d\.quotes\.some\(q=>q\.id===latestCycle\.quote_id&&q\.status==='accepted'\)/);
  assert.match(page,/<ManualAssignmentPanel requestId=\{id\} candidates=\{candidates\}/);
});