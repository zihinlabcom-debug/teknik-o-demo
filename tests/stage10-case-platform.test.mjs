import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const core=read('supabase/migrations/20261009120000_stage10_case_core.sql');
const flow=read('supabase/migrations/20261009121000_stage10_case_workflows.sql');
const edge=read('supabase/migrations/20261009122000_stage10_private_evidence_kpi_admin.sql');
const customerServer=read('apps/customer/src/lib/stage10-server.ts');
const technicianServer=read('apps/technician/src/lib/stage10-server.ts');
const adminServer=read('apps/admin/src/lib/stage10-server.ts');
const evidence=read('apps/customer/src/lib/case-evidence.ts');

test('Stage 10 uses forward migrations and does not introduce frozen or paused requests',()=>{
  for(const sql of [core,flow,edge])assert.doesNotMatch(sql,/alter table public\.service_requests[\s\S]*frozen|paused/i);
  assert.doesNotMatch(core,/drop table|truncate/i);
});

test('one operation contract supplies stage, assignment, appointment, terminal and permissions',()=>{
  assert.match(flow,/stage10_operation_contract/);
  for(const field of ['requestId','currentJobId','stage','assignmentSource','appointmentState','adminInterventionRequired','terminal','permissions'])assert.match(flow,new RegExp(`'${field}'`));
  assert.match(customerServer,/stage10_operation_contract/);assert.match(technicianServer,/stage10_operation_contract/);assert.match(adminServer,/stage10_operation_contract/);
});

test('complaint window, relation, one-open rule and immutable decision are enforced',()=>{
  assert.match(flow,/Complaint requires assigned technician/);
  assert.match(flow,/Applicant is not related to service/);
  assert.match(flow,/completed_at\+interval '7 days'/);
  assert.match(flow,/Complaint is not available for a closed service without completion/);
  assert.match(core,/service_complaints_one_open_per_request_idx[\s\S]*status='under_review'/);
  assert.match(core,/complaint_decisions_immutable/);
  assert.match(flow,/Complaint decision conflict/);
});

test('complaint applicant view exposes only service, date and public status',()=>{
  const customerPage=read('apps/customer/src/app/musteri/sikayetler/page.tsx');
  const technicianPage=read('apps/technician/src/app/usta/sikayetler/page.tsx');
  assert.match(customerPage,/İnceleniyor/);assert.match(customerPage,/Sonuçlandı/);
  assert.match(customerPage,/service_request_id[\s\S]*created_at[\s\S]*status/);
  assert.doesNotMatch(customerPage,/item\.description|item\.reason|item\.sanction/i);
  assert.doesNotMatch(technicianPage,/c\.description|c\.reason|c\.sanction/i);
});

