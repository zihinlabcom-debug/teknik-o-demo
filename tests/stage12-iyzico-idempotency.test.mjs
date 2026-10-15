import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalTryAmount} from '../apps/customer/src/lib/finance/iyzico/iyzico-money.ts';
import {fingerprintIyzicoOperation} from '../apps/customer/src/lib/finance/iyzico/iyzico-operation-fingerprint.ts';
import {IyzicoOperationManager} from '../apps/customer/src/lib/finance/iyzico/iyzico-operation-manager.ts';
import {InMemoryIyzicoOperationStore} from '../apps/customer/src/lib/finance/iyzico/iyzico-operation-store.ts';

const amount=canonicalTryAmount('10');
const amountEleven=canonicalTryAmount('11');
const context={operationId:'authorize-op-1',businessOperationKey:'authorize:business-1',
  conversationId:'authorize-conversation-1',amount,currency:'TRY'};
const authorizeInput={...context,basketId:'basket-1',paymentCard:{cardHolderName:'TEST USER',
  cardNumber:'TEST-CARD-NOT-REAL',expireMonth:'12',expireYear:'2030',cvc:'7391',registerCard:'0'},
  buyer:{id:'test-buyer',name:'Test',surname:'User',gsmNumber:'+900000000000',email:'test@example.invalid',
    identityNumber:'00000000000',lastLoginDate:'2026-10-14 10:00:00',registrationDate:'2026-10-14 09:00:00',
    registrationAddress:'Sensitive test address',ip:'127.0.0.1',city:'Istanbul',country:'Turkey'},
  shippingAddress:{contactName:'Test User',city:'Istanbul',country:'Turkey',address:'Sensitive test address'},
  billingAddress:{contactName:'Test User',city:'Istanbul',country:'Turkey',address:'Sensitive test address'},
  basketItems:[{id:'service-1',price:amount,name:'Test service',category1:'Service',itemType:'VIRTUAL'}]};

function inputFor(operation,overrides={}){
  const common={operationId:`${operation}-op-1`,conversationId:`${operation}-conversation-1`,
    businessOperationKey:`${operation}:business-1`,amount,currency:'TRY',...overrides};
  if(operation==='authorize')return {...authorizeInput,...common};
  if(operation==='capture')return {...common,paymentId:'payment-1',basketId:'basket-1',ip:'127.0.0.1'};
  if(operation==='cancel')return {...common,paymentId:'payment-1',ip:'127.0.0.1'};
  if(operation==='refund')return {...common,paymentId:'payment-1',paymentTransactionId:'transaction-1',
    ip:'127.0.0.1'};
  return {...common,paymentId:'payment-1',basketId:'basket-1'};
}

function providerResult(operation,input,outcome='succeeded',overrides={}){
  return {provider:'iyzico',operation,operationId:input.operationId,conversationId:input.conversationId,
    outcome,money:{amount:input.amount,currency:input.currency},
    ...(outcome==='succeeded'?{paymentId:'payment-1',paymentTransactionId:'transaction-1',
      providerPhase:operation==='authorize'?'PRE_AUTH':operation==='capture'?'POST_AUTH':
        operation==='retrieve'?'PRE_AUTH':undefined}:{}),
    signatureVerified:outcome==='succeeded',retryable:false,...overrides};
}

function fakeAdapter(handlers={}){
  const calls={authorize:0,capture:0,cancel:0,refund:0,retrieve:0};
  const adapter={};
  for(const operation of Object.keys(calls))adapter[operation]=async input=>{
    calls[operation]++;
    if(handlers[operation])return handlers[operation](input,calls[operation]);
    return providerResult(operation,input);
  };
  return {adapter,calls};
}

function unknown(operation,input,errorCode='iyzico_transport_unknown'){
  return providerResult(operation,input,'unknown',{signatureVerified:false,retryable:true,errorCode});
}

test('Aşama 3: aynı operasyon ardışık tekrarlandığında sağlayıcı yalnız bir kez çağrılır',async()=>{
  const {adapter,calls}=fakeAdapter();
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  const first=await manager.authorize(authorizeInput);
  const replay=await manager.authorize(authorizeInput);
  assert.equal(first.result.outcome,'succeeded');
  assert.equal(replay.result.outcome,'succeeded');
  assert.equal(replay.replayed,true);
  assert.equal(replay.source,'cache');
  assert.equal(calls.authorize,1);
});

