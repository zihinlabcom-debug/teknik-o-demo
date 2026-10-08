import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acceptedMaximumPrice} from '../src/lib/service-request-accepted-price.ts';

const conversation=(category,final)=>({category,lastResponse:{assessmentComplete:true,
  canRouteTechnician:true,...final}});

test('priced painting uses the signed final quote, rounded service fee and exact total',()=>{
  const quote={referenceCost:1000,riskPremium:150,serviceFee:150.004,
    wallAreaM2:20,finalPrice:1300};
  const result=acceptedMaximumPrice(conversation('painting',{
    resultState:'priced',paintingQuote:quote}));
  assert.deepEqual(result,{currency:'TRY',subtotal:1150,serviceFee:150,totalAmount:1300,
    breakdown:{source:'painting_quote',...quote}});
});

test('priced cleaning and upholstery do not invent a service fee',()=>{
  for(const category of ['cleaning','sofa_cleaning','carpet_cleaning']){
    const quote={serviceType:'home_cleaning',finalPrice:3041.75,personnel:2};
    const result=acceptedMaximumPrice(conversation(category,{resultState:'priced',cleaningQuote:quote}));
    assert.equal(result.totalAmount,3041.75);
    assert.equal(result.subtotal,3041.75);
    assert.equal(result.serviceFee,0);
    assert.deepEqual(result.breakdown,{source:'cleaning_quote',...quote});
  }
});

test('boiler needs verified routing and deterministic OMF, not a relative candidate price',()=>{
  const final={resultState:'priced_candidate',isReadyForPrice:true,
    priceSource:{sku:'TEST'},technicalSource:{title:'Verified',url:'https://example.test'},
    deterministicOMF:{breakdown:{OMF:3000,risk:600,service:540,total:4140},warrantyDays:90}};
  const result=acceptedMaximumPrice(conversation('boiler',final));
  assert.equal(result.totalAmount,4140);
  assert.equal(result.serviceFee,540);
  assert.equal(result.subtotal,3600);
  assert.deepEqual(result.breakdown,{source:'deterministic_omf',OMF:3000,risk:600,
    service:540,total:4140,warrantyDays:90});
  for(const missing of ['priceSource','technicalSource','deterministicOMF']){
    assert.equal(acceptedMaximumPrice(conversation('boiler',{...final,[missing]:null})),null);
  }
  assert.equal(acceptedMaximumPrice(conversation('boiler',{...final,canRouteTechnician:false})),null);
});

test('manual review, uncertainty and incomplete or invalid prices have no accepted amount',()=>{
  const cases=[
    conversation('painting',{resultState:'painting_manual_review',paintingQuote:{finalPrice:100}}),
    conversation('boiler',{resultState:'uncertain_price',isReadyForPrice:true,
      deterministicOMF:{breakdown:{total:100,service:20}}}),
    conversation('boiler',{resultState:'pricing_missing'}),
    conversation('painting',{resultState:'priced',paintingQuote:null}),
    conversation('painting',{resultState:'priced',paintingQuote:{finalPrice:NaN,serviceFee:10}}),
    conversation('painting',{resultState:'priced',paintingQuote:{finalPrice:10,serviceFee:-1}}),
    conversation('cleaning',{resultState:'priced',cleaningQuote:{finalPrice:Infinity}}),
    conversation('cleaning',{assessmentComplete:false,resultState:'priced',cleaningQuote:{finalPrice:100}}),
  ];
  for(const item of cases)assert.equal(acceptedMaximumPrice(item),null);
});

test('request endpoint accepts only a signed conversation token, never a client price',()=>{
  const route=readFileSync(new URL('../src/app/api/operations/requests/route.ts',import.meta.url),'utf8');
  const server=readFileSync(new URL('../src/lib/operation-server.ts',import.meta.url),'utf8');
  const dialog=readFileSync(new URL('../src/components/service-result.tsx',import.meta.url),'utf8');
  const detail=readFileSync(new URL('../src/app/musteri/taleplerim/[id]/page.tsx',import.meta.url),'utf8');
  assert.match(route,/conversationToken/);
  assert.doesNotMatch(route,/body\.(?:price|totalAmount|breakdown|serviceFee)/);
  assert.match(server,/acceptedMaximumPrice\(conversation\)/);
  assert.match(server,/create_priced_service_request/);
  assert.doesNotMatch(server,/input\.(?:price|totalAmount|breakdown|serviceFee)/);
  assert.match(dialog,/maksimum fiyatı kabul etmiş olursunuz/);
  assert.match(detail,/offered&&!accepted/);
});

test('forward migration creates an atomic service-role-only accepted quote path',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261005122856_stage3_accepted_maximum_price.sql',import.meta.url),'utf8');
  assert.match(sql,/public\.create_service_request\(/);
  assert.match(sql,/public\.accept_service_quote\(/);
  assert.match(sql,/where r\.id=v_request_id for update/);
  assert.match(sql,/where q\.service_request_id=v_request_id and q\.status='accepted'/);
  assert.match(sql,/security definer set search_path=''/);
  assert.match(sql,/grant execute on function public\.create_priced_service_request/);
  assert.match(sql,/to service_role/);
  assert.doesNotMatch(sql,/to authenticated|to anon/);
});
