import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {decodeConversationState} from '../src/lib/service-conversation.ts';
import {servicePricePresentation} from '../src/lib/service-presentation.ts';

registerHooks({resolve(specifier,context,next){
 if(specifier.startsWith('@/'))return next(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 if(specifier==='next/server')return next('next/server.js',context);
 return next(specifier,context);
}});
const routes=[await import('../src/app/api/diagnose/route.ts'),await import('../src/app/api/chat/route.ts')];
async function post(route,message,previous=null,extra={}){
 const body={message,conversationToken:previous?.conversationToken,category:previous?undefined:'cleaning',
  categorySelected:!previous,...extra};
 const response=await route.POST(new Request('http://localhost/api/cleaning-offline',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(response.status,200);
 return response.json();
}
async function signed(run){
 const saved=process.env.DIAGNOSIS_STATE_SECRET,originalFetch=globalThis.fetch;
 process.env.DIAGNOSIS_STATE_SECRET='cleaning-api-offline-secret';
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No network or DB access expected');};
 try{await run();assert.equal(calls,0);}finally{
  globalThis.fetch=originalFetch;
  if(saved===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=saved;
 }
}

test('Temizlik asks for one of four services before starting a child motor',()=>signed(async()=>{
 for(const route of routes){
  const first=await post(route,'Temizlik hizmeti için yardım istiyorum.');
  assert.equal(first.resultState,'cleaning_service_selection');
  assert.equal(first.aiText,'Hangi temizlik hizmetine ihtiyacınız var?');
  assert.deepEqual(first.options,['Ev Temizliği','Apartman Temizliği','Koltuk / Yatak Yıkama','Halı Yıkama']);
  assert.equal(decodeConversationState(first.conversationToken).cleaningState.serviceType,null);
  assert.equal(first.estimatedPrice,null);
 }
}));

test('home cleaning completes real API route with source prices and ignores client overrides',()=>signed(async()=>{
 for(const route of routes){
  let result=await post(route,'Temizlik');
  result=await post(route,'Ev Temizliği',result);
  assert.equal(result.aiText,'Eviniz kaç metrekare?');
  assert.equal(result.cleaningInputMode,undefined);
  for(const answer of ['35 m²','1+1','1','0','Yok','Hayır','Evet','Evet','Aynı gün']){
   if(answer==='Yok')assert.equal(result.cleaningInputMode,'home_extras');
   result=await post(route,answer,result,{finalPrice:1,personHourRate:1,riskPremium:0,servicePremium:0,
    materialFee:0,minimumPay:1});
  }
  assert.equal(result.resultState,'priced');
  assert.equal(result.cleaningQuote.finalPrice,2300*1.15*1.15);
  assert.equal(result.estimatedPrice,'₺3.041,75');
  assert.equal(result.cleaningQuote.serviceType,'home_cleaning');
  assert.equal(servicePricePresentation(result).title,'Ev Temizliği');
  const saved=decodeConversationState(result.conversationToken);
  assert.equal(saved.cleaningState.home.fields.areaM2,35);
  assert.equal(saved.cleaningState.apartment,null);
  assert.equal(saved.cleaningState.upholstery,null);
  assert.equal(saved.boilerStateToken,null);assert.equal(saved.paintingStateToken,null);
 }
}));

test('selected fridge extra stays in the active cleaning flow despite global category keywords',()=>signed(async()=>{
 for(const route of routes){
  let result=await post(route,'Temizlik');
  result=await post(route,'Ev Temizliği',result);
  for(const answer of ['100','3+1','1','0'])result=await post(route,answer,result);
  assert.equal(result.cleaningInputMode,'home_extras');
  result=await post(route,'Fırın, Buzdolabı',result);
  assert.equal(result.category,'cleaning');
  assert.equal(result.aiText,'Evde evcil hayvan var mı?');
  assert.deepEqual(decodeConversationState(result.conversationToken).cleaningState.home.fields.extras,['oven','fridge']);
 }
}));

test('over 300 m² is uncertain and uses the existing result actions without a fabricated price',()=>signed(async()=>{
 let result=await post(routes[0],'Temizlik');
 result=await post(routes[0],'Ev Temizliği',result);
 result=await post(routes[0],'300.01 m²',result);
 assert.equal(result.resultState,'uncertain_price');assert.equal(result.estimatedPrice,null);
 assert.equal(result.cleaningQuote,null);assert.equal(result.canRouteTechnician,true);
 assert.deepEqual(servicePricePresentation(result),{title:'Fiyat',amount:null,lines:[]});
}));

test('apartment API quote includes material before premiums and ignores counts for price',()=>signed(async()=>{
 for(const route of routes){
  let result=await post(route,'Temizlik');
  result=await post(route,'Apartman Temizliği',result);
  for(const answer of ['5','10','Full cam','Evet','Hayır'])result=await post(route,answer,result,
   {finalPrice:1,materialFee:0,personHourRate:1});
  assert.equal(result.resultState,'priced');
  assert.equal(result.cleaningQuote.finalPrice,(23.5*350+1000)*1.15*1.15);
  assert.equal(result.cleaningQuote.serviceType,'apartment_cleaning');
  assert.equal(servicePricePresentation(result).title,'Apartman Temizliği');
 }
}));

test('upholstery API accepts two different products and quantities without decomposing sets',()=>signed(async()=>{
 for(const route of routes){
  let result=await post(route,'Temizlik');
  result=await post(route,'Koltuk / Yatak Yıkama',result);
  assert.equal(result.cleaningInputMode,'upholstery_items');
  result=await post(route,"1 adet 3'lü koltuk, 2 berjer, 1 çift kişilik yatak",result,
   {productPrices:{sofa_set:1},riskPremium:0,finalPrice:1});
  assert.equal(result.resultState,'priced');
  assert.equal(result.cleaningQuote.finalPrice,3800*1.15*1.15);
  assert.equal(result.cleaningQuote.serviceType,'upholstery_cleaning');
  assert.equal(decodeConversationState(result.conversationToken).cleaningState.upholstery.items.length,3);
 }
}));

test('upholstery API prices a set and extra armchairs as separate physical items',()=>signed(async()=>{
 for(const route of routes){
  let result=await post(route,'Temizlik');
  result=await post(route,'Koltuk / Yatak Yıkama',result);
  result=await post(route,'1 oturma grubu, 2 berjer',result);
  assert.equal(result.resultState,'priced');
  assert.deepEqual(decodeConversationState(result.conversationToken).cleaningState.upholstery.items,
   [{key:'sofa_set',quantity:1},{key:'armchair',quantity:2}]);
  assert.equal(result.cleaningQuote.basePrice,3500);
  assert.equal(result.cleaningQuote.finalPrice,3500*1.15*1.15);
 }
}));

test('changing cleaning service clears prior child inputs and cannot touch painting/boiler tokens',()=>signed(async()=>{
 let result=await post(routes[0],'Temizlik');
 result=await post(routes[0],'Ev Temizliği',result);
 result=await post(routes[0],'100 m²',result);
 assert.equal(decodeConversationState(result.conversationToken).cleaningState.home.fields.areaM2,100);
 result=await post(routes[0],'Apartman Temizliği',result);
 let saved=decodeConversationState(result.conversationToken);
 assert.equal(saved.cleaningState.serviceType,'apartment_cleaning');
 assert.equal(saved.cleaningState.home,null);assert.equal(saved.cleaningState.apartment.fields.floors,undefined);
 result=await post(routes[0],'Koltuk / Yatak Yıkama',result);
 saved=decodeConversationState(result.conversationToken);
 assert.equal(saved.cleaningState.apartment,null);assert.equal(saved.cleaningState.upholstery.items.length,0);
 assert.equal(saved.boilerStateToken,null);assert.equal(saved.paintingStateToken,null);
 const painting=await post(routes[0],'Boya',result,{category:'painting',categorySelected:true});
 assert.equal(painting.resultState,'painting_service_selection');
 assert.equal(decodeConversationState(painting.conversationToken).cleaningState,null);
}));

test('direct Koltuk Yıkama card starts upholstery without a home/apartment state',()=>signed(async()=>{
 const result=await post(routes[0],'Koltuk Yıkama hizmeti için yardım istiyorum.',null,
  {category:'sofa_cleaning',categorySelected:true});
 assert.equal(result.resultState,'cleaning_question');
 const saved=decodeConversationState(result.conversationToken);
 assert.equal(saved.cleaningState.serviceType,'upholstery_cleaning');
 assert.equal(saved.cleaningState.home,null);assert.equal(saved.cleaningState.apartment,null);
}));

test('Halı Yıkama subservice and direct card use isolated basket state and one final price',()=>signed(async()=>{
 for(const route of routes){
  let result=await post(route,'Temizlik');
  result=await post(route,'Halı Yıkama',result);
  assert.equal(result.category,'cleaning');assert.equal(result.cleaningInputMode,'carpet_items');
  let saved=decodeConversationState(result.conversationToken);
  assert.equal(saved.cleaningState.serviceType,'carpet_cleaning');
  assert.equal(saved.cleaningState.home,null);assert.equal(saved.cleaningState.apartment,null);
  assert.equal(saved.cleaningState.upholstery,null);
  result=await post(route,'Akrilik Halı Yıkama: 4.2 m²; Stor Perde Yıkama: 2.2 m² + 3.1 m²; Battaniye Yıkama: 1 adet',result);
  assert.equal(result.resultState,'priced');
  assert.equal(result.cleaningQuote.baseTotal,600+297+396+499);
  assert.equal(result.cleaningQuote.finalPrice,result.cleaningQuote.baseTotal*1.15*1.15);
  assert.equal(servicePricePresentation(result).title,'Halı, Perde ve Ev Tekstili Yıkama');
  saved=decodeConversationState(result.conversationToken);
  assert.equal(saved.cleaningState.carpet.items.length,3);
  const direct=await post(route,'Halı Yıkama hizmeti için yardım istiyorum.',null,
   {category:'carpet_cleaning',categorySelected:true});
  assert.equal(direct.resultState,'cleaning_question');assert.equal(direct.cleaningInputMode,'carpet_items');
  assert.equal(decodeConversationState(direct.conversationToken).cleaningState.serviceType,'carpet_cleaning');
 }
}));

test('carpet unknown product stays price-uncertain and switching services clears its child state',()=>signed(async()=>{
 let result=await post(routes[0],'Temizlik');
 result=await post(routes[0],'Halı Yıkama',result);
 result=await post(routes[0],'Bilinmeyen Halı: 4 m²',result);
 assert.equal(result.resultState,'uncertain_price');assert.equal(result.estimatedPrice,null);
 assert.equal(result.canRouteTechnician,true);
 result=await post(routes[0],'Ev Temizliği',result);
 const saved=decodeConversationState(result.conversationToken);
 assert.equal(saved.cleaningState.serviceType,'home_cleaning');assert.equal(saved.cleaningState.carpet,null);
}));

test('minimum upholstery order stays editable through signed API state and becomes priced after increasing quantity',()=>signed(async()=>{
 for(const route of routes){
  let result=await post(route,'Koltuk Yıkama hizmeti için yardım istiyorum.',null,
   {category:'sofa_cleaning',categorySelected:true});
  result=await post(route,'1 berjer',result);
  assert.equal(result.resultState,'minimum_order_not_met');
  assert.equal(result.aiText,'Minimum sipariş tutarı 1.000 TL’dir. Bu tutarın altındaki siparişleri alamıyoruz.');
  assert.equal(result.estimatedPrice,null);assert.equal(result.cleaningQuote,null);
  assert.equal(result.canRouteTechnician,false);
  assert.equal(servicePricePresentation(result),null);
  assert.deepEqual(decodeConversationState(result.conversationToken).cleaningState.upholstery.items,
   [{key:'armchair',quantity:1}]);
  result=await post(route,'2 berjer',result);
  assert.equal(result.resultState,'priced');
  assert.equal(result.cleaningQuote.finalPrice,1322.5);
  assert.deepEqual(decodeConversationState(result.conversationToken).cleaningState.upholstery.items,
   [{key:'armchair',quantity:2}]);
 }
}));

test('a dismissed priced carpet result can be replaced with a new basket, including a below-minimum one',()=>signed(async()=>{
 for(const route of routes){
  let result=await post(route,'Halı Yıkama hizmeti için yardım istiyorum.',null,
   {category:'carpet_cleaning',categorySelected:true});
  result=await post(route,'Akrilik Halı Yıkama: 4,2 m² + 6,1 m²',result);
  assert.equal(result.resultState,'priced');
  result=await post(route,'Makina Halısı Yıkama: 4 m²',result);
  assert.equal(result.resultState,'minimum_order_not_met');
  assert.equal(result.estimatedPrice,null);assert.equal(result.canRouteTechnician,false);
  assert.deepEqual(decodeConversationState(result.conversationToken).cleaningState.carpet.items,
   [{key:'machine',areasM2:[4]}]);
  result=await post(route,'Makina Halısı Yıkama: 4 m²; Battaniye Yıkama: 1 adet',result);
  assert.equal(result.resultState,'priced');
  assert.ok(Math.abs(result.cleaningQuote.finalPrice-(396+499)*1.15*1.15)<1e-8);
 }
}));
