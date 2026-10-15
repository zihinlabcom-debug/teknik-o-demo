import test from 'node:test';
import assert from 'node:assert/strict';
import {parseIyzicoSandboxConfig} from '../apps/customer/src/lib/finance/iyzico/iyzico-config-contract.ts';
import {canonicalTryAmount} from '../apps/customer/src/lib/finance/iyzico/iyzico-money.ts';
import {computeIyzicoResponseSignature} from '../apps/customer/src/lib/finance/iyzico/iyzico-response-signature.ts';
import {IyzicoClient} from '../apps/customer/src/lib/finance/iyzico/iyzico-client.ts';
import {IyzicoSandboxAdapter} from '../apps/customer/src/lib/finance/iyzico/iyzico-adapter.ts';
import {IyzicoError} from '../apps/customer/src/lib/finance/iyzico/iyzico-errors.ts';

const config=parseIyzicoSandboxConfig({
  IYZICO_SANDBOX_API_KEY:'sandbox-api-key-test',IYZICO_SANDBOX_SECRET_KEY:'sandbox-secret-key-test',
});
const amount=canonicalTryAmount('10');
const context={operationId:'op-1',businessOperationKey:'operation:business-1',
  conversationId:'conversation-1',amount,currency:'TRY'};
const authorizeInput={...context,basketId:'basket-1',paymentCard:{cardHolderName:'TEST USER',
  cardNumber:'TEST-CARD-NOT-REAL',expireMonth:'12',expireYear:'2030',cvc:'000',registerCard:'0'},
  buyer:{id:'test-buyer',name:'Test',surname:'User',gsmNumber:'+900000000000',email:'test@example.invalid',
    identityNumber:'00000000000',lastLoginDate:'2026-10-14 10:00:00',registrationDate:'2026-10-14 09:00:00',
    registrationAddress:'Test only',ip:'127.0.0.1',city:'Istanbul',country:'Turkey'},
  shippingAddress:{contactName:'Test User',city:'Istanbul',country:'Turkey',address:'Test only'},
  billingAddress:{contactName:'Test User',city:'Istanbul',country:'Turkey',address:'Test only'},
  basketItems:[{id:'service-1',price:amount,name:'Test service',category1:'Service',itemType:'VIRTUAL'}]};
const inputs={
  authorize:authorizeInput,
  capture:{...context,paymentId:'payment-1',basketId:'basket-1',ip:'127.0.0.1'},
  cancel:{...context,paymentId:'payment-1',ip:'127.0.0.1'},
  refund:{...context,paymentId:'payment-1',paymentTransactionId:'transaction-1',ip:'127.0.0.1'},
  retrieve:{...context,paymentId:'payment-1',basketId:'basket-1'},
};

function signed(operation,overrides={}){
  const response={status:'success',paymentId:'payment-1',paymentTransactionId:'transaction-1',
    itemTransactions:[{paymentTransactionId:'transaction-1'}],currency:'TRY',basketId:'basket-1',
    conversationId:context.conversationId,paidPrice:'10.00',price:'10.00',paymentStatus:'SUCCESS',
    fraudStatus:1,phase:operation==='authorize'?'PRE_AUTH':operation==='capture'?'POST_AUTH':'POST_AUTH',
    ...overrides};
  if(operation!=='cancel')response.signature=computeIyzicoResponseSignature(operation,response,config.secretKey);
  return response;
}

function adapterFor(responseOrError,requests=[],httpStatus=200){
  const transport={post:async(path,payload)=>{
    requests.push({path,payload});
    if(responseOrError instanceof Error)throw responseOrError;
    return {httpStatus,body:responseOrError,trust:'pinned_https_sandbox'};
  }};
  return new IyzicoSandboxAdapter(config,new IyzicoClient(transport));
}

for(const operation of ['authorize','capture','refund','retrieve']){
  test(`Aşama 2: ${operation} imzalı ve bağlı başarılı yanıtı doğrular`,async()=>{
    const result=await adapterFor(signed(operation))[operation](inputs[operation]);
    assert.equal(result.outcome,'succeeded');
    assert.equal(result.signatureVerified,true);
    assert.equal(result.paymentId,'payment-1');
    assert.equal(result.paymentTransactionId,'transaction-1');
  });

  test(`Aşama 2: ${operation} imzasız sağlayıcı hatasını terminal saymaz`,async()=>{
    const result=await adapterFor({status:'failure',conversationId:context.conversationId,
      errorCode:'provider_declined',retryable:false})[operation](inputs[operation]);
    assert.equal(result.outcome,'unknown');
    assert.equal(result.signatureVerified,false);
    assert.equal(result.errorCode,'provider_declined');
  });

  test(`Aşama 2: ${operation} hatalı imza, eksik alan ve belirsiz transportu unknown yapar`,async()=>{
    const badSignature=await adapterFor({...signed(operation),signature:'0'.repeat(64)})
      [operation](inputs[operation]);
    assert.equal(badSignature.outcome,'unknown');
    assert.equal(badSignature.errorCode,'invalid_response_signature');
    const missingResponse={...signed(operation)};
    delete missingResponse.paymentId;
    const missing=await adapterFor(missingResponse)[operation](inputs[operation]);
    assert.equal(missing.outcome,'unknown');
    const timeout=await adapterFor(new IyzicoError('iyzico_transport_unknown','unknown',true,'unknown'))
      [operation](inputs[operation]);
    assert.equal(timeout.outcome,'unknown');
    assert.equal(timeout.retryable,true);
  });
}

