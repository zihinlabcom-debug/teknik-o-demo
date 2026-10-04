import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {decodePaintingState} from '../src/lib/painting-engine.ts';
import {decodeConversationState} from '../src/lib/service-conversation.ts';
import {servicePricePresentation} from '../src/lib/service-presentation.ts';

registerHooks({resolve(specifier,context,next){
 if(specifier==='@/lib/account-supabase')return next(new URL('./helpers/account-supabase-authenticated.mjs',import.meta.url).href,context);
 if(specifier.startsWith('@/'))return next(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 if(specifier==='next/server')return next('next/server.js',context);
 return next(specifier,context);
}});
const routes=[await import('../src/app/api/diagnose/route.ts'),await import('../src/app/api/chat/route.ts')];
async function post(route,body){
 const reply=await route.POST(new Request('http://localhost/api/painting-offline',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify(body)}));assert.equal(reply.status,200);return reply.json();
}
test('both actual API routes complete a painting quote without network calls or accepting client price/poz fields',async()=>{
 const secret=process.env.DIAGNOSIS_STATE_SECRET,originalFetch=globalThis.fetch;
 process.env.DIAGNOSIS_STATE_SECRET='painting-api-test-secret';
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Painting must not call a network provider');};
 try{
  for(const route of routes){
   let result=await post(route,{message:'3+1 100 metrekare evimi boyatmak istiyorum',
    finalPrice:1,referenceCost:1,selectedWallPozId:'forged'});
   assert.equal(result.category,'painting');assert.equal(result.resultState,'painting_service_selection');
   assert.deepEqual(result.options,['Duvar Boyama','Mobilya Boyama','Dış Cephe Boyama']);
   assert.equal(result.stateToken,null);
   assert.equal(decodeConversationState(result.conversationToken).paintingServiceType,null);
   result=await post(route,{message:'Duvar Boyama',conversationToken:result.conversationToken});
   assert.equal(result.resultState,'painting_question');
   assert.equal(decodePaintingState(result.stateToken).fields.netAreaM2,100);
   assert.equal(decodePaintingState(result.stateToken).fields.paintWalls,undefined);
   assert.equal(decodeConversationState(result.conversationToken).paintingServiceType,'wall_painting');
   assert.equal(result.answeredSystemQuestions,0);assert.equal(result.visualProgress,0);
   for(const [i,answer] of ['Komple ev','3','Eşyalı','2,5 metre','Yalnız duvarlar','Eski boyalı','Yok',
     'Koyu','Açık','Silikonlu mat','Duo - 6269 Denizaltı'].entries()){
    result=await post(route,{message:answer,conversationToken:result.conversationToken,stateToken:result.stateToken,
     turnId:`paint-${i}`,finalPrice:1,referenceCost:1,selectedWallPozId:'forged',riskPremium:-99999});
   }
   assert.equal(result.resultState,'priced');assert.equal(result.category,'painting');
   assert.equal(result.estimatedPrice,'46.011,34 TL');assert.equal(result.paintingQuote.finalPrice,46011.34);
   assert.equal(result.paintingQuote.selectedWallPozId,'B13_F23');
   assert.equal(result.paintingQuote.referenceCost,35393.34);assert.equal(result.visualProgress,100);
   assert.deepEqual(servicePricePresentation(result),{title:'Nihai boya hizmeti fiyatı',amount:'46.011,34 TL',lines:[]});
   const stored=decodeConversationState(result.conversationToken);
   assert.equal(stored.boilerStateToken,null);assert.ok(stored.paintingStateToken.startsWith('painting.'));
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=originalFetch;
  if(secret===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=secret;}
});
test('both painting API routes retain manual review without a price and expose the shared result card',async()=>{
 const secret=process.env.DIAGNOSIS_STATE_SECRET;
 process.env.DIAGNOSIS_STATE_SECRET='painting-manual-review-api-secret';
 try{
  for(const route of routes){
   let result=await post(route,{message:'Boya',category:'painting',categorySelected:true});
   result=await post(route,{message:'Duvar Boyama',conversationToken:result.conversationToken});
   for(const answer of ['Komple ev','100 m²','3','Boş','2,5 metre','Yalnız duvarlar','Eski boyalı','Ciddi sıva / derin hasar var'])
    result=await post(route,{message:answer,conversationToken:result.conversationToken,stateToken:result.stateToken});
   assert.equal(result.resultState,'painting_manual_review');
   assert.equal(result.aiText,'Ciddi sıva veya derin hasar standart Boya V1 fiyatına dahil değil. Yerinde inceleme gerekir.');
   assert.equal(result.estimatedPrice,null);assert.equal(result.paintingQuote,null);
   assert.equal(result.isReadyForPrice,false);
   assert.deepEqual(servicePricePresentation(result),{title:'Fiyat',amount:null,lines:[]});
  }
 }finally{
  if(secret===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=secret;
 }
});
test('category confirmation carries a prior floor-area observation into the painting engine',async()=>{
 const secret=process.env.DIAGNOSIS_STATE_SECRET;process.env.DIAGNOSIS_STATE_SECRET='painting-api-context-secret';
 try{
  const first=await post(routes[0],{message:'100 metrekare evimi boyatmak ve temizletmek istiyorum'});
  assert.equal(first.resultState,'category_clarification');
  const second=await post(routes[0],{message:'Boya',category:'painting',categorySelected:true,
   conversationToken:first.conversationToken});
  assert.equal(second.category,'painting');assert.equal(second.resultState,'painting_service_selection');
  const third=await post(routes[0],{message:'Duvar Boyama',conversationToken:second.conversationToken});
  assert.equal(decodePaintingState(third.stateToken).fields.netAreaM2,100);
  assert.match(third.aiText,/Boya işi komple ev için mi/);
 }finally{if(secret===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=secret;}
});
test('both API routes validate DYO catalog codes and carry the confirmed source color into the unchanged quote',async()=>{
 const secret=process.env.DIAGNOSIS_STATE_SECRET,originalFetch=globalThis.fetch;
 process.env.DIAGNOSIS_STATE_SECRET='painting-dyo-api-secret';
 let networkCalls=0;globalThis.fetch=async()=>{networkCalls++;throw Error('Catalog must be offline');};
 try{
  for(const route of routes){
   let result=await post(route,{message:'Boya',category:'painting',categorySelected:true});
   result=await post(route,{message:'Duvar Boyama',conversationToken:result.conversationToken});
   for(const answer of ['Komple ev','100 m²','3','Eşyalı','2,5 metre','Yalnız duvarlar',
    'Eski boyalı','Yok','Koyu','Açık','Silikonlu mat'])
    result=await post(route,{message:answer,conversationToken:result.conversationToken});
   assert.equal(result.aiText,'Boya markası ve renk kodu nedir?');
   assert.deepEqual(result.options,['DYO renk kataloğundan seç','Marka ve renk kodunu kendim yazacağım']);
   result=await post(route,{message:'DYO renk kataloğundan seç',conversationToken:result.conversationToken});
   assert.equal(result.resultState,'painting_color_catalog');
   assert.equal(decodePaintingState(result.stateToken).fields.colorCode,undefined);
   result=await post(route,{message:'DYO renk kodu: 9999',conversationToken:result.conversationToken,
    colorCode:'6269',colorName:'DENİZ ATI',previewHex:'#000000'});
   assert.equal(result.resultState,'painting_color_catalog');
   assert.equal(decodePaintingState(result.stateToken).fields.colorCode,undefined);
   result=await post(route,{message:'DYO renk kodu: 6269',conversationToken:result.conversationToken,
    colorName:'SAHTE',previewHex:'#000000'});
   assert.equal(result.resultState,'painting_color_confirmation');
   assert.match(result.aiText,/DYO — DENİZ ATI — 6269/);
   const fields=decodePaintingState(result.stateToken).fields;
   assert.equal(fields.paintBrand,'DYO');assert.equal(fields.colorCode,'6269');
   assert.equal(fields.colorName,'DENİZ ATI');assert.equal(fields.colorSelectionSource,'dyo_catalog');
   result=await post(route,{message:'Bu renkle devam et',conversationToken:result.conversationToken});
   assert.equal(result.resultState,'priced');assert.equal(result.estimatedPrice,'46.011,34 TL');
  }
  assert.equal(networkCalls,0);
 }finally{globalThis.fetch=originalFetch;
  if(secret===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=secret;}
});
