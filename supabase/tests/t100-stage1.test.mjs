import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {sql,container,database,assertTarget} from './t100-local-db.mjs';
const run=promisify(execFile),q=v=>"'"+v+"'";
import {fixture} from './t100-fixtures.mjs';
const report=f=>sql(`set role service_role;select public.complete_service_job('${f.job}','${f.t}')`);
const answer=(f,x)=>sql(`set role service_role;select public.t100_answer_completion('${f.job}','${f.c}','${x}',public.t100_completion_version('${f.job}'))`);
async function outcome(source){
 try{const {stdout}=await run('docker',['exec',container,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','t100','-d',database,'-c',source],{timeout:15000});return {ok:true,stdout};}
 catch(e){return {ok:false,error:e.stderr||e.message};}
}
test('stage1 real PostgreSQL notification does not complete or capture',()=>{
 const f=fixture();report(f);
 assert.equal(sql(`select status from public.service_jobs where id='${f.job}'`),'assigned');
 assert.equal(sql(`select captured_amount from public.finance_payment_intents where id='${f.intent}'`),'0.00');
 assert.equal(sql(`select deadline=reported_at+interval '1 hour' from public.t100_completion_reports where job_id='${f.job}'`),'t');
 const deadline=sql(`select deadline from public.t100_completion_reports where job_id='${f.job}'`);
 report(f);assert.equal(sql(`select deadline from public.t100_completion_reports where job_id='${f.job}'`),deadline);
 assert.throws(()=>sql(`update public.service_jobs set status='completed',completed_at=now() where id='${f.job}'`),/T100 customer completion decision/);
});
test('stage1 anon/authenticated cannot invoke or mutate journal; private legacy hidden',()=>{
 assert.equal(sql("select has_function_privilege('authenticated','public.complete_service_job(uuid,uuid)','execute')"),'f');
 assert.equal(sql("select has_function_privilege('service_role','t100_private.legacy_complete_service_job(uuid,uuid)','execute')"),'f');
 for(const role of ['anon','authenticated','service_role']){
  assert.equal(sql(`select has_table_privilege('${role}','public.t100_finalizations','INSERT')`),'f');
  assert.equal(sql(`select has_table_privilege('${role}','public.t100_completion_reports','UPDATE')`),'f');
 }
 assert.equal(sql("select bool_and(relrowsecurity) from pg_class where oid in ('public.t100_finalizations'::regclass,'public.t100_completion_reports'::regclass,'public.t100_distribution_simulations'::regclass)"),'t');
});
test('stage1 wrong customer/technician and null answers fail closed',()=>{
 const f=fixture();report(f);
 assert.throws(()=>sql(`set role service_role;select public.t100_answer_completion('${f.job}','${f.t}','yes',public.t100_completion_version('${f.job}'))`),/forbidden/);
 assert.throws(()=>sql(`set role service_role;select public.complete_service_job('${f.job}','${f.c}')`),/forbidden/);
 assert.throws(()=>sql(`set role service_role;select public.t100_answer_completion('${f.job}','${f.c}',null,public.t100_completion_version('${f.job}'))`),/invalid answer/);
});
test('stage1 no persists before complaint exists; expiry cannot finalize',()=>{
 const f=fixture();report(f);answer(f,'no');
 sql(`update public.t100_completion_reports set reported_at=now()-interval '2 hour',deadline=now()-interval '1 hour' where job_id='${f.job}';`);
 assert.throws(()=>answer(f,'yes'),/conflict/);
 sql('set role service_role;select public.t100_expire_completions(50)');
 assert.equal(sql(`select response||':'||coalesce(resolution,'pending_review') from public.t100_completion_reports where job_id='${f.job}'`),'no:pending_review');
 assert.throws(()=>sql(`set role service_role;select public.t100_admin_finance_decision('${f.job}','${f.admin}','distribute')`),/complaint review required/);
});
test('stage1 real simultaneous yes/no produces one decision',async()=>{
 const f=fixture();report(f);
 const results=await Promise.all(['yes','no'].map(a=>outcome(`set role service_role;select public.t100_answer_completion('${f.job}','${f.c}','${a}',public.t100_completion_version('${f.job}'))`)));
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(sql(`select count(*) from public.operational_events where job_id='${f.job}' and event_type in ('completion.customer_yes','completion.customer_no')`),'1');
});
test('stage1 simultaneous reports do not duplicate or extend deadline',async()=>{
 const f=fixture();
 const results=await Promise.all(Array.from({length:4},()=>outcome(`set role service_role;select public.complete_service_job('${f.job}','${f.t}')`)));
 assert.equal(results.filter(r=>r.ok).length,4,JSON.stringify(results));
 assert.equal(sql(`select count(*) from public.t100_completion_reports where job_id='${f.job}'`),'1');
});
