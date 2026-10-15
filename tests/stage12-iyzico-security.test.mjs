import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {parseIyzicoSandboxConfig,IYZICO_SANDBOX_ORIGIN} from '../apps/customer/src/lib/finance/iyzico/iyzico-config-contract.ts';
import {canonicalTryAmount,tryAmountToMinorUnits} from '../apps/customer/src/lib/finance/iyzico/iyzico-money.ts';
import {createIyzicoAuthorization} from '../apps/customer/src/lib/finance/iyzico/iyzico-signature.ts';
import {computeIyzicoResponseSignature,verifyIyzicoResponseSignature} from '../apps/customer/src/lib/finance/iyzico/iyzico-response-signature.ts';
import {sanitizeIyzicoLog} from '../apps/customer/src/lib/finance/iyzico/iyzico-sanitizer.ts';
import {IyzicoHttpTransport,IYZICO_ENDPOINTS} from '../apps/customer/src/lib/finance/iyzico/iyzico-transport.ts';

const env={IYZICO_SANDBOX_API_KEY:'sandbox-api-key-test',IYZICO_SANDBOX_SECRET_KEY:'sandbox-secret-key-test'};
const config=parseIyzicoSandboxConfig(env);

function isIyzicoError(expectedCode,{retryable}={}){
  return error=>error?.name==='IyzicoError'&&error?.kind==='unknown'&&error?.code===expectedCode&&
    (retryable===undefined||error?.retryable===retryable);
}

test('Aşama 1: config yalnız resmi Sandbox origin ve sandbox kimlik bilgilerini kabul eder',()=>{
  assert.equal(config.baseUrl,IYZICO_SANDBOX_ORIGIN);
  for(const invalid of [
    {...env,IYZICO_BASE_URL:'https://api.iyzipay.com'},
    {...env,IYZICO_BASE_URL:'https://sandbox-api.iyzipay.com.evil.test'},
    {...env,IYZICO_BASE_URL:'https://sandbox-api.iyzipay.com/payment'},
    {...env,IYZICO_SANDBOX_API_KEY:'live-key'},
    {...env,IYZICO_SANDBOX_SECRET_KEY:undefined},
  ])assert.throws(()=>parseIyzicoSandboxConfig(invalid));
});

test('Aşama 1: HMAC-SHA256 tam gönderilen gövde ve URI path üzerinden hesaplanır',()=>{
  const body='{"conversationId":"op-1","price":"10.00"}';
  const randomKey='fixed-random-key';
  const result=createIyzicoAuthorization(config,randomKey,IYZICO_ENDPOINTS.authorize,body);
  const expected=createHmac('sha256',config.secretKey)
    .update(randomKey+IYZICO_ENDPOINTS.authorize+body).digest('hex');
  assert.equal(result.signature,expected);
  const decoded=Buffer.from(result.authorization.slice('IYZWSv2 '.length),'base64').toString('utf8');
  assert.equal(decoded,`apiKey:${config.apiKey}&randomKey:${randomKey}&signature:${expected}`);
});

test('Aşama 1: transport imzaladığı JSON metninin aynısını gönderir ve ağ dışına çıkmaz',async()=>{
  let observed;
  const fakeFetch=async(url,init)=>{
    observed={url,init};
    return new Response(JSON.stringify({status:'failure',errorCode:'declined'}),{
      status:200,headers:{'content-type':'application/json'},
    });
  };
  const transport=new IyzicoHttpTransport(config,fakeFetch,()=> 'fixed-key');
  const payload={conversationId:'operation-1',price:'10.00'};
  const result=await transport.post(IYZICO_ENDPOINTS.authorize,payload);
  assert.equal(observed.url,`${IYZICO_SANDBOX_ORIGIN}${IYZICO_ENDPOINTS.authorize}`);
  const sentBody=String(observed.init.body);
  assert.equal(sentBody,JSON.stringify(payload));
  assert.equal('serializedRequest' in result,false);
  assert.equal(result.trust,'pinned_https_sandbox');
  assert.equal(observed.init.redirect,'error');
  const decoded=Buffer.from(String(observed.init.headers.authorization).slice('IYZWSv2 '.length),'base64').toString('utf8');
  const expected=createHmac('sha256',config.secretKey)
    .update('fixed-key'+IYZICO_ENDPOINTS.authorize+sentBody).digest('hex');
  assert.equal(decoded,'apiKey:'+config.apiKey+'&randomKey:fixed-key&signature:'+expected);
  await assert.rejects(transport.post('/unapproved/path',payload));
});