test('Aşama 2: istemci doğru endpointleri ve iptal/iade ayrımını korur',async()=>{
  const requests=[];
  const failure={status:'failure',conversationId:context.conversationId,errorCode:'declined'};
  const adapter=adapterFor(failure,requests);
  await adapter.authorize(inputs.authorize);
  await adapter.capture(inputs.capture);
  await adapter.cancel(inputs.cancel);
  await adapter.refund(inputs.refund);
  await adapter.retrieve(inputs.retrieve);
  assert.deepEqual(requests.map(x=>x.path),['/payment/preauth','/payment/postauth','/payment/cancel',
    '/payment/refund','/payment/detail']);
  assert.equal(requests[2].payload.paymentId,'payment-1');
  assert.equal(requests[2].payload.paymentTransactionId,undefined);
  assert.equal(requests[3].payload.paymentTransactionId,'transaction-1');
  assert.equal(requests[3].payload.price,'10.00');
  assert.equal(requests[1].payload.paidPrice,'10.00');
  assert.equal(requests[4].payload.paymentConversationId,undefined);
  assert.equal(requests[4].payload.conversationId,context.conversationId);
});

test('Aşama 5.5: boya teklif tutarı PreAuth alanlarında kuruş kaybı olmadan korunur',async()=>{
  const requests=[];
  const paintingAmount=canonicalTryAmount('3998.19');
  const input={...inputs.authorize,amount:paintingAmount,
    basketItems:[{...inputs.authorize.basketItems[0],price:paintingAmount}]};
  const providerFailure={status:'failure',conversationId:context.conversationId,
    errorCode:'5250',
    errorMessage:'Banka kartları için ön otorizasyon yapılamaz'};
  const result=await adapterFor(providerFailure,requests).authorize(input);
  assert.equal(requests.length,1);
  assert.equal(requests[0].payload.price,'3998.19');
  assert.equal(requests[0].payload.paidPrice,'3998.19');
  assert.equal(requests[0].payload.basketItems[0].price,'3998.19');
  assert.equal(result.outcome,'unknown');
  assert.equal(result.signatureVerified,false);
  assert.equal(result.errorCode,'5250');
});

test('Aşama 2: retrieve paymentId bilinmediğinde paymentConversationId ile sorgulanabilir',async()=>{
  const requests=[];
  const retrieve={...inputs.retrieve,paymentId:undefined,paymentConversationId:'original-conversation'};
  const response=signed('retrieve');
  const result=await adapterFor(response,requests).retrieve(retrieve);
  assert.equal(result.outcome,'succeeded');
  assert.equal(result.providerPhase,'POST_AUTH');
  assert.equal(requests[0].payload.paymentId,undefined);
  assert.equal(requests[0].payload.paymentConversationId,'original-conversation');
  assert.equal(requests[0].payload.conversationId,context.conversationId);
});

test('Aşama 2: preAuth ve postAuth phase uyuşmazlığı başarı sayılmaz',async()=>{
  const preAuth=await adapterFor(signed('authorize',{phase:'POST_AUTH'})).authorize(inputs.authorize);
  assert.equal(preAuth.outcome,'unknown');
  assert.equal(preAuth.errorCode,'provider_phase_mismatch');
  const postAuth=await adapterFor(signed('capture',{phase:'PRE_AUTH'})).capture(inputs.capture);
  assert.equal(postAuth.outcome,'unknown');
  assert.equal(postAuth.errorCode,'provider_phase_mismatch');
});

test('Aşama 2: pinned HTTPS trust kanıtı olmayan transport sonucu terminal kabul edilmez',async()=>{
  const transport={post:async()=>({httpStatus:200,body:signed('authorize')})};
  const adapter=new IyzicoSandboxAdapter(config,new IyzicoClient(transport));
  const result=await adapter.authorize(inputs.authorize);
  assert.equal(result.outcome,'unknown');
  assert.equal(result.errorCode,'untrusted_provider_transport');
});

test('Aşama 2: imza tanımı olmayan cancel başarısı kesin başarı sayılmaz',async()=>{
  const result=await adapterFor({...signed('cancel'),signature:'f'.repeat(64)}).cancel(inputs.cancel);
  assert.equal(result.outcome,'unknown');
  assert.equal(result.signatureVerified,false);
  assert.equal(result.errorCode,'unsigned_cancel_response');
});