test('Aşama 5.5: aynı refund kimliği mükerrer sağlayıcı iadesi oluşturmaz',async()=>{
  const {adapter,calls}=fakeAdapter();
  const manager=new IyzicoOperationManager(adapter,new InMemoryIyzicoOperationStore());
  const input=inputFor('refund');
  const first=await manager.refund(input);
  const replay=await manager.refund(input);
  assert.equal(first.result.outcome,'succeeded');
  assert.equal(replay.result.outcome,'succeeded');
  assert.equal(replay.replayed,true);
  assert.equal(replay.source,'cache');
  assert.equal(calls.refund,1);
});

test('Aşama 3: aynı operationId farklı tutar, referans veya operasyonla kullanılamaz',async()=>{
  const {adapter,calls}=fakeAdapter();
  const manager=new IyzicoOperationManager(adapter,new InMemoryIyzicoOperationStore());
  await manager.authorize(authorizeInput);
  const differentAmount={...authorizeInput,amount:amountEleven,
    basketItems:[{...authorizeInput.basketItems[0],price:amountEleven}]};
  const amountConflict=await manager.authorize(differentAmount);
  const operationConflict=await manager.capture({...inputFor('capture'),operationId:authorizeInput.operationId,
    conversationId:authorizeInput.conversationId});
  assert.equal(amountConflict.result.errorCode,'idempotency_payload_mismatch');
  assert.equal(operationConflict.result.errorCode,'idempotency_payload_mismatch');
  assert.equal(amountConflict.automaticReplayAllowed,false);
  assert.equal(calls.authorize,1);
  assert.equal(calls.capture,0);
});

test('Aşama 3: farklı operationId aynı iş anahtarını veya conversationId değerini aşamaz',async()=>{
  const {adapter,calls}=fakeAdapter();
  const manager=new IyzicoOperationManager(adapter,new InMemoryIyzicoOperationStore());
  await manager.authorize(authorizeInput);
  const sameBusiness=await manager.authorize({...authorizeInput,operationId:'authorize-op-2',
    conversationId:'authorize-conversation-2'});
  const sameConversation=await manager.authorize({...authorizeInput,operationId:'authorize-op-3',
    businessOperationKey:'authorize:business-3'});
  assert.equal(sameBusiness.result.errorCode,'business_operation_already_claimed');
  assert.equal(sameConversation.result.errorCode,'conversation_id_already_claimed');
  assert.equal(calls.authorize,1);
});

test('Aşama 3: geçersiz yerel girdi claim oluşturmadan reddedilir',async()=>{
  const {adapter,calls}=fakeAdapter();
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  await assert.rejects(manager.authorize({...authorizeInput,operationId:'invalid operation id'}),
    error=>error?.code==='invalid_operation_input');
  assert.equal(store.snapshot().length,0);
  assert.equal(calls.authorize,0);
});

test('Aşama 3: eşzamanlı aynı talep single-flight olur; farklı payload ikinci çağrı üretmez',async()=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const {adapter,calls}=fakeAdapter({authorize:async input=>{await gate;return providerResult('authorize',input);}});
  const manager=new IyzicoOperationManager(adapter,new InMemoryIyzicoOperationStore());
  const firstPromise=manager.authorize(authorizeInput);
  await new Promise(resolve=>setImmediate(resolve));
  const replayPromise=manager.authorize(authorizeInput);
  const different={...authorizeInput,amount:amountEleven,
    basketItems:[{...authorizeInput.basketItems[0],price:amountEleven}]};
  const conflict=await manager.authorize(different);
  assert.equal(conflict.result.errorCode,'idempotency_payload_mismatch');
  assert.equal(calls.authorize,1);
  release();
  const [first,replay]=await Promise.all([firstPromise,replayPromise]);
  assert.equal(first.source,'provider');
  assert.equal(replay.source,'single_flight');
  assert.equal(replay.replayed,true);
});