test('Aşama 1: yanıt imzası işlem sırasına ve tutar normalizasyonuna göre doğrulanır',()=>{
  const response={paymentId:'p-1',currency:'TRY',basketId:'b-1',conversationId:'c-1',
    paidPrice:'10.00',price:10};
  const signature=computeIyzicoResponseSignature('authorize',response,config.secretKey);
  assert.equal(signature,createHmac('sha256',config.secretKey).update('p-1:TRY:b-1:c-1:10:10').digest('hex'));
  assert.equal(verifyIyzicoResponseSignature('authorize',{...response,signature},config.secretKey),true);
  assert.equal(verifyIyzicoResponseSignature('authorize',{...response,signature:'0'.repeat(64)},config.secretKey),false);
  assert.equal(verifyIyzicoResponseSignature('authorize',response,config.secretKey),false);
});

test('Aşama 1: log sanitizasyonu secret, Authorization ve kart verisini dışarı taşımaz',()=>{
  const value=sanitizeIyzicoLog({operation:'authorize',httpStatus:500,
    apiKey:config.apiKey,secretKey:config.secretKey,authorization:'IYZWSv2 secret',
    cardNumber:'5528790000000008',errorCode:`failed-${config.secretKey}`,
  },[config.apiKey,config.secretKey]);
  const serialized=JSON.stringify(value);
  assert.deepEqual(Object.keys(value).sort(),['errorCode','httpStatus','operation']);
  assert.doesNotMatch(serialized,/sandbox-api-key|sandbox-secret-key|552879|IYZWSv2/);
});

test('Aşama 1: tutarlar kanonik metin ve kuruş cinsinden tam sayı olarak tutulur',()=>{
  assert.equal(canonicalTryAmount('350'),'350.00');
  assert.equal(canonicalTryAmount('350.5'),'350.50');
  assert.equal(tryAmountToMinorUnits(canonicalTryAmount('350.05')),BigInt(35005));
  for(const bad of ['0','-1','1.001','01.00','NaN','Infinity'])assert.throws(()=>canonicalTryAmount(bad));
});

test('Aşama 1: bağlantı timeout ve bozuk yanıt kesin başarısız değil unknown sonucudur',async()=>{
  const timeoutConfig={...config,timeoutMs:20};
  const hangingFetch=async(_url,init)=>new Promise((_resolve,reject)=>{
    init.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});
  });
  await assert.rejects(new IyzicoHttpTransport(timeoutConfig,hangingFetch).post(
    IYZICO_ENDPOINTS.authorize,{conversationId:'c'}),isIyzicoError('iyzico_transport_unknown',{retryable:true}));
  const invalidJson=async()=>new Response('<html>bad gateway</html>',{status:502});
  await assert.rejects(new IyzicoHttpTransport(config,invalidJson).post(
    IYZICO_ENDPOINTS.authorize,{conversationId:'c'}),isIyzicoError('iyzico_invalid_json',{retryable:false}));
});

test('Aşama 1: başlıklar geldikten sonra duran yanıt gövdesi de timeout ile unknown olur',async()=>{
  const timeoutConfig={...config,timeoutMs:20};
  const stalledBody=async()=>new Response(new ReadableStream({pull(){return new Promise(()=>{});}}),{status:200});
  await assert.rejects(new IyzicoHttpTransport(timeoutConfig,stalledBody).post(
    IYZICO_ENDPOINTS.authorize,{conversationId:'c'}),isIyzicoError('iyzico_transport_unknown',{retryable:true}));
});

test('Aşama 1: yanıt gövdesi okuma hatası güvenli unknown sonucuna çevrilir',async()=>{
  const brokenBody=async()=>new Response(new ReadableStream({pull(controller){
    controller.error(new Error('stream failed'));
  }}),{status:200});
  await assert.rejects(new IyzicoHttpTransport(config,brokenBody).post(
    IYZICO_ENDPOINTS.authorize,{conversationId:'c'}),isIyzicoError('iyzico_transport_unknown',{retryable:true}));
});

test('Aşama 1: Content-Length olmadan gelen büyük gövde akış sırasında durdurulur',async()=>{
  const smallLimit={...config,maxResponseBytes:16};
  const oversized=async()=>new Response(new Uint8Array(17),{status:200});
  await assert.rejects(new IyzicoHttpTransport(smallLimit,oversized).post(
    IYZICO_ENDPOINTS.authorize,{conversationId:'c'}),isIyzicoError('iyzico_response_too_large',{retryable:false}));
});
