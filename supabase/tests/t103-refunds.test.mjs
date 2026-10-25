import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {funded,sql} from './t103-fixtures.mjs';

// An isolated pre-existing captured balance fixture, not an executable payment path.
function capturedFixture(f,intent){
 sql(`with inserted as(insert into finance_transactions(intent_id,service_request_id,operation,status,amount,currency,idempotency_key,metadata)select id,service_request_id,'capture','succeeded',amount,currency,'t103-captured-fixture:'||id,'{"provider":"fake","localFixture":true}'from finance_payment_intents where id='${intent}'returning *)insert into finance_ledger_entries(transaction_id,intent_id,service_request_id,account,direction,amount,currency)select id,intent_id,service_request_id,'provider_clearing','debit',amount,currency from inserted union all select id,intent_id,service_request_id,'service_settlement','credit',amount,currency from inserted;
 update finance_payment_intents set status='captured',captured_amount=amount,captured_at=clock_timestamp()where id='${intent}'and service_request_id='${f.request}'`);
}
for(const bothCaptured of [false,true])test('T103 full return verifies '+(bothCaptured?'two captured balances':'one captured balance and one hold')+' without entitlement',()=>{
 const f=funded();capturedFixture(f,f.intent);if(bothCaptured)capturedFixture(f,f.additional);
 sql(`select complete_service_job('${f.job}','${f.t}');select t100_answer_completion('${f.job}','${f.c}','no',t100_completion_version('${f.job}'));select stage10_create_complaint('${f.request}','${f.c}','T103 local full return of already captured fixture balances','t103-return:${randomUUID()}','[]');select t100_admin_finance_decision('${f.job}','${f.admin}','refund')`);
 const id=sql(`select id from t100_finalizations where service_request_id='${f.request}'`);
 assert.equal(sql(`select state from t100_finalizations where id='${id}'`),'pending');
 sql(`select t100_process_fake_finalization('${id}')`);
 assert.equal(sql(`select state from t100_finalizations where id='${id}'`),'verified');
 assert.equal(sql(`select sum(captured_amount-refunded_amount)from finance_payment_intents where service_request_id='${f.request}'`),'0.00');
 assert.equal(sql(`select count(*)from t103_finance_parts where finalization_id='${id}'and state='verified'`),'2');
 assert.equal(sql(`select count(*)from finance_transactions where service_request_id='${f.request}'and operation='refund'and status='succeeded'`),bothCaptured?'2':'1');
 assert.equal(sql(`select count(*)from t100_distribution_simulations where finalization_id='${id}'`),'0');
 sql(`select t100_process_fake_finalization('${id}')`);
 assert.equal(sql(`select count(*)from finance_transactions where service_request_id='${f.request}'and operation='refund'`),bothCaptured?'2':'1');
 assert.equal(sql(`select sum(case when direction='debit'then amount else -amount end)from finance_ledger_entries where service_request_id='${f.request}'`),'0.00');
});