test('Aşama 3: ortak store kullanan ikinci manager devam eden mutasyonu yeniden göndermez',async()=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const {adapter,calls}=fakeAdapter({authorize:async input=>{await gate;return providerResult('authorize',input);}});
  const store=new InMemoryIyzicoOperationStore();
  const firstManager=new IyzicoOperationManager(adapter,store);
  const secondManager=new IyzicoOperationManager(adapter,store);
  const first=firstManager.authorize(authorizeInput);
  await new Promise(resolve=>setImmediate(resolve));
  const guarded=await secondManager.authorize(authorizeInput);
  assert.equal(guarded.result.errorCode,'operation_in_progress');
  assert.equal(guarded.nextAction,'wait');
  assert.equal(calls.authorize,1);
  release();
  await first;
});

test('Aşama 3: bağlantı kopması unknown kaydedilir ve mutasyon otomatik tekrarlanmaz',async()=>{
  let providerEffects=0;
  const {adapter,calls}=fakeAdapter({authorize:async input=>{
    providerEffects++;
    return unknown('authorize',input);
  }});
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  const first=await manager.authorize(authorizeInput);
  const replay=await manager.authorize(authorizeInput);
  const reconstructed=new IyzicoOperationManager(adapter,store);
  const afterReconstruction=await reconstructed.authorize(authorizeInput);
  assert.equal(first.result.outcome,'unknown');
  assert.equal(replay.result.outcome,'unknown');
  assert.equal(afterReconstruction.result.outcome,'unknown');
  assert.equal(first.nextAction,'reconcile');
  assert.equal(first.automaticReplayAllowed,false);
  assert.equal(providerEffects,1);
  assert.equal(calls.authorize,1);
});

test('Aşama 3: beklenmeyen provider exception unknown olur ve cache üzerinden korunur',async()=>{
  const {adapter,calls}=fakeAdapter({authorize:async()=>{throw new Error('simulated process boundary');}});
  const manager=new IyzicoOperationManager(adapter,new InMemoryIyzicoOperationStore());
  const first=await manager.authorize(authorizeInput);
  const replay=await manager.authorize(authorizeInput);
  assert.equal(first.result.errorCode,'iyzico_unexpected_error');
  assert.equal(replay.result.errorCode,'iyzico_unexpected_error');
  assert.equal(calls.authorize,1);
});

test('Aşama 3: kesilen finalize açık kurtarmayla unknown olur ve yalnız retrieve ile çözülür',async()=>{
  class FinalizeFailingStore extends InMemoryIyzicoOperationStore{
    failureCount=1;
    async finalize(...args){
      if(this.failureCount-->0)throw new Error('simulated durable write failure');
      return super.finalize(...args);
    }
  }
  const {adapter,calls}=fakeAdapter();
  let now=Date.parse('2026-10-14T12:00:00.000Z');
  const store=new FinalizeFailingStore(()=>new Date(now),undefined,1_000);
  const manager=new IyzicoOperationManager(adapter,store);
  const result=await manager.authorize(authorizeInput);
  assert.equal(result.result.outcome,'unknown');
  assert.equal(result.result.errorCode,'operation_persistence_failed');
  assert.equal(result.nextAction,'manual_review');
  const restarted=new IyzicoOperationManager(adapter,store);
  const blocked=await restarted.authorize(authorizeInput);
  assert.equal(blocked.result.errorCode,'operation_in_progress');
  const interrupted=await restarted.inspect(authorizeInput.operationId);
  now+=1_001;
  const recovered=await restarted.recoverInterrupted(authorizeInput.operationId,interrupted.revision);
  assert.equal(recovered.result.errorCode,'interrupted_before_confirmation');
  assert.equal((await store.get(authorizeInput.operationId)).state,'unknown');
  const resolution=await restarted.reconcile(authorizeInput.operationId,{
    operationId:'recover-retrieve-op',businessOperationKey:'retrieve:recover',
    conversationId:'recover-retrieve-conversation',amount,currency:'TRY',
    paymentConversationId:authorizeInput.conversationId,basketId:'basket-1',
  });
  assert.equal(resolution.result.outcome,'succeeded');
  assert.equal(calls.authorize,1);
  assert.equal(calls.retrieve,1);
});

