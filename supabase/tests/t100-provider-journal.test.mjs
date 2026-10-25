import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {sql} from './t100-local-db.mjs';import {fixture} from './t100-fixtures.mjs';
function reserveFee(){
 const f=fixture(3000,'painting','iyzico');
 sql(`insert into public.service_appointments(job_id,starts_at,status) values('${f.job}',now()+interval '1 hour','confirmed')`);
 const p=JSON.parse(sql(`select public.t100_cancellation_policy('${f.request}','${f.c}')`));
 const c=JSON.parse(sql(`select public.t100_customer_cancel('${f.request}','${f.c}','${p.version}','İptal gerekçesi')`));
 const claim=JSON.parse(sql(`select public.t100_claim_finalization('${c.finalization_id}')`));
 return {...f,finalization:c.finalization_id,reservation:claim.reservation};
}
function claim(f,amount=100){
 if(!f.operationId){f.operationId='t100-capture-'+randomUUID();sql(`select t100_bind_finance_operation('${f.finalization}','${f.reservation}','${f.operationId}')`);}
 const op=f.operationId;
 const result=JSON.parse(sql(`set role service_role;select public.finance_iyzico_claim_operation('${f.intent}','${f.request}','${f.c}','${f.job}','capture','${op}','${op}','${op}',repeat('c',64),${amount},'TRY','${f.request}','t100-local-payment-${f.request}',null,null)`));
 return {op,result};
}
test('stage6 provider journal permits exact 100 fee, blocks arbitrary amounts/purpose',()=>{
 const f=reserveFee();assert.throws(()=>claim(f,90),/amount mismatch/);
 assert.throws(()=>claim(f,3000),/Completed service job|outside reserved purpose/);
 const {result}=claim(f);assert.equal(result.kind,'claimed');assert.equal(result.record.money.amount,'100.00');
 assert.equal(JSON.parse(sql(`select public.t100_claim_finalization('${f.finalization}')`)).claimed,false);
});
test('stage6 verified local provider evidence captures fee but never claims remaining 2900 released',()=>{
 const f=reserveFee();const {op}=claim(f);
 // Provider evidence is a LOCAL test double; no actual Sandbox request or signature is generated.
 sql(`update public.finance_iyzico_operations set state='succeeded',signature_verified=true,provider_phase='POST_AUTH',claim_token=null where operation_id='${op}';select public.finance_apply_iyzico_operation('${f.intent}','${op}')`);
 const status=sql(`select public.t100_record_finance_result('${f.finalization}','${f.reservation}','${op}','succeeded')`);
 assert.equal(status,'blocked');assert.equal(sql(`select captured_amount from public.finance_payment_intents where id='${f.intent}'`),'100.00');
 assert.equal(sql(`select status from public.service_requests where id='${f.request}'`),'created');
 assert.equal(sql(`select count(*) from public.t100_distribution_simulations where service_request_id='${f.request}'`),'0');
 assert.equal(JSON.parse(sql(`select public.t100_claim_finalization('${f.finalization}')`)).claimed,false);
 assert.throws(()=>claim(f),/outside reserved purpose|lifecycle reservation/);
});
test('stage6 unknown provider result cannot be automatically claimed again',()=>{
 const f=reserveFee();const {op}=claim(f);
 sql(`update public.finance_iyzico_operations set state='unknown',claim_token=null,error_code='local_timeout' where operation_id='${op}'`);
 assert.equal(sql(`select public.t100_record_finance_result('${f.finalization}','${f.reservation}','${op}','unknown')`),'unknown');
 assert.equal(JSON.parse(sql(`select public.t100_claim_finalization('${f.finalization}')`)).claimed,false);
 assert.equal(sql(`select captured_amount from public.finance_payment_intents where id='${f.intent}'`),'0.00');
});
test('stage6 forged success without provider/core evidence cannot finalize',()=>{
 const f=reserveFee();sql(`select t100_bind_finance_operation('${f.finalization}','${f.reservation}','t100-missing')`);assert.throws(()=>sql(`select public.t100_record_finance_result('${f.finalization}','${f.reservation}','t100-missing','succeeded')`),/not verified/);
 assert.equal(sql(`select state from public.t100_finalizations where id='${f.finalization}'`),'running');
});
