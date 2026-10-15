import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';

registerHooks({
  resolve(specifier,context,nextResolve){
    if(specifier==='server-only')
      return {url:'data:text/javascript,export%20{}',shortCircuit:true};
    return nextResolve(specifier,context);
  },
});

const {
  assertIyzicoStage12Enabled,stage12IyzicoOperationKeys,IyzicoStage12Error,
}=await import('../apps/customer/src/lib/finance/iyzico/iyzico-stage12-contract.ts');
const {canonicalTryAmount}=await import('../apps/customer/src/lib/finance/iyzico/iyzico-money.ts');
const {describeIyzicoOperation}=await import(
  '../apps/customer/src/lib/finance/iyzico/iyzico-operation-fingerprint.ts'
);
const {InMemoryIyzicoOperationStore}=await import(
  '../apps/customer/src/lib/finance/iyzico/iyzico-operation-store.ts'
);
const {SupabaseIyzicoOperationStore}=await import(
  '../apps/customer/src/lib/finance/iyzico/supabase-iyzico-operation-store.ts'
);
const {IyzicoStage12Server}=await import(
  '../apps/customer/src/lib/finance/iyzico/iyzico-stage12-server.ts'
);

const amount=canonicalTryAmount('350.00');
const scope=Object.freeze({
  intentId:'12000000-0000-4000-8000-000000000001',
  serviceRequestId:'12000000-0000-4000-8000-000000000002',
  customerId:'12000000-0000-4000-8000-000000000003',
  quoteId:'12000000-0000-4000-8000-000000000004',
  amount,currency:'TRY',basketId:'12000000-0000-4000-8000-000000000002',
  intentStatus:'pending_authorization',
});
const enabledRuntime={enabled:true,gateMode:'test_only',provider:'iyzico',environment:'sandbox'};
const enabledEnv={STAGE12_IYZICO_SANDBOX_ENABLED:'true',APP_ENV:'staging',VERCEL_ENV:'preview',
  NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://ygrvtndujbmeatexjdej.supabase.co'};

const card={cardHolderName:'Sandbox User',cardNumber:'5528790000000008',expireMonth:'12',
  expireYear:'2030',cvc:'123',registerCard:'0'};
const buyer={id:'sandbox-buyer',name:'Sandbox',surname:'User',gsmNumber:'+905000000000',
  email:'sandbox@example.invalid',identityNumber:'11111111111',
  lastLoginDate:'2026-10-14 12:00:00',registrationDate:'2026-10-14 12:00:00',
  registrationAddress:'Sandbox',ip:'127.0.0.1',city:'Istanbul',country:'Turkey'};
const address={contactName:'Sandbox User',city:'Istanbul',country:'Turkey',address:'Sandbox'};
const authorizePayload={paymentCard:card,buyer,shippingAddress:address,billingAddress:address,
  basketItems:[{id:'service-item',price:amount,name:'Test service',category1:'Service',itemType:'VIRTUAL'}]};

test('iyzico Stage 12 gate requires both environment and database approval',()=>{
  assert.doesNotThrow(()=>assertIyzicoStage12Enabled(enabledEnv,enabledRuntime));
  for(const [env,runtime] of [
    [{...enabledEnv,STAGE12_IYZICO_SANDBOX_ENABLED:'false'},enabledRuntime],
    [{...enabledEnv,APP_ENV:'production'},enabledRuntime],
    [{...enabledEnv,VERCEL_ENV:'production'},enabledRuntime],
    [{...enabledEnv,NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co'},enabledRuntime],
    [enabledEnv,{...enabledRuntime,enabled:false}],
    [enabledEnv,{...enabledRuntime,provider:'fake'}],
  ]) assert.throws(()=>assertIyzicoStage12Enabled(env,runtime),IyzicoStage12Error);
});

test('server-issued operation identifiers are deterministic and PII-free',()=>{
  const first=stage12IyzicoOperationKeys(scope,'authorize','initial');
  const same=stage12IyzicoOperationKeys(scope,'authorize','initial');
  const capture=stage12IyzicoOperationKeys(scope,'capture','job-1');
  assert.deepEqual(first,same);assert.notDeepEqual(first,capture);
  assert.match(first.operationId,/^hp-authorize-[0-9a-f]{32}$/);
  assert.doesNotMatch(JSON.stringify(first),/Sandbox|example|552879/);
});

test('durable store sends only normalized operation data to service-role RPCs',async()=>{
  const keys=stage12IyzicoOperationKeys(scope,'authorize','initial');
  const input={...keys,amount,currency:'TRY',basketId:scope.basketId,paymentCard:card,buyer,
    shippingAddress:address,billingAddress:address,basketItems:authorizePayload.basketItems};
  const descriptor=describeIyzicoOperation('authorize',input);
  const baseRecord={...descriptor,state:'in_flight',revision:1,
    createdAt:'2026-10-14T12:00:00.000Z',updatedAt:'2026-10-14T12:00:00.000Z',
    leaseExpiresAt:'2026-10-14T12:05:00.000Z'};
  const calls=[];
  const db={async rpc(name,args){calls.push({name,args});
    if(name==='finance_iyzico_claim_operation')
      return {data:{kind:'claimed',claimToken:'12000000-0000-4000-8000-000000000099',
        record:baseRecord},error:null};
    if(name==='finance_iyzico_get_operation')return {data:baseRecord,error:null};
    throw new Error(`unexpected ${name}`);
  }};
  const store=new SupabaseIyzicoOperationStore(db,{intentId:scope.intentId,
    serviceRequestId:scope.serviceRequestId,customerId:scope.customerId});
  const claim=await store.claim(descriptor);
  assert.equal(claim.kind,'claimed');assert.equal(store.durability,'durable');
  const serialized=JSON.stringify(calls[0].args);
  assert.doesNotMatch(serialized,/card|cvc|buyer|address|552879/i);
  assert.equal(calls[0].args.p_amount,'350.00');
  assert.equal(calls[0].args.p_customer_id,scope.customerId);
});

function repositoryFor(resultFactory,{release=true,enabled=true}={}){
  const calls=[];let adapterCalls=0;
  const adapter={
    async authorize(input){adapterCalls++;return resultFactory(input);},
    async capture(input){adapterCalls++;return resultFactory(input);},
    async cancel(input){adapterCalls++;return resultFactory(input);},
    async refund(input){adapterCalls++;return resultFactory(input);},
    async retrieve(input){adapterCalls++;return resultFactory(input);},
  };
  const store=new InMemoryIyzicoOperationStore();
  const repository={
    async assertEnabled(){if(!enabled)throw new IyzicoStage12Error('iyzico_stage12_disabled');},
    async scope(){calls.push('scope');return scope;},
    store(){return store;},
    async apply(){calls.push('apply');},
    async release(){calls.push('release');return {distributionStarted:release};},
    async issue(_scope,code){calls.push(`issue:${code}`);},
  };
  return {server:new IyzicoStage12Server(adapter,repository,enabledEnv),calls,
    adapterCalls:()=>adapterCalls};
}

test('verified authorization updates the core before releasing distribution',async()=>{
  const fixture=repositoryFor(input=>({provider:'iyzico',operation:'authorize',
    operationId:input.operationId,conversationId:input.conversationId,outcome:'succeeded',
    money:{amount:input.amount,currency:input.currency},paymentId:'sandbox-payment',
    paymentTransactionId:'sandbox-transaction',providerPhase:'PRE_AUTH',
    signatureVerified:true,retryable:false}));
  const result=await fixture.server.authorize(scope.intentId,scope.customerId,authorizePayload);
  assert.equal(result.coreApplied,true);assert.equal(result.distributionStarted,true);
  assert.equal(result.reconciliationRequired,false);
  assert.deepEqual(fixture.calls,['scope','apply','release']);
  assert.equal(fixture.adapterCalls(),1);
});

test('unknown authorization never updates core or starts distribution',async()=>{
  const fixture=repositoryFor(input=>({provider:'iyzico',operation:'authorize',
    operationId:input.operationId,conversationId:input.conversationId,outcome:'unknown',
    money:{amount:input.amount,currency:input.currency},signatureVerified:false,
    retryable:false,errorCode:'network_timeout'}));
  const result=await fixture.server.authorize(scope.intentId,scope.customerId,authorizePayload);
  assert.equal(result.coreApplied,false);assert.equal(result.distributionStarted,false);
  assert.equal(result.reconciliationRequired,true);
  assert.deepEqual(fixture.calls,['scope','issue:iyzico_authorize_unknown']);
});

test('disabled integration fails before intent lookup or provider call',async()=>{
  const fixture=repositoryFor(()=>{throw new Error('provider must not run');},{enabled:false});
  await assert.rejects(()=>fixture.server.authorize(
    scope.intentId,scope.customerId,authorizePayload,
  ),error=>error instanceof IyzicoStage12Error&&error.code==='iyzico_stage12_disabled');
  assert.equal(fixture.adapterCalls(),0);assert.deepEqual(fixture.calls,[]);
});

test('distribution release failure is retained for reconciliation without replay',async()=>{
  const fixture=repositoryFor(input=>({provider:'iyzico',operation:'authorize',
    operationId:input.operationId,conversationId:input.conversationId,outcome:'succeeded',
    money:{amount:input.amount,currency:input.currency},paymentId:'sandbox-payment',
    paymentTransactionId:'sandbox-transaction',providerPhase:'PRE_AUTH',
    signatureVerified:true,retryable:false}),{release:false});
  const result=await fixture.server.authorize(scope.intentId,scope.customerId,authorizePayload);
  assert.equal(result.coreApplied,true);assert.equal(result.distributionStarted,false);
  assert.equal(result.reconciliationRequired,true);
  assert.deepEqual(fixture.calls,['scope','apply','release',
    'issue:iyzico_distribution_release_failed']);
  assert.equal(fixture.adapterCalls(),1);
});

test('migration draft is fail-closed, service-role RPC only and preserves fake activation paths',async()=>{
  const sql=await readFile(new URL(
    '../supabase/migrations/20261014193758_stage12_iyzico_integration_draft.sql',import.meta.url,
  ),'utf8');
  assert.match(sql,/iyzico_sandbox_enabled boolean not null default false/i);
  assert.match(sql,/finance_runtime_iyzico_sandbox_guard/i);
  assert.match(sql,/create table if not exists public\.finance_iyzico_operations/i);
  assert.match(sql,/unique\(provider,environment,operation,business_operation_key\)/i);
  assert.match(sql,/unique\(provider,environment,conversation_id\)/i);
  assert.match(sql,/where state in \('in_flight','unknown'\)/i);
  assert.match(sql,/alter table public\.finance_iyzico_operations enable row level security/i);
  assert.match(sql,/revoke all on public\.finance_iyzico_operations from public,anon,authenticated,service_role/i);
  assert.match(sql,/finance_iyzico_mark_interrupted_unknown/i);
  assert.match(sql,/finance_iyzico_resolve_unknown/i);
  assert.match(sql,/finance_apply_iyzico_operation/i);
  assert.match(sql,/idempotency_key='iyzico:'\|\|v_operation\.operation_id/i);
  assert.match(sql,/Iyzico refund exceeds captured balance/i);
  assert.match(sql,/v_new_refunded:=v_intent\.refunded_amount\+v_operation\.amount/i);
  assert.match(sql,/Completed service job required before iyzico capture/i);
  assert.doesNotMatch(sql,/^\s*(card_?number|cvv|cvc|pan)\s+/im);
  assert.doesNotMatch(sql,/create or replace function public\.finance_fake_authorize/i);
  assert.match(sql,/create_payment_pending_service_request_v2 still creates fake intents only/i);
});