test('Aşama 3: aktif lease başka manager tarafından erken kesilemez',async()=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const {adapter,calls}=fakeAdapter({authorize:async input=>{await gate;return providerResult('authorize',input);}});
  const store=new InMemoryIyzicoOperationStore(()=>new Date('2026-10-14T12:00:00.000Z'),undefined,60_000);
  const owner=new IyzicoOperationManager(adapter,store);
  const recoveryWorker=new IyzicoOperationManager(adapter,store);
  const running=owner.authorize(authorizeInput);
  await new Promise(resolve=>setImmediate(resolve));
  const observed=await recoveryWorker.inspect(authorizeInput.operationId);
  const premature=await recoveryWorker.recoverInterrupted(authorizeInput.operationId,observed.revision);
  assert.equal(premature.result.errorCode,'operation_in_progress');
  assert.equal(premature.nextAction,'wait');
  assert.equal((await store.get(authorizeInput.operationId)).state,'in_flight');
  release();
  const completed=await running;
  assert.equal(completed.result.outcome,'succeeded');
  assert.equal((await store.get(authorizeInput.operationId)).state,'succeeded');
  assert.equal(calls.authorize,1);
});

test('Aşama 3: paymentId kayıp preAuth yalnız açık retrieve mutabakatıyla kesinleşir',async()=>{
  const {adapter,calls}=fakeAdapter({
    authorize:async input=>unknown('authorize',input),
    retrieve:async input=>providerResult('retrieve',input,'succeeded',{
      paymentId:'payment-from-retrieve',paymentTransactionId:'transaction-from-retrieve',
      providerPhase:'PRE_AUTH',signatureVerified:true,
    }),
  });
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  await manager.authorize(authorizeInput);
  const reconciliationInput={operationId:'retrieve-op-1',businessOperationKey:'retrieve:business-1',
    conversationId:'retrieve-conversation-1',
    amount,currency:'TRY',paymentConversationId:authorizeInput.conversationId,basketId:'basket-1'};
  const resolved=await manager.reconcile(authorizeInput.operationId,reconciliationInput);
  assert.equal(resolved.result.outcome,'succeeded');
  assert.equal(resolved.result.operation,'authorize');
  assert.equal(resolved.result.operationId,authorizeInput.operationId);
  assert.equal(resolved.source,'reconciliation');
  assert.equal((await store.get(authorizeInput.operationId)).state,'succeeded');
  await manager.reconcile(authorizeInput.operationId,reconciliationInput);
  await manager.authorize(authorizeInput);
  assert.equal(calls.authorize,1);
  assert.equal(calls.retrieve,1);
});

test('Aşama 3: doğrulanamayan retrieve unknown kalır; yalnız yeni açık sorgu kimliği tekrar sorgular',async()=>{
  const {adapter,calls}=fakeAdapter({authorize:async input=>unknown('authorize',input),
    retrieve:async input=>unknown('retrieve',input,'unresolved_payment_status')});
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  await manager.authorize(authorizeInput);
  const retrieve={operationId:'retrieve-unresolved-1',businessOperationKey:'retrieve:unresolved-1',
    conversationId:'retrieve-unresolved-conversation-1',
    amount,currency:'TRY',paymentConversationId:authorizeInput.conversationId,basketId:'basket-1'};
  const first=await manager.reconcile(authorizeInput.operationId,retrieve);
  const same=await manager.reconcile(authorizeInput.operationId,retrieve);
  const next=await manager.reconcile(authorizeInput.operationId,{...retrieve,
    operationId:'retrieve-unresolved-2',businessOperationKey:'retrieve:unresolved-2',
    conversationId:'retrieve-unresolved-conversation-2'});
  assert.equal(first.result.outcome,'unknown');
  assert.equal(same.result.outcome,'unknown');
  assert.equal(next.result.outcome,'unknown');
  assert.equal((await store.get(authorizeInput.operationId)).state,'unknown');
  assert.equal(calls.authorize,1);
  assert.equal(calls.retrieve,2);
});

