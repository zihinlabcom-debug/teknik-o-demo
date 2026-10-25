import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,extra,fundedIyzico,reserve,sql} from './t103-fixtures.mjs';

test('T103 an actual unknown authorization journal prevents both another operation and a fresh card intent',()=>{
 const f=fixture(3000,'painting','iyzico'),cost=extra(f,500),id=JSON.parse(sql(`select t103_ensure_additional_intent('${cost}','${f.c}',3,false)`)).intentId;
 const op='t103-unknown-'+randomUUID();
 const claim=key=>`select finance_iyzico_claim_operation('${id}','${f.request}','${f.c}',null,'authorize','${key}','${key}','${key}',repeat('e',64),500,'TRY','${f.request}',null,null,null)`;
 sql(claim(op));sql(`update finance_iyzico_operations set state='unknown',claim_token=null where operation_id='${op}'`);
 assert.throws(()=>sql(claim('t103-second-'+randomUUID())),/T103 authorization attempt identity conflict/);
 assert.throws(()=>sql(`select t103_ensure_additional_intent('${cost}','${f.c}',3,true)`),/uncertain/);
 const state=JSON.parse(sql(`select t103_funding_state('${f.request}','${f.c}')`));
 assert.equal(state.parts.find(p=>p.intentId===id).uncertain,true);
 assert.equal(state.securedMinor,300000);
 assert.equal(sql(`select status from finance_payment_intents where id='${f.intent}'`),'authorized');
});

test('T103 foreign actors and stale approval versions cannot read, retry or open a funding complaint',()=>{
 const f=fixture(),foreign=fixture(),cost=extra(f,500);
 for(const actor of [foreign.c,foreign.t])assert.throws(()=>sql(`select t103_funding_state('${f.request}','${actor}')`),/forbidden/);
 assert.throws(()=>sql(`select t103_ensure_additional_intent('${cost}','${foreign.c}',3,false)`),/forbidden/);
 assert.throws(()=>sql(`select t103_ensure_additional_intent('${cost}','${f.c}',2,false)`),/version/);
 assert.throws(()=>sql(`select t103_open_funding_review('${cost}','${foreign.t}')`),/forbidden/);
 assert.throws(()=>sql(`select t103_open_funding_review('${cost}','${f.c}')`),/role|forbidden/);
 assert.equal(sql(`select count(*)from t100_reviews where service_request_id='${f.request}'`),'0');
});

test('T103 a bound payment part rejects foreign provider identity and stale reservation',()=>{
 const f=fundedIyzico(),id=reserve(f),parent=JSON.parse(sql(`select t100_claim_finalization('${id}')`)),part=JSON.parse(sql(`select t103_finance_plan('${id}')`))[0];
 const claim=JSON.parse(sql(`select t103_claim_part('${part.id}','${parent.reservation}')`)),op='t103-security-'+randomUUID();
 assert.throws(()=>sql(`select t103_bind_part_operation('${part.id}','${randomUUID()}','${op}')`),/reservation/);
 sql(`select t103_bind_part_operation('${part.id}','${claim.reservation}','${op}')`);
 assert.throws(()=>sql(`select finance_iyzico_claim_operation('${part.intentId}','${f.request}','${f.c}','${f.job}','capture','${op}','${op}','${op}',repeat('f',64),${part.amount},'TRY','${f.request}','foreign-provider-payment',null,null)`),/payment identity/);
 assert.equal(sql(`select count(*)from finance_iyzico_operations where operation_id='${op}'`),'0');
 sql(`update t103_finance_parts set reserved_at=clock_timestamp()-interval '11 minutes'where id='${part.id}';select t100_expire_finance_reservations()`);
 assert.equal(sql(`select state from t103_finance_parts where id='${part.id}'`),'unknown');
 assert.equal(JSON.parse(sql(`select t103_claim_part('${part.id}','${parent.reservation}')`)).claimed,false);
 assert.throws(()=>sql(`select t103_recover_part('${part.id}','${f.c}','${op}')`),/role|forbidden/);
 assert.throws(()=>sql(`select t103_recover_part('${part.id}','${f.admin}','${op}')`),/evidence/);
 assert.equal(sql(`select captured_amount from finance_payment_intents where id='${part.intentId}'`),'0.00');
});
