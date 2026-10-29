import './helpers/register-t88-read-optimizations.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReadFixture,withReadFixture} from './helpers/t88-read-db-double.mjs';
const {acceptTechnicianDispatch,completeTechnicianJob,technicianOffers,technicianActiveJobs}=await import('../apps/technician/src/lib/operation-server.ts');
const {authorizeAndReleaseFakePayment}=await import('../apps/customer/src/lib/finance/sandbox-finance-server.ts');
const tech='10000000-0000-4000-8000-000000000001',job='20000000-0000-4000-8000-000000000002';
const request='30000000-0000-4000-8000-000000000003',dispatch='40000000-0000-4000-8000-000000000004',intent='50000000-0000-4000-8000-000000000005';
const fixture=()=>makeReadFixture({account:{id:tech,role:'technician',is_test:true},tables:{
 service_jobs:[{id:job,technician_id:tech,service_request_id:request,status:'completed'}],
 service_dispatches:[{id:dispatch,service_request_id:request,status:'broadcasting',quote_id:'q'}],
 service_dispatch_candidates:[{dispatch_id:dispatch,technician_id:tech,status:'offered'}],
 service_requests:[{id:request}],service_quotes:[{id:'q',status:'accepted'}],
 service_request_technician_exclusions:[{service_request_id:request,technician_id:tech}],
}});
test('cancelled/excluded technician cannot replay original dispatch acceptance',async()=>{
 const f=fixture();f.tables.service_jobs[0].status='cancelled';let calls=0;
 f.db.rpc=async()=>{calls++;return {data:job,error:null};};
 await assert.rejects(()=>withReadFixture(f,()=>acceptTechnicianDispatch(dispatch)),e=>e.status===403||e.status===409);
 assert.equal(calls,0,'known exclusion must reject before the replaying RPC');
});
test('concurrent exclusion from SQL maps to controlled 403',async()=>{
 const f=fixture();f.tables.service_request_technician_exclusions=[];
 f.db.rpc=async()=>({data:null,error:{message:'Technician is excluded from this request'}});
 await assert.rejects(()=>withReadFixture(f,()=>acceptTechnicianDispatch(dispatch)),e=>e.status===403);
});
test('cancelled RPC replay is rejected even if precheck raced',async()=>{
 const f=fixture();f.tables.service_request_technician_exclusions=[];f.tables.service_jobs[0].status='cancelled';
 f.db.rpc=async()=>({data:job,error:null});
 await assert.rejects(()=>withReadFixture(f,()=>acceptTechnicianDispatch(dispatch)),e=>e.status===409);
});
test('active acceptance replay remains idempotent and owner-scoped',async()=>{
 const f=fixture();f.tables.service_request_technician_exclusions=[];f.tables.service_jobs[0].status='assigned';
 let calls=0;f.db.rpc=async()=>{calls++;return {data:job,error:null};};
 assert.deepEqual(await withReadFixture(f,()=>acceptTechnicianDispatch(dispatch)),{id:job});assert.equal(calls,1);
});
test('stale offered candidate cannot put excluded request back on new-jobs screen',async()=>{
 const f=fixture();assert.deepEqual(await withReadFixture(f,()=>technicianOffers()),[]);
});
test('unexcluded current offers remain visible',async()=>{
 const f=fixture();f.tables.service_request_technician_exclusions=[];
 assert.equal((await withReadFixture(f,()=>technicianOffers()))[0].id,dispatch);
});
for(const action of ['accept','offers'])test('exclusion read failure fails closed: '+action,async()=>{
 const f=fixture();f.errors.service_request_technician_exclusions={message:'connection failed'};
 f.db.rpc=()=>{throw Error('RPC must not execute');};
 await assert.rejects(()=>withReadFixture(f,()=>action==='accept'?acceptTechnicianDispatch(dispatch):technicianOffers()),e=>e.status===500);
});
test('cancelled and completed jobs stay out of active-jobs screen',async()=>{
 const f=fixture();f.tables.service_jobs.push({id:dispatch,technician_id:tech,service_request_id:request,status:'cancelled'});
 assert.deepEqual(await withReadFixture(f,()=>technicianActiveJobs()),[]);
});
test('completed report replay returns completed, never awaiting_customer',async()=>{
 const f=fixture(),calls=[];f.db.rpc=async(n)=>{calls.push(n);return {data:job,error:null};};
 assert.deepEqual(await withReadFixture(f,()=>completeTechnicianJob(job)),{id:job,completion:'completed'});
 assert.deepEqual(calls,['complete_service_job']);assert.equal(f.calls.length,1);
 assert.ok(f.calls[0].filters.some(([op,k,v])=>op==='eq'&&k==='technician_id'&&v===tech));
});
test('report replay cannot return another technicians job status',async()=>{
 const f=fixture();f.tables.service_jobs[0].technician_id=dispatch;f.db.rpc=async()=>({data:job,error:null});
 await assert.rejects(()=>withReadFixture(f,()=>completeTechnicianJob(job)),e=>e.status===404);
});
test('cancelled-after-report race does not return awaiting_customer',async()=>{
 const f=fixture();f.tables.service_jobs[0].status='cancelled';f.db.rpc=async()=>({data:job,error:null});
 await assert.rejects(()=>withReadFixture(f,()=>completeTechnicianJob(job)),e=>e.status===409);
});
test('unknown accept RPC failure is not disguised as an expected conflict',async()=>{
 const f=fixture();f.tables.service_request_technician_exclusions=[];
 f.db.rpc=async()=>({data:null,error:{message:'database unavailable'}});
 await assert.rejects(()=>withReadFixture(f,()=>acceptTechnicianDispatch(dispatch)),e=>e.status===500);
});
test('fake authorization payload mismatch is 409 and never releases distribution',async()=>{
 const env={APP_ENV:'staging',VERCEL_ENV:'preview',STAGE12_FAKE_FINANCE_ENABLED:'true',T100_SIMULATION_ONLY:'true',
 NEXT_PUBLIC_SUPABASE_URL:'https://ysbaycbflopdmzwfhhnc.supabase.co',STAGE12_IYZICO_SANDBOX_ENABLED:'false',T100_IYZICO_EXECUTION_ENABLED:'false'};
 const previous=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);
 try{const f=makeReadFixture({account:{id:tech,role:'customer',is_test:true},tables:{
 finance_payment_intents:[{id:intent,service_request_id:request,provider:'fake',environment:'sandbox',purpose:'initial'}],
 service_requests:[{id:request,customer_id:tech,finance_gate_required:true}]}}),calls=[];
 f.db.rpc=async name=>{calls.push(name);return {data:null,error:{message:'Authorization idempotency payload mismatch'}};};
 await assert.rejects(()=>withReadFixture(f,()=>authorizeAndReleaseFakePayment({intentId:intent,idempotencyKey:'same-key-123',approve:true})),e=>e.status===409&&e.code==='authorization_conflict');
 assert.deepEqual(calls,['finance_fake_authorize']);
 }finally{for(const[k,v]of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
