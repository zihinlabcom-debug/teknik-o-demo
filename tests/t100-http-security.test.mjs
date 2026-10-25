import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){if(specifier==='server-only')return {url:'data:text/javascript,export%20{}',shortCircuit:true};return nextResolve(specifier,context);}});
const {assertT100Origin,t100Rpc,T100Error}=await import('../src/lib/t100-rpc.ts');
const request=(origin,site='same-origin')=>new Request('http://127.0.0.1:4100/api/t100/requests/test',{method:'POST',headers:{...(origin?{origin}:{}),'sec-fetch-site':site}});
test('T100 same-origin request accepted',()=>assert.doesNotThrow(()=>assertT100Origin(request('http://127.0.0.1:4100'))));
for(const [origin,site]of [[null,'same-origin'],['https://other.invalid','cross-site'],['http://127.0.0.1:4101','same-origin'],['http://127.0.0.1:4100','same-site']])
 test('T100 forged/missing origin denied '+origin+':'+site,()=>assert.throws(()=>assertT100Origin(request(origin,site)),e=>e instanceof T100Error&&e.status===403));
test('T100 DB error details never leak through safe public error',async()=>{const db={rpc:async()=>({data:null,error:{message:'T100 policy changed; reconfirm PRIVATE_DETAIL'}})};await assert.rejects(()=>t100Rpc(db,'test',{}),e=>e.status===409&&!e.message.includes('PRIVATE_DETAIL'));});
test('T100 unauthorized DB scope remains 403',async()=>{const db={rpc:async()=>({data:null,error:{message:'T100 forbidden'}})};await assert.rejects(()=>t100Rpc(db,'test',{}),e=>e.status===403);});
test('T100 unavailable DB error fails closed without synthetic success',async()=>{const db={rpc:async()=>({data:null,error:{message:'some database failure PRIVATE'}})};await assert.rejects(()=>t100Rpc(db,'test',{}),e=>e.status===503&&!e.message.includes('PRIVATE'));});

test('server-configured origin handles internal Next URL without trusting request headers',()=>{
 const r=new Request('http://localhost:4100/api/t100',{method:'POST',headers:{origin:'http://127.0.0.1:4100','sec-fetch-site':'same-origin','x-forwarded-host':'evil.invalid',host:'evil.invalid'}});
 assert.doesNotThrow(()=>assertT100Origin(r,'http://127.0.0.1:4100'));
 assert.throws(()=>assertT100Origin(r,'https://expected.invalid'),e=>e.status===403);
});
for(const origin of ['http://nonlocal.invalid','https://valid.invalid/extra','https://user:secret@valid.invalid','https://valid.invalid?x=1',''])test('unsafe server Origin configuration fails closed '+origin,()=>assert.throws(()=>assertT100Origin(request('http://127.0.0.1:4100'),origin),e=>e.status===503));
