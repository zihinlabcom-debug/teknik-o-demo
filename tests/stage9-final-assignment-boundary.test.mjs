import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261008150736_stage9_final_assignment_boundary.sql');
const admin=read('src/lib/admin-manual-assignment.ts');
const adminPage=read('apps/admin/src/app/admin/talepler/[id]/page.tsx');
const customer=read('apps/customer/src/lib/operation-server.ts');
const technician=read('apps/technician/src/app/usta/is/[id]/page.tsx');

function body(name){
  const match=sql.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$\\$;`,'i'));
  assert.ok(match,`${name} missing`);
  return match[0];
}

test('automatic failures count only cancelled automatic jobs with matching timeout exclusion and event',()=>{
  const source=body('automatic_appointment_timeout_count');
  assert.match(source,/count\(distinct j\.id\)/);
  assert.match(source,/e\.source_job_id=j\.id/);
  assert.match(source,/e\.reason='appointment_timeout'/);
  assert.match(source,/o\.event_type='job\.appointment_timeout'/);
  assert.match(source,/j\.assignment_source='automatic'/);
  assert.match(source,/j\.status='cancelled'/);
  assert.match(source,/language sql volatile security definer/);
});

test('initial retry reuses its first cycle; only one verified timeout opens cycle two',()=>{
  const source=body('start_service_distribution_cycle');
  assert.match(source,/source_job_id is null[\s\S]*return v_cycle_id/);
  assert.match(source,/v_failure_count<>1 or v_cycle_count<>1/);
  assert.match(source,/c\.source_job_id is null[\s\S]*c\.status='accepted'/);
  assert.match(source,/assignment_source='automatic'/);
});

test('first automatic timeout redistributes; second one hands off without cycle three',()=>{
  const source=body('timeout_service_job_for_missing_appointment');
  assert.match(source,/v_failure_count=1[\s\S]*start_service_distribution_cycle/);
  assert.match(source,/v_failure_count=2[\s\S]*distribution\.manual_assignment_required[\s\S]*return null/);
  assert.match(source,/service_request_technician_exclusions/);
});

test('exhausted three-round and second accepted timeout share one admin eligibility gate',()=>{
  const source=body('admin_manual_assignment_ready');
  assert.match(source,/v_cycle\.status='exhausted' and v_cycle\.current_round=3/);
  assert.match(source,/v_cycle\.status='accepted'[\s\S]*automatic_appointment_timeout_count\(p_request_id\)=2/);
  assert.match(body('admin_manual_assign_service_job'),/not public\.admin_manual_assignment_ready\(p_service_request_id\)/);
  assert.match(body('admin_manual_assignment_candidates'),/not public\.admin_manual_assignment_ready\(p_service_request_id\)/);
  assert.match(adminPage,/adminManualAssignmentReady\(id\)/);
  assert.match(admin,/requireRole\('admin'\)/);
});

test('manual assignment cannot be repeated and excluded or unauthorized technicians remain blocked',()=>{
  const ready=body('admin_manual_assignment_ready');
  const assign=body('admin_manual_assign_service_job');
  assert.match(ready,/j\.assignment_source='admin_manual'/);
  assert.match(assign,/service_request_technician_exclusions/);
  assert.match(assign,/v_role<>'technician'/);
  assert.match(assign,/v_profile_approval<>'approved'/);
  assert.match(assign,/approval_status='approved'/);
  assert.match(assign,/technician_service_areas/);
});

test('manual timeout cancels job and permanently closes request with a reasoned event',()=>{
  const source=body('timeout_service_job_for_missing_appointment');
  assert.match(source,/status='cancelled'/);
  assert.match(source,/v_job\.assignment_source='admin_manual'[\s\S]*status='technician_unavailable'/);
  assert.match(source,/request\.technician_unavailable/);
  assert.match(source,/manual_appointment_timeout/);
});

test('terminal request is guarded at request, job and distribution DB write boundaries',()=>{
  assert.match(sql,/Terminal service request cannot be reopened/);
  assert.match(sql,/before update of status on public\.service_requests/);
  assert.match(sql,/before insert or update of status,service_request_id on public\.service_jobs/);
  assert.match(sql,/before insert or update of status,service_request_id on public\.service_distribution_cycles/);
  assert.match(sql,/Job assignment source is immutable/);
  assert.match(sql,/Assignment service request is immutable/);
  assert.match(sql,/count\(\*\) from public\.service_distribution_cycles c[\s\S]*>=2[\s\S]*Automatic distribution is limited to two cycles/);
  assert.match(body('start_service_distribution_cycle'),/Terminal service request cannot be redistributed/);
  assert.match(body('admin_manual_assign_service_job'),/Terminal service request cannot be assigned/);
});

test('manual timeout without a cycle still increments cron processing exactly once',()=>{
  const source=body('process_service_job_appointment_timeouts');
  assert.match(source,/status='assigned'/);
  assert.match(source,/for update skip locked/);
  assert.match(source,/where id=v_job_id and status='cancelled'[\s\S]*v_processed:=v_processed\+1/);
});

test('appointment and direct completion protection remains in prior migration',()=>{
  const prior=read('supabase/migrations/20261007213150_assignment_timeout_redistribution.sql');
  assert.match(prior,/create or replace function public\.create_service_appointment|Active appointment required before starting job/i);
  assert.match(prior,/selected_job\.status='assigned'[\s\S]*assigned_at\+interval '1 hour'/);
  assert.match(body('timeout_service_job_for_missing_appointment'),/status in \('scheduled','confirmed'\)/);
});

test('customer sees terminal status and server-only RPC privileges remain restricted',()=>{
  assert.match(customer,/requestStatus==='technician_unavailable'[\s\S]*Usta bulunamadı/);
  assert.match(technician,/request\?\.status==='technician_unavailable'\?'Usta bulunamadı'/);
  for(const name of ['admin_manual_assignment_ready','start_service_distribution_cycle','timeout_service_job_for_missing_appointment','admin_manual_assign_service_job']){
    assert.match(sql,new RegExp(`revoke all on function public\\.${name}\\([\\s\\S]*?from public,anon,authenticated`,'i'));
    assert.match(sql,new RegExp(`grant execute on function public\\.${name}\\([\\s\\S]*?to service_role`,'i'));
  }
  assert.doesNotMatch(sql,/cron\.schedule|create extension.*pg_cron/i);
});


test('customer shows admin review for exhausted distribution and second automatic timeout',()=>{
  const page=read('apps/customer/src/app/musteri/taleplerim/[id]/page.tsx');
  assert.match(customer,/cycle\?\.status==='exhausted'\|\|\(cycle\?\.status==='accepted'&&manualReviewRequired\)/);
  assert.match(customer,/event_type','distribution\.manual_assignment_required'/);
  assert.match(customer,/code:'admin_review' as const,label:'Talebiniz inceleniyor'/);
  assert.match(page,/operation_status\.code==='admin_review'/);
});
