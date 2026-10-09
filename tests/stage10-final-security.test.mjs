import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseStage10Json,parseStage10Multipart} from '../apps/customer/src/lib/stage10-http.ts';
import {complaintPageRange,finalizeComplaintPage,normalizeComplaintPage} from '../apps/admin/src/lib/stage10-pagination.ts';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const customerServer=read('apps/customer/src/lib/stage10-server.ts');
const technicianServer=read('apps/technician/src/lib/stage10-server.ts');
const adminServer=read('apps/admin/src/lib/stage10-server.ts');
const flow=read('supabase/migrations/20261009121000_stage10_case_workflows.sql');
const edge=read('supabase/migrations/20261009122000_stage10_private_evidence_kpi_admin.sql');

async function rejectsWithCode(promise,code,status){
  await assert.rejects(promise,error=>error?.code===code&&error?.status===status);
}

test('bounded JSON parsing rejects malformed, declared-large, fake-small and missing-length oversized bodies',async()=>{
  await rejectsWithCode(parseStage10Json(new Request('http://local',{method:'POST',headers:{'content-type':'application/json'},body:'{'})), 'invalid_body',400);
  await rejectsWithCode(parseStage10Json(new Request('http://local',{method:'POST',headers:{'content-type':'application/json','content-length':'999'},body:'{}'}),32), 'request_too_large',413);
  await rejectsWithCode(parseStage10Json(new Request('http://local',{method:'POST',headers:{'content-type':'application/json','content-length':'1'},body:JSON.stringify({text:'x'.repeat(100)})}),32), 'request_too_large',413);
  await rejectsWithCode(parseStage10Json(new Request('http://local',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'x'.repeat(100)})}),32), 'request_too_large',413);
  const value=await parseStage10Json(new Request('http://local',{method:'POST',headers:{'content-type':'application/json'},body:'{"ok":true}'}),32);
  assert.deepEqual(value,{ok:true});
});

test('multipart parsing is bounded by actual bytes even with no or forged Content-Length',async()=>{
  const contentType='multipart/form-data; boundary=s10';
  const body=`--s10\r\nContent-Disposition: form-data; name="requestId"\r\n\r\n${'x'.repeat(200)}\r\n--s10--\r\n`;
  await rejectsWithCode(parseStage10Multipart(new Request('http://local',{method:'POST',headers:{'content-type':contentType},body}),100),'request_too_large',413);
  await rejectsWithCode(parseStage10Multipart(new Request('http://local',{method:'POST',headers:{'content-type':contentType,'content-length':'1'},body}),100),'request_too_large',413);
  await rejectsWithCode(parseStage10Multipart(new Request('http://local',{method:'POST',headers:{'content-type':contentType,'content-length':'1000'},body:'--s10--\r\n'}),100),'request_too_large',413);
});

test('multipart parsing accepts a bounded form and preserves every field',async()=>{
  const form=new FormData();
  form.set('requestId','00000000-0000-4000-8000-000000000001');
  for(let i=0;i<5;i++)form.append('evidence',new File([new Uint8Array([0xff,0xd8,0xff])],`a${i}.jpg`,{type:'image/jpeg'}));
  const parsed=await parseStage10Multipart(new Request('http://local',{method:'POST',body:form}),4096);
  assert.equal(parsed.get('requestId'),'00000000-0000-4000-8000-000000000001');
  assert.equal(parsed.getAll('evidence').length,5);
});

test('complaint pagination covers 0, 200, 201 and more than 1000 rows with stable page ranges',()=>{
  assert.deepEqual(finalizeComplaintPage([]),{items:[],hasNext:false});
  assert.deepEqual(finalizeComplaintPage(Array.from({length:200},(_,i)=>i)),{items:Array.from({length:200},(_,i)=>i),hasNext:false});
  const page201=finalizeComplaintPage(Array.from({length:201},(_,i)=>i));
  assert.equal(page201.items.length,200);assert.equal(page201.hasNext,true);
  assert.deepEqual(complaintPageRange(1),{from:0,to:200});
  assert.deepEqual(complaintPageRange(6),{from:1000,to:1200});
  assert.equal(normalizeComplaintPage('6'),6);assert.equal(normalizeComplaintPage('-1'),1);
});