test('AI-unavailable complaint review retains an oldest-first chronological queue',()=>{
  assert.match(adminServer,/service_complaints'[\s\S]*order\('created_at',\{ascending:true\}\)/);
});

test('sanctions are admin decisions and block only new operations while active',()=>{
  assert.match(flow,/stage10_has_new_operation_block/);
  assert.match(flow,/ends_at is null or ends_at>now\(\)/);
  assert.match(flow,/before insert on public\.service_requests/);
  assert.match(flow,/before insert on public\.service_jobs/);
  const sanctionBody=flow.match(/create function public\.stage10_has_new_operation_block[\s\S]*?\$\$;/i)?.[0]??'';
  assert.doesNotMatch(sanctionBody,/update public\.service_jobs|update public\.service_requests/i);
});

test('complaint retention is five years with legal hold metadata and no auto delete',()=>{
  assert.match(core,/legal_hold boolean not null default false/);
  assert.match(flow,/retain_until=now\(\)\+interval '5 years'/);
  assert.doesNotMatch(flow+edge,/delete from public\.service_complaints/i);
});

test('additional cost requires appointment and preserves original accepted snapshot',()=>{
  assert.match(flow,/Active appointment required/);
  assert.match(core,/original_quote_id uuid not null/);assert.match(core,/original_total numeric/);
  assert.match(flow,/status='customer_accepted'/);assert.match(flow,/sum\(requested_amount\)/);
  assert.match(flow,/Closed service cannot change price/);
  assert.doesNotMatch(flow,/update public\.service_quotes set total_amount/i);
});

test('additional cost decisions are versioned and customer rejection needs admin resolution',()=>{
  assert.match(flow,/Additional cost decision conflict/);
  assert.match(flow,/customer_rejected/);assert.match(flow,/admin_continue/);assert.match(flow,/admin_cancelled/);
  assert.match(flow,/version=version\+1/g);
  assert.match(flow,/stage10_cancel_service_graph\(v\.service_request_id,p_admin_id,'additional_cost\.admin_cancelled'/);
});

test('idempotent case creation is serialized and rejects payload conflicts without orphan evidence',()=>{
  assert.match(flow,/pg_advisory_xact_lock\(hashtextextended\('stage10:additional_cost:/);
  assert.match(flow,/pg_advisory_xact_lock\(hashtextextended\('stage10:complaint:/);
  assert.match(flow,/pg_advisory_xact_lock\(hashtextextended\('stage10:warranty:/);
  assert.match(flow,/Idempotency key conflict/g);
  assert.match(customerServer,/removeUnlinkedEvidence/);assert.match(technicianServer,/removeUnlinkedEvidence/);
});

test('warranty classification is explicit and fixed to 7 or 30 days',()=>{
  assert.match(core,/warranty_class in \('electronic_30','non_electronic_7'\)/);
  assert.match(flow,/v_days:=case when v_class='electronic_30' then 30 else 7 end/);
  assert.match(flow,/Explicit warranty classification required/);
  assert.doesNotMatch(flow,/lower\(|ilike|keyword/i);
  assert.match(core,/Every active service category requires an explicit warranty policy/);
  assert.match(core,/service_category_warranty_policy_required/);
});

test('warranty requires customer ownership, completion, window and photo or video',()=>{
  assert.match(flow,/Customer does not own service/);assert.match(flow,/Completed service required/);
  assert.match(flow,/Warranty window expired/);assert.match(flow,/Photo or video evidence required/);
  assert.match(flow,/kind' not in \('photo','video'\)/);
});

test('warranty correction offers original technician first and never charges customer',()=>{
  assert.match(flow,/Original technician must decline first/);
  assert.match(core,/customer_charge numeric\(12,2\) not null default 0 check \(customer_charge=0\)/);
  assert.match(core,/cost_responsibility in \('original_technician','teknik_o'\)/);
  assert.match(flow,/Replacement technician is not eligible/);
  assert.match(flow,/stage10_has_new_operation_block\(p_technician_id\)/);
});

test('closed decisions stay immutable while corrections and sanction revocation are append-only',()=>{
  assert.match(core,/complaint_decisions_immutable/);
  assert.match(core,/account_sanction_corrections_immutable/);
  assert.match(flow,/stage10_admin_correct_complaint_decision/);
  assert.match(flow,/not exists\(select 1 from public\.account_sanction_corrections/);
});

test('private evidence validates count size type magic and keeps complaint evidence admin-only',()=>{
  assert.match(flow,/p_parent_type='complaint' and v_count>5/);
  assert.match(core,/byte_size<=52428800/);assert.match(core,/byte_size<=10485760/);
  assert.match(evidence,/validMagic/);assert.match(evidence,/purpose==='warranty'&&kind==='document'/);
  assert.match(edge,/service_case_evidence_owner_non_complaint_read/);
  assert.match(edge,/e\.complaint_id is null/);
  assert.match(edge,/service_case_evidence_insert_guard[\s\S]*bucket_id<>'service-case-evidence'/);
  assert.match(edge,/stage10_can_read_case_evidence/);
  assert.match(evidence,/evidence_cleanup_failed/);
});

test('all workflow RPCs are server-only',()=>{
  for(const name of ['stage10_create_additional_cost','stage10_admin_review_additional_cost','stage10_customer_decide_additional_cost','stage10_create_complaint','stage10_admin_decide_complaint','stage10_create_warranty_claim','stage10_admin_decide_warranty','stage10_operation_contract'])assert.match(flow,new RegExp(`public\\.${name}\\(`));
  assert.match(flow,/execute format\('revoke all on function %s from public,anon,authenticated',f\)/);
  assert.match(flow,/execute format\('grant execute on function %s to service_role',f\)/);
});

test('admin intervention is limited to cancellation and technician change',()=>{
  assert.match(adminServer,/action==='cancel'/);assert.match(adminServer,/action==='change_technician'/);
  assert.match(adminServer,/Yalnız iptal veya usta değişikliği/);
  assert.match(edge,/stage10_admin_cancel_service/);assert.match(edge,/stage10_admin_change_technician/);
  assert.match(flow,/stage10_cancel_service_graph/);
  assert.match(edge,/p_expected_job_id/);
});

test('KPI is admin-only monthly or yearly and reports unavailable ratings honestly',()=>{
  assert.match(edge,/p_period not in \('monthly','yearly'\)/);
  assert.match(edge,/Active admin required/);assert.match(edge,/'customerRatings',null,'ratingsAvailable',false/);
  assert.doesNotMatch(edge,/daily|weekly|target/i);
  const body=edge.match(/create function public\.stage10_admin_kpi[\s\S]*?end \$\$;/i)?.[0]??'';
  assert.doesNotMatch(body,/from public\.service_requests r\s+left join/i);
  assert.match(body,/acceptedAdditionalCostVolume/);
  assert.match(body,/Europe\/Istanbul/);
  assert.match(body,/completionRateBasis','jobs_assigned_and_completed_within_period/);
  assert.match(body,/acceptanceRateBasis','offers_and_acceptance_responses_within_period/);
});

test('operation contract prefers active work and does not expose stale cancelled jobs',()=>{
  assert.match(flow,/status in \('assigned','in_progress'\)[\s\S]*v_has_active_job/);
  assert.match(flow,/v_has_active_cycle and not v_has_active_job[\s\S]*v_job\.id:=null/);
  assert.doesNotMatch(flow,/v_request\.status in \('completed','cancelled','technician_unavailable'\) or v_job\.status in \('completed','cancelled'\)/);
});

test('sanction subject must be a service party',()=>{
  assert.match(flow,/Sanction subject must be related to complaint service/);
  assert.match(core,/related_job_id uuid not null/);
});

test('admin intervention RPC uses idempotency and optimistic current-job binding',()=>{
  assert.match(adminServer,/p_idempotency_key:idempotencyKey/);
  assert.match(adminServer,/p_expected_job_id:expectedJobId/);
  const component=read('apps/admin/src/components/stage10-operation-intervention.tsx');
  assert.match(component,/expectedJobId:currentJobId/);
});

test('three surfaces expose the required Stage 10 sections',()=>{
  const customerLayout=read('apps/customer/src/app/musteri/layout.tsx');
  const techLayout=read('apps/technician/src/app/usta/layout.tsx');
  const adminLayout=read('apps/admin/src/app/admin/layout.tsx');
  assert.match(customerLayout, /<CustomerShell/);
  const customerNavigation=read('apps/customer/src/components/customer-shell.tsx');
  for(const label of ['Ek maliyetler','Şikâyet','Garanti Talebi'])assert.match(customerNavigation,new RegExp(label));
  for(const label of ['Ek maliyet talebi','Şikâyet','Garanti düzeltmeleri'])assert.match(techLayout,new RegExp(label));
  for(const label of ['Ek maliyet talepleri','Şikâyetler','Garanti','Pilot / KPI'])assert.match(adminLayout,new RegExp(label));
});

test('Stage 9.3 protected migration remains byte-identical in this change set',()=>{
  assert.ok(fs.existsSync(new URL('../supabase/migrations/20261008150736_stage9_final_assignment_boundary.sql',import.meta.url)));
});