test('Aşama 3: uyuşmayan mutabakat girdisi provider sorgusundan önce kesilir',async()=>{
  const {adapter,calls}=fakeAdapter({authorize:async input=>unknown('authorize',input)});
  const manager=new IyzicoOperationManager(adapter,new InMemoryIyzicoOperationStore());
  await manager.authorize(authorizeInput);
  const result=await manager.reconcile(authorizeInput.operationId,{
    operationId:'mismatch-retrieve',businessOperationKey:'retrieve:mismatch',
    conversationId:'mismatch-retrieve-conversation',amount:amountEleven,currency:'TRY',
    paymentConversationId:authorizeInput.conversationId,basketId:'basket-1',
  });
  assert.equal(result.result.errorCode,'reconciliation_input_mismatch');
  assert.equal(calls.retrieve,0);
});

test('Aşama 3: unknown authorize için POST_AUTH otomatik authorization başarısı değildir',async()=>{
  const {adapter,calls}=fakeAdapter({authorize:async input=>unknown('authorize',input),
    retrieve:async input=>providerResult('retrieve',input,'succeeded',{
      providerPhase:'POST_AUTH',signatureVerified:true,
    })});
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  await manager.authorize(authorizeInput);
  const result=await manager.reconcile(authorizeInput.operationId,{
    operationId:'postauth-retrieve',businessOperationKey:'retrieve:postauth',
    conversationId:'postauth-retrieve-conversation',amount,currency:'TRY',
    paymentConversationId:authorizeInput.conversationId,basketId:'basket-1',
  });
  assert.equal(result.result.outcome,'unknown');
  assert.equal(result.result.errorCode,'reconciliation_phase_mismatch');
  assert.equal(result.nextAction,'manual_review');
  assert.equal((await store.get(authorizeInput.operationId)).state,'unknown');
  assert.equal(calls.retrieve,1);
});

test('Aşama 3: iki eşzamanlı mutabakat CAS ile tek terminal sonuca birleşir',async()=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const {adapter,calls}=fakeAdapter({authorize:async input=>unknown('authorize',input),
    retrieve:async input=>{await gate;return providerResult('retrieve',input,'succeeded',{
      providerPhase:'PRE_AUTH',signatureVerified:true,
    });}});
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  await manager.authorize(authorizeInput);
  const base={amount,currency:'TRY',paymentConversationId:authorizeInput.conversationId,basketId:'basket-1'};
  const first=manager.reconcile(authorizeInput.operationId,{...base,operationId:'concurrent-retrieve-1',
    businessOperationKey:'retrieve:concurrent-1',conversationId:'concurrent-retrieve-conversation-1'});
  const second=manager.reconcile(authorizeInput.operationId,{...base,operationId:'concurrent-retrieve-2',
    businessOperationKey:'retrieve:concurrent-2',conversationId:'concurrent-retrieve-conversation-2'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.retrieve,2);
  release();
  const results=await Promise.all([first,second]);
  assert.deepEqual(results.map(value=>value.result.outcome),['succeeded','succeeded']);
  assert.equal((await store.get(authorizeInput.operationId)).state,'succeeded');
  assert.equal(calls.authorize,1);
});

test('Aşama 3: store kalıcı retrieve kanıtı olmadan unknown sonucu terminal yapmaz',async()=>{
  const {adapter}=fakeAdapter({authorize:async input=>unknown('authorize',input)});
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  await manager.authorize(authorizeInput);
  const original=await store.get(authorizeInput.operationId);
  const forged=providerResult('authorize',authorizeInput,'succeeded',{providerPhase:'PRE_AUTH'});
  await assert.rejects(store.resolveUnknown(authorizeInput.operationId,original.revision,
    'missing-evidence-operation',forged),/operation_resolution_evidence_missing/);
  assert.equal((await store.get(authorizeInput.operationId)).state,'unknown');
});