test('upload authorization runs before Storage while the final transactional RPC remains authoritative',()=>{
  for(const source of [customerServer,technicianServer]){
    assert.match(source,/await preflight\([\s\S]*?await uploadCaseEvidence/);
  }
  assert.match(flow,/create function public\.stage10_preflight_case_action/);
  assert.match(flow,/stage10_create_additional_cost[\s\S]*?for update/);
  assert.match(flow,/stage10_create_complaint[\s\S]*?for update/);
  assert.match(flow,/stage10_create_warranty_claim[\s\S]*?for update/);
  assert.match(flow,/revoke all on function %s from public,anon,authenticated/);
});

test('evidence downloads validate identity, database relation and object path before streaming private content',()=>{
  for(const app of ['customer','technician','admin']){
    const source=read(`apps/${app}/src/lib/case-evidence.ts`);
    assert.match(source,/requireId\(evidenceId\)/);
    assert.match(source,/service_case_evidence/);
    assert.match(source,/storage_path\.startsWith\(`stage10\/\$\{evidence\.uploader_user_id\}\/\$\{purpose\}\//);
    assert.match(source,/file\.blob\.stream\(\)/);
    assert.doesNotMatch(source,/caseEvidenceResponse[\s\S]*arrayBuffer\(/);
    for(const header of ['Content-Disposition','Cache-Control','X-Content-Type-Options','Content-Security-Policy'])assert.match(source,new RegExp(header));
  }
  const customerRoute=read('apps/customer/src/app/api/stage10/evidence/[id]/route.ts');
  const technicianRoute=read('apps/technician/src/app/api/stage10/evidence/[id]/route.ts');
  const adminRoute=read('apps/admin/src/app/api/admin/stage10/evidence/[id]/route.ts');
  assert.match(customerRoute,/\['customer'\]/);assert.match(technicianRoute,/\['technician'\]/);assert.match(adminRoute,/\['admin'\]/);
});

test('cleanup is retried, surfaced on failure and idempotent retries remove only unlinked uploads',()=>{
  for(const app of ['customer','technician']){
    const evidence=read(`apps/${app}/src/lib/case-evidence.ts`);
    const server=read(`apps/${app}/src/lib/stage10-server.ts`);
    assert.match(evidence,/for\(let attempt=0;attempt<2;attempt\+\+\)/);
    assert.match(evidence,/evidence_cleanup_failed/);
    assert.match(evidence,/removeUnlinkedEvidence/);
    assert.match(server,/if\(error\)\{await removeUploadedEvidence\(uploaded\);failStage10Db/);
    assert.match(server,/await removeUnlinkedEvidence/);
  }
});

test('all overview query failures are checked instead of becoming deceptive empty lists',()=>{
  assert.match(customerServer,/complaintResult\.error[\s\S]*warrantyResult\.error[\s\S]*costResult\.error[\s\S]*categoryResult\.error/);
  assert.match(technicianServer,/jobResult\.error[\s\S]*costResult\.error[\s\S]*complaintResult\.error[\s\S]*correctionResult\.error/);
  assert.match(adminServer,/costResult,'Ek maliyet kayıtları'[\s\S]*openResult,'Açık şikâyet kayıtları'[\s\S]*resolvedResult,'Sonuçlanan şikâyet kayıtları'/);
  assert.match(adminServer,/complaintEvidence,warrantyEvidence,costEvidence/);
});

test('admin routes reject unknown actions and invalid dates without falling through',()=>{
  const complaintRoute=read('apps/admin/src/app/api/admin/stage10/complaints/[id]/route.ts');
  const warrantyRoute=read('apps/admin/src/app/api/admin/stage10/warranty/[id]/route.ts');
  assert.match(complaintRoute,/request_info[\s\S]*correct[\s\S]*decide[\s\S]*invalid_action/);
  assert.match(warrantyRoute,/assign[\s\S]*decide[\s\S]*invalid_action/);
  assert.match(adminServer,/Number\.isNaN\(parsed\.getTime\(\)\)/);
  assert.match(adminServer,/invalid_date/);
});

test('Stage 10 server chain derives every actor from a verified active role and keeps service role server-only',()=>{
  for(const app of ['customer','technician']){
    const account=read(`apps/${app}/src/lib/account-supabase.ts`);
    const guard=read(`apps/${app}/src/lib/operation-guard.ts`);
    assert.match(account,/db\.auth\.getUser\(\)/);assert.match(account,/data\.is_active!==true/);
    assert.match(account,/SUPABASE_SERVICE_ROLE_KEY/);assert.match(guard,/currentAccount\(\)/);assert.match(guard,/account\.role!==role/);
  }
  const adminAccount=read('src/lib/account-supabase.ts');
  assert.match(adminAccount,/validAdminSession/);assert.match(adminAccount,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(read('apps/admin/src/components/stage10-admin-actions.tsx'),/SUPABASE_SERVICE_ROLE_KEY/);
});

test('warranty policy fails closed for unknown active categories and KPI meanings are explicit',()=>{
  const core=read('supabase/migrations/20261009120000_stage10_case_core.sql');
  const kpiPage=read('apps/admin/src/app/admin/pilot-kpi/page.tsx');
  assert.match(core,/Every active service category requires an explicit warranty policy/);
  assert.match(core,/service_category_warranty_policy_required/);
  assert.doesNotMatch(core,/lower\(|ilike|keyword/i);
  assert.match(edge,/completionRateBasis','jobs_assigned_and_completed_within_period/);
  assert.match(edge,/acceptanceRateBasis','offers_and_acceptance_responses_within_period/);
  assert.match(kpiPage,/şirket geliri veya net kâr değildir/);
});