test('Aşama 2: cancel imzasız hata, eksik yanıt ve transport belirsizliğini terminal saymaz',async()=>{
  const rejected=await adapterFor({status:'failure',conversationId:context.conversationId,
    errorCode:'cancel_rejected'}).cancel(inputs.cancel);
  assert.equal(rejected.outcome,'unknown');
  assert.equal(rejected.errorCode,'cancel_rejected');
  const missing=await adapterFor({status:'success',conversationId:context.conversationId,
    paymentId:'payment-1'}).cancel(inputs.cancel);
  assert.equal(missing.outcome,'unknown');
  const timeout=await adapterFor(new IyzicoError('iyzico_transport_unknown','unknown',true,'unknown'))
    .cancel(inputs.cancel);
  assert.equal(timeout.outcome,'unknown');
  assert.equal(timeout.retryable,true);
});

test('Aşama 5.5: retrieve sağlayıcı lookup hatası SQL ile uyumlu unknown olarak kalır',async()=>{
  const result=await adapterFor({status:'failure',conversationId:context.conversationId,
    errorCode:'5087',errorMessage:'redacted',retryable:false}).retrieve(inputs.retrieve);
  assert.equal(result.outcome,'unknown');
  assert.equal(result.signatureVerified,false);
  assert.equal(result.retryable,false);
  assert.equal(result.errorCode,'5087');
});

test('Aşama 2: sağlayıcı referansları imza geçse bile yerel işlemle eşleşmelidir',async()=>{
  const cases=[
    ['authorize',signed('authorize',{basketId:'other-basket'}),'basket_reference_mismatch'],
    ['capture',signed('capture',{paymentId:'other-payment'}),'payment_reference_mismatch'],
    ['refund',signed('refund',{paymentTransactionId:'other-transaction'}),'transaction_reference_mismatch'],
    ['retrieve',signed('retrieve',{paymentId:'other-payment'}),'payment_reference_mismatch'],
  ];
  for(const [operation,response,code] of cases){
    const result=await adapterFor(response)[operation](inputs[operation]);
    assert.equal(result.outcome,'unknown');
    assert.equal(result.errorCode,code);
  }
});

test('Aşama 2: tutar, paidPrice, para birimi ve conversation uyuşmazlıkları unknown olur',async()=>{
  for(const response of [
    signed('authorize',{price:'11.00'}),
    signed('authorize',{paidPrice:'11.00'}),
    signed('authorize',{currency:'USD'}),
    signed('authorize',{conversationId:'different'}),
  ]){
    const result=await adapterFor(response).authorize(inputs.authorize);
    assert.equal(result.outcome,'unknown');
  }
});

test('Aşama 2: fraud incelemesi ve retrieve durumu dağıtılabilir başarı sayılmaz',async()=>{
  const review=await adapterFor(signed('authorize',{fraudStatus:0})).authorize(inputs.authorize);
  assert.equal(review.outcome,'unknown');
  assert.equal(review.errorCode,'provider_fraud_review');
  const fraudDecline=await adapterFor(signed('authorize',{fraudStatus:-1})).authorize(inputs.authorize);
  assert.equal(fraudDecline.outcome,'declined');
  assert.equal(fraudDecline.signatureVerified,true);
  const unresolved=await adapterFor(signed('retrieve',{paymentStatus:'CALLBACK_THREEDS'}))
    .retrieve(inputs.retrieve);
  assert.equal(unresolved.outcome,'unknown');
  const failed=await adapterFor(signed('retrieve',{paymentStatus:'FAILURE'})).retrieve(inputs.retrieve);
  assert.equal(failed.outcome,'declined');
  assert.equal(failed.signatureVerified,true);
});

test('Aşama 2: geçersiz yerel sepet tutarı sağlayıcı isteği oluşturmadan reddedilir',async()=>{
  let calls=0;
  const transport={post:async()=>{calls++;throw new Error('must not run');}};
  const adapter=new IyzicoSandboxAdapter(config,new IyzicoClient(transport));
  const bad={...inputs.authorize,basketItems:[{...inputs.authorize.basketItems[0],
    price:canonicalTryAmount('9.00')}]};
  const result=await adapter.authorize(bad);
  assert.equal(result.outcome,'unknown');
  assert.equal(result.errorCode,'invalid_operation_input');
  assert.equal(calls,0);
});

test('Aşama 2: HTTP 5xx içindeki görünen success veya failure kesin sonuç sayılmaz',async()=>{
  for(const body of [signed('authorize'),{status:'failure',conversationId:context.conversationId,
    errorCode:'temporary'}]){
    const result=await adapterFor(body,[],503).authorize(inputs.authorize);
    assert.equal(result.outcome,'unknown');
    assert.equal(result.retryable,true);
    assert.equal(result.errorCode,'provider_http_error');
  }
});