test('Aşama 3: capture yalnız POST_AUTH kanıtıyla kesinleşir',async()=>{
  const capture=inputFor('capture');
  const {adapter,calls}=fakeAdapter({capture:async input=>unknown('capture',input),
    retrieve:async input=>providerResult('retrieve',input,'succeeded',{
      providerPhase:input.operationId==='capture-retrieve-pre'?'PRE_AUTH':'POST_AUTH',
      signatureVerified:true,
    })});
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  await manager.capture(capture);
  const base={conversationId:'capture-retrieve-conversation',amount,currency:'TRY',
    paymentId:'payment-1',basketId:'basket-1'};
  const unresolved=await manager.reconcile(capture.operationId,{...base,operationId:'capture-retrieve-pre',
    businessOperationKey:'retrieve:capture-pre'});
  assert.equal(unresolved.result.outcome,'unknown');
  const resolved=await manager.reconcile(capture.operationId,{...base,
    operationId:'capture-retrieve-post',businessOperationKey:'retrieve:capture-post',
    conversationId:'capture-retrieve-conversation-2'});
  assert.equal(resolved.result.outcome,'succeeded');
  assert.equal(resolved.result.providerPhase,'POST_AUTH');
  assert.equal(calls.capture,1);
  assert.equal(calls.retrieve,2);
});

test('Aşama 3: cancel ve refund genel payment detail ile otomatik kesinleştirilmez',async()=>{
  const {adapter,calls}=fakeAdapter({cancel:async input=>unknown('cancel',input),
    refund:async input=>unknown('refund',input)});
  const store=new InMemoryIyzicoOperationStore();
  const manager=new IyzicoOperationManager(adapter,store);
  const cancel=inputFor('cancel');
  const refund=inputFor('refund');
  await manager.cancel(cancel);
  await manager.refund(refund);
  const retrieve={operationId:'unsupported-retrieve',businessOperationKey:'retrieve:unsupported-1',
    conversationId:'unsupported-conversation',
    amount,currency:'TRY',paymentId:'payment-1',basketId:'basket-1'};
  const cancelResult=await manager.reconcile(cancel.operationId,retrieve);
  const refundResult=await manager.reconcile(refund.operationId,{...retrieve,
    operationId:'unsupported-retrieve-2',businessOperationKey:'retrieve:unsupported-2',
    conversationId:'unsupported-conversation-2'});
  assert.equal(cancelResult.nextAction,'manual_review');
  assert.equal(refundResult.nextAction,'manual_review');
  assert.equal(calls.retrieve,0);
});

test('Aşama 3: fingerprint ve store kart, CVC, kişi, adres, IP veya ham payload saklamaz',async()=>{
  const changedCard={...authorizeInput,paymentCard:{...authorizeInput.paymentCard,
    cardNumber:'DIFFERENT-TEST-CARD',cvc:'999'}};
  assert.equal(fingerprintIyzicoOperation('authorize',authorizeInput),
    fingerprintIyzicoOperation('authorize',changedCard));
  const {adapter}=fakeAdapter();
  const store=new InMemoryIyzicoOperationStore();
  await new IyzicoOperationManager(adapter,store).authorize(authorizeInput);
  const exposed=await store.get(authorizeInput.operationId);
  assert.equal('claimToken' in exposed,false);
  assert.throws(()=>{exposed.money.amount=amountEleven;},TypeError);
  assert.throws(()=>{exposed.result.money.amount=amountEleven;},TypeError);
  assert.equal((await store.get(authorizeInput.operationId)).money.amount,amount);
  const serialized=JSON.stringify(store.snapshot());
  for(const sensitive of ['TEST-CARD-NOT-REAL','test@example.invalid','Sensitive test address',
    '127.0.0.1','test-buyer','7391'])assert.equal(serialized.includes(sensitive),false);
});

test('Aşama 3 sınırı: yeni MemoryStore process restart kalıcılığı sağlamaz',async()=>{
  const {adapter,calls}=fakeAdapter();
  const first=new IyzicoOperationManager(adapter,new InMemoryIyzicoOperationStore());
  const restarted=new IyzicoOperationManager(adapter,new InMemoryIyzicoOperationStore());
  assert.equal(first.durability,'process-local');
  assert.equal(restarted.durability,'process-local');
  await first.authorize(authorizeInput);
  await restarted.authorize(authorizeInput);
  assert.equal(calls.authorize,2);
});
