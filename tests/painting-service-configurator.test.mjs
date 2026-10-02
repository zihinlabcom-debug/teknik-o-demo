import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DYO_READY_COLORS} from '../src/lib/painting-color-catalog-dyo.ts';
import {diagnosePainting,decodePaintingState,availablePaintingTypes} from '../src/lib/painting-engine.ts';
import {servicePricePresentation} from '../src/lib/service-presentation.ts';

const {PaintingServiceConfigurator,EMPTY_PAINTING_SELECTION,paintingSelectionSteps,paintingPaintOptions}=
 await import('../src/components/painting-service-configurator.tsx');
const complete={...EMPTY_PAINTING_SELECTION,serviceType:'Duvar Boyama',scopeType:'complete_home',
 netAreaM2:'100',paintedRoomCount:3,furnished:true,ceilingHeightMode:'standard',surfaces:'walls',
 surfaceType:'old_painted',repairStatus:'none',oldColorTone:'dark',newColorTone:'light',
 paintType:'silicone_matte',colorSelectionSource:'manual',paintBrand:'Filli Boya',colorCode:'Rezene 190'};
const render=(selection=EMPTY_PAINTING_SELECTION,overrides={})=>renderToStaticMarkup(createElement(PaintingServiceConfigurator,{
 selection,onChange(){},serviceOptions:['Duvar Boyama','Mobilya Boyama','Dış Cephe Boyama'],
 onSelectService(){},onSelectColorSource(){},onCalculate(){},onConfirmColor(){},onChangeColor(){},
 ready:true,busy:false,finished:false,result:null,onRequestTechnician(){},onReject(){},...overrides,
}));
const calculate=html=>html.match(/<button[^>]*>(?:Fiyatı Hesapla|Hesaplanıyor…)<\/button>/)?.[0]??'';
async function run(selection){
 const original=process.env.DIAGNOSIS_STATE_SECRET;
 process.env.DIAGNOSIS_STATE_SECRET='painting-form-offline-test-secret';
 try{
  let result=await diagnosePainting('Boya hizmeti istiyorum',[],null);
  const trace=[];
  for(const step of paintingSelectionSteps(selection)??[]){
   const previous=result.answeredSystemQuestions;
   result=await diagnosePainting(step.answer,[],result.stateToken);
   trace.push(result);
   assert.equal(result.answeredSystemQuestions,previous+step.expectedDelta,step.answer);
  }
  return {result,trace,fields:decodePaintingState(result.stateToken).fields};
 }finally{
  if(original===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;
  else process.env.DIAGNOSIS_STATE_SECRET=original;
 }
}

test('painting uses the shared configurator with all three real service choices and no chat composer',()=>{
 const html=render();
 for(const text of ['Hangi boya hizmetine ihtiyacınız var?','Duvar Boyama','Mobilya Boyama',
  'Dış Cephe Boyama','Hizmet özeti','Sipariş özetini göster'])assert.ok(html.includes(text),text);
 for(const hidden of ['Mesajınızı yazın','Dosya / Foto','Sıfırla','<textarea'])assert.ok(!html.includes(hidden),hidden);
 assert.ok(!html.includes('Evin net kullanım alanı kaç m²?'));
 assert.ok(calculate(html)==='');
});

test('painting form renders scope, area, room count, furnishing, height, wall surface, repair, tones and paint',()=>{
 const html=render(complete);
 for(const text of ['Hizmet Kapsamı','Boyanacak Alan','Renk ve Boya','Evin net kullanım alanı kaç m²?',
  'Salon sayılmayacak','Oda artır','Oda azalt','Eşyalı','Boş','Tavan yüksekliği',
  'Standart — 2,50 m','Başka — Belirtiniz','Duvarlar ve tavan','Eski boyalı',
  'Geniş alan macun düzeltmesi var','Açık','Koyu','Silikonlu mat','Marka','Renk kodu',
  'Fiyatı Hesapla'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('Tavan yüksekliğini belirtiniz'));
 assert.ok(!calculate(html).includes('disabled=""'));
 assert.ok(calculate(render(complete,{busy:true})).includes('disabled=""'));
 assert.ok(calculate(render(complete,{finished:true})).includes('disabled=""'));
 for(const surface of ['old_painted','new_plaster','satin_plaster_drywall'])
  assert.deepEqual(paintingPaintOptions(surface).map(option=>option.value),availablePaintingTypes(surface));
});

test('standard ceiling height sends 2.5; custom height opens a decimal field and sends 3.1',async()=>{
 const standard=paintingSelectionSteps(complete);
 assert.equal(standard[4].answer,'2,5 metre');
 assert.equal((await run(complete)).fields.ceilingHeightM,2.5);
 const custom={...complete,ceilingHeightMode:'custom',customCeilingHeight:'3,10'};
 const html=render(custom);
 assert.ok(html.includes('Tavan yüksekliğini belirtiniz'));
 assert.ok(html.includes('placeholder="Örn. 3,10"'));
 assert.ok(html.includes('inputMode="decimal"'));
 assert.equal(paintingSelectionSteps(custom)[4].answer,'3,1 metre');
 assert.equal((await run(custom)).fields.ceilingHeightM,3.1);
 assert.equal(paintingSelectionSteps({...custom,customCeilingHeight:''}),null);
 assert.ok(calculate(render({...custom,customCeilingHeight:''})).includes('disabled=""'));
 assert.equal(paintingSelectionSteps({...complete,ceilingHeightMode:'custom',customCeilingHeight:''}),null);
 assert.equal(paintingSelectionSteps({...custom,ceilingHeightMode:'standard'})[4].answer,'2,5 metre');
});

test('only-ceiling stops before wall questions; wide putty is conditional; serious damage stays manual review',async()=>{
 const ceiling={...complete,surfaces:'ceiling'};
 const ceilingHtml=render(ceiling);
 for(const hidden of ['Duvarların mevcut yüzeyi hangisi?','Renk ve Boya','DYO renk kataloğu',
  'Macun düzeltmesi gereken yaklaşık alan'])assert.ok(!ceilingHtml.includes(hidden),hidden);
 assert.equal(paintingSelectionSteps(ceiling).length,6);
 assert.equal((await run(ceiling)).result.resultState,'priced');
 const putty={...complete,repairStatus:'wide_putty',extraPuttyM2:'10'};
 assert.ok(render(putty).includes('Macun düzeltmesi gereken yaklaşık alan kaç m²?'));
 assert.equal(paintingSelectionSteps({...putty,extraPuttyM2:''}),null);
 assert.equal((await run(putty)).fields.extraPuttyM2,10);
 const serious={...complete,repairStatus:'serious_plaster_damage'};
 assert.ok(!render(serious).includes('Renk ve Boya'));
 assert.equal(paintingSelectionSteps(serious).length,8);
 const result=await run(serious);
 assert.equal(result.result.resultState,'painting_manual_review');
 assert.equal(result.result.estimatedPrice,null);
});

test('manual brand/code and DYO catalog follow the existing confirmation and pricing transitions',async()=>{
 const manual=await run(complete);
 assert.equal(manual.result.resultState,'priced');
 assert.equal(manual.fields.paintBrand,'Filli Boya');
 assert.equal(manual.fields.colorCode,'Rezene 190');
 const dyo={...complete,colorSelectionSource:'dyo_catalog',selectedDyoColor:DYO_READY_COLORS[0]};
 const html=render(dyo);
 assert.ok(html.includes('DYO renk kataloğu'));
 assert.ok(html.includes('Renk adı veya kodu ara'));
 assert.ok(!html.includes('max-h-64'));
 const choice=paintingSelectionSteps(dyo).at(-2);
 assert.deepEqual(choice,{answer:'DYO renk kataloğundan seç',expectedDelta:0,kind:'catalog_choice'});
 const selected=await run(dyo);
 assert.equal(selected.trace.at(-2).resultState,'painting_color_catalog');
 assert.equal(selected.result.resultState,'painting_color_confirmation');
 assert.equal(selected.fields.paintBrand,'DYO');
 assert.equal(selected.fields.colorCode,dyo.selectedDyoColor.colorCode);
 const confirmed=await diagnoseWithToken('Bu renkle devam et',selected.result.stateToken);
 assert.equal(confirmed.resultState,'priced');
 const confirmationHtml=render(dyo,{awaitingColorConfirmation:true});
 assert.ok(confirmationHtml.includes('Bu renkle devam edelim mi?'));
 assert.ok(confirmationHtml.includes('Evet, devam et'));
 assert.ok(confirmationHtml.includes('Rengi değiştir'));
});

async function diagnoseWithToken(answer,token){
 const original=process.env.DIAGNOSIS_STATE_SECRET;
 process.env.DIAGNOSIS_STATE_SECRET='painting-form-offline-test-secret';
 try{return await diagnosePainting(answer,[],token);}finally{
  if(original===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;
  else process.env.DIAGNOSIS_STATE_SECRET=original;
 }
}

test('priced and manual-review outcomes reuse the shared result card',()=>{
 const priced=servicePricePresentation({category:'painting',resultState:'priced',estimatedPrice:'₺20.000',
  pricingData:null,deterministicOMF:null,paintingQuote:{finalPrice:20000}});
 const pricedHtml=render(complete,{finished:true,result:priced});
 assert.ok(pricedHtml.includes('₺20.000'));
 assert.ok(pricedHtml.includes('Usta çağır'));
 assert.ok(pricedHtml.includes('Talebi reddet'));
 const review=servicePricePresentation({category:'painting',resultState:'painting_manual_review',
  estimatedPrice:null,pricingData:null,deterministicOMF:null,paintingQuote:null});
 const reviewHtml=render({...complete,repairStatus:'serious_plaster_damage'},{finished:true,result:review,
  resultExplanation:'Ciddi sıva veya derin hasar standart Boya V1 fiyatına dahil değil. Yerinde inceleme gerekir.'});
 assert.ok(reviewHtml.includes('Belirsiz'));
 assert.ok(reviewHtml.includes('standart Boya V1 fiyatına dahil değil'));
 assert.ok(reviewHtml.includes('Usta çağır'));
 assert.ok(reviewHtml.includes('Talebi reddet'));
});
