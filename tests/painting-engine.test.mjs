import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAINTING_POSITIONS,PAINTING_SOURCE_SHA256,EXTRA_PUTTY_PRICE_M2,MARKET_COST_FACTOR,OLD_PAINTED_CEILING_POZ} from '../src/lib/painting-price-data.ts';
import {calculatePaintingPrice,diagnosePainting,decodePaintingState,availablePaintingTypes} from '../src/lib/painting-engine.ts';
import {diagnoseService,decodeConversationState} from '../src/lib/service-conversation.ts';
import {servicePricePresentation,visualProgress} from '../src/lib/service-presentation.ts';
const source=JSON.parse(readFileSync(new URL('./fixtures/painting-workbook-source.json',import.meta.url),'utf8'));
async function signed(fn){
 const saved=process.env.DIAGNOSIS_STATE_SECRET;process.env.DIAGNOSIS_STATE_SECRET='painting-v1-offline-test-secret';
 try{return await fn();}finally{if(saved===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=saved;}
}
const base={scopeType:'complete_home',netAreaM2:100,paintedRoomCount:3,furnished:true,ceilingHeightM:2.5,
 paintWalls:true,paintCeiling:false,surfaceType:'old_painted',repairStatus:'none',oldColorTone:'dark',
 newColorTone:'light',paintType:'silicone_matte',paintBrand:'Duo',colorCode:'6269 Denizaltı'};
const approx=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const quote=(more={})=>calculatePaintingPrice({...base,...more});

test('all 21 positions match the three-sheet Excel source, cached prices and each source ×1.20 build',()=>{
 assert.equal(source.sha256,PAINTING_SOURCE_SHA256);assert.equal(source.positions.length,21);
 assert.deepEqual(source.sheets.map(s=>s.name),['Analiz Basitleştirilmiş','Fiyat Özeti','Soru Ağacı']);
 assert.equal(PAINTING_POSITIONS.length,21);assert.equal(MARKET_COST_FACTOR,1.2);
 const keys=new Set();
 for(const [i,pos] of PAINTING_POSITIONS.entries()){
  const raw=source.positions[i];assert.ok(!keys.has(pos.id));keys.add(pos.id);
  assert.equal(pos.id,`${raw.nameCell}_${raw.priceCell}`);assert.equal(pos.description,raw.description);
  assert.equal(pos.summaryRow,raw.summaryRow);assert.equal(pos.nameCell,raw.nameCell);assert.equal(pos.priceCell,raw.priceCell);
  approx(pos.priceM2,raw.unitPriceM2);
  approx(pos.priceM2,(pos.materialCostM2+pos.laborCostM2)*MARKET_COST_FACTOR);
  approx(pos.primerMaterialCostM2,raw.ingredients.filter(row=>/astar/i.test(row.label)).reduce((sum,row)=>sum+row.amount,0)*1.2);
 }
 assert.equal(OLD_PAINTED_CEILING_POZ.id,'B222_F231');
 const rows=PAINTING_POSITIONS.filter(p=>p.surface==='new_plaster'&&p.widePuttyInputIncluded);
 assert.equal(rows.length,3);for(const cost of source.extraPuttyComponentsM2)approx(cost,EXTRA_PUTTY_PRICE_M2);
 assert.equal(EXTRA_PUTTY_PRICE_M2,66.864);
});
test('required dark-wall example uses one source market coefficient and returns the single Turkish final price',()=>signed(async()=>{
 const result=quote();assert.ok(result);assert.equal(result.selectedWallPozId,'B13_F23');
 assert.equal(result.wallAreaM2,300);assert.equal(result.ceilingAreaM2,0);assert.equal(result.totalPaintAreaM2,300);
 approx(result.wallReferenceCost,32393.34);assert.equal(result.furnishedExtraFee,3000);
 approx(result.referenceCost,35393.34);approx(result.riskPremium,5309.001);approx(result.serviceFee,5309.001);
 assert.equal(result.regionalCoefficient,1);assert.equal(result.finalPrice,46011.34);
 const messages=['Komple ev','100 m²','3','Eşyalı','2,5 metre','Yalnız duvarlar','Eski boyalı','Yok','Koyu','Açık','Silikonlu mat','Duo - 6269 Denizaltı'];
 let response=await diagnosePainting('Boya hizmeti istiyorum',[],null);
 for(const answer of messages)response=await diagnosePainting(answer,[],response.stateToken);
 assert.equal(response.resultState,'priced');assert.equal(response.estimatedPrice,'46.011,34 TL');
 assert.equal(response.paintingQuote.finalPrice,46011.34);assert.equal(response.isReadyForPrice,true);
 assert.equal(decodePaintingState(response.stateToken).fields.colorCode,'6269 Denizaltı');
}));
test('light walls subtract only Excel primer material; dark to light keeps two coats and no extra layer',()=>{
 const dark=quote(),light=quote({oldColorTone:'light'}),poz=PAINTING_POSITIONS.find(p=>p.id===dark.selectedWallPozId);
 assert.equal(poz.coats,2);approx(poz.primerMaterialCostM2,5.46);
 approx(dark.wallReferenceCost-light.wallReferenceCost,300*5.46);
 approx((poz.priceM2-poz.primerMaterialCostM2),(poz.materialCostM2-4.55+poz.laborCostM2)*1.2);
 assert.equal(quote({newColorTone:'dark'}).finalPrice,dark.finalPrice);
 assert.equal(PAINTING_POSITIONS.find(p=>p.paintType==='white_lime').coats,3);
});
test('specific area uses painted rooms, not 3+1 house count; furnishings and height boundaries are exact',()=>{
 assert.equal(quote({scopeType:'specific_area',paintedRoomCount:1}).furnishedExtraFee,1000);
 assert.equal(quote({furnished:false}).furnishedExtraFee,0);
 assert.equal(quote({ceilingHeightM:4}).scaffoldExtraFee,0);
 const tall=quote({ceilingHeightM:4.2});approx(tall.wallAreaM2,504);assert.equal(tall.scaffoldExtraFee,2000);
});
test('walls, walls plus old-painted ceiling, only old-painted ceiling and no wall surface choice',()=>signed(async()=>{
 const both=quote({paintCeiling:true});assert.equal(both.wallAreaM2,300);assert.equal(both.ceilingAreaM2,100);
 assert.equal(both.totalPaintAreaM2,400);assert.equal(both.selectedCeilingPozId,'B222_F231');
 approx(both.ceilingReferenceCost,100*99.2778);
 const ceiling=quote({paintWalls:false,paintCeiling:true,surfaceType:undefined,repairStatus:undefined,
  oldColorTone:undefined,newColorTone:undefined,paintType:undefined,paintBrand:undefined,colorCode:undefined});
 assert.ok(ceiling);assert.equal(ceiling.wallAreaM2,0);assert.equal(ceiling.ceilingAreaM2,100);
 let r=await diagnosePainting('Boya hizmeti istiyorum',[],null);
 const sequence=[];for(const answer of ['Komple ev','100 m²','3','Boş','2,5 metre','Yalnız tavan']){
  sequence.push(decodePaintingState(r.stateToken).currentQuestionKey);
  r=await diagnosePainting(answer,[],r.stateToken);
 }
 assert.deepEqual(sequence,['scopeType','netAreaM2','paintedRoomCount','furnished','ceilingHeightM','surfaces']);
 assert.equal(r.resultState,'priced');assert.ok(!sequence.includes('surfaceType'));assert.equal(r.paintingQuote.wallAreaM2,0);
 const alreadyStated=await diagnosePainting('Yalnız tavanı boyatmak istiyorum',[],null);
 assert.equal(decodePaintingState(alreadyStated.stateToken).fields.paintCeiling,true);
 assert.equal(quote({paintWalls:true,paintCeiling:false}).ceilingAreaM2,0);
}));
test('wide putty source components add only the entered correction area; serious plaster damage blocks price',()=>signed(async()=>{
 const wide=quote({repairStatus:'wide_putty',extraPuttyM2:10});
 assert.ok(wide);approx(wide.repairCost,668.64);approx(wide.referenceCost-quote().referenceCost,668.64);
 assert.equal(quote({repairStatus:'wide_putty',extraPuttyM2:undefined}),null);
 assert.equal(quote({repairStatus:'wide_putty',extraPuttyM2:301}),null);
 assert.equal(quote({repairStatus:'serious_plaster_damage'}),null);
 let r=await diagnosePainting('Boya işi',[],null);
 for(const answer of ['Komple ev','100 m²','3','Boş','2,5 metre','Yalnız duvarlar','Eski boyalı',
  'Ciddi sıva / derin hasar var'])r=await diagnosePainting(answer,[],r.stateToken);
 assert.equal(r.resultState,'painting_manual_review');assert.equal(r.isReadyForPrice,false);
 assert.equal(r.estimatedPrice,null);assert.equal(r.paintingQuote,null);
 assert.equal(r.aiText,'Ciddi sıva veya derin hasar standart Boya V1 fiyatına dahil değil. Yerinde inceleme gerekir.');
}));
test('compatible paint options come only from the selected Excel surface, without fabricated variants',()=>signed(async()=>{
 assert.equal(availablePaintingTypes('old_painted').length,10);
 assert.deepEqual(availablePaintingTypes('new_plaster'),['silicone_matte','silicone_soft_matte','plastic_matte']);
 assert.deepEqual(availablePaintingTypes('satin_plaster_drywall'),['silicone_soft_matte','plastic_matte']);
 let r=await diagnosePainting('Boya işi',[],null);
 for(const answer of ['Komple ev','100 m²','3','Boş','2,5 metre','Yalnız duvarlar','Yeni sıvalı','Yok','Koyu','Açık'])
  r=await diagnosePainting(answer,[],r.stateToken);
 assert.deepEqual(r.options,['Silikonlu mat','Silikonlu soft mat','Plastik mat']);
 assert.equal(r.resultState,'painting_question');
}));
test('color code is a required work-order field; client-supplied money or poz never changes the server quote',()=>signed(async()=>{
 assert.equal(quote({colorCode:undefined}),null);
 assert.equal(quote({paintBrand:undefined}),null);
 const first=await diagnosePainting('Boya işi',[],null);
 const decoded=decodePaintingState(first.stateToken);
 assert.throws(()=>decodePaintingState(first.stateToken.replace('painting.','painting.X')));
 assert.equal(decoded.fields.referenceCost,undefined);
 const request=await diagnoseService('Boya işi',[],null,{category:'painting',categorySelected:true,
  painting:async(message,history,token)=>diagnosePainting(message,history,token)});
 assert.equal(request.category,'painting');assert.equal(request.resultState,'painting_service_selection');
 assert.equal(decodeConversationState(request.conversationToken).boilerStateToken,null);
}));
test('spontaneous net FLOOR area is retained but 3+1 does not set painted rooms; stated wall area is not tripled',()=>signed(async()=>{
 const r=await diagnosePainting('3+1 100 metrekare evimi boyatmak istiyorum',[],null);
 const s=decodePaintingState(r.stateToken);assert.equal(s.fields.netAreaM2,100);
 assert.equal(s.fields.paintedRoomCount,undefined);assert.equal(s.currentQuestionKey,'scopeType');
 let next=await diagnosePainting('Belirli oda/odalar',[],r.stateToken);
 assert.equal(decodePaintingState(next.stateToken).currentQuestionKey,'paintedRoomCount');
 next=await diagnosePainting('1',[],next.stateToken);
 assert.equal(decodePaintingState(next.stateToken).fields.paintedRoomCount,1);
 const wall=await diagnosePainting('Duvar alanı 80 m². Evimi boyatacağım',[],null);
 assert.equal(decodePaintingState(wall.stateToken).fields.netAreaM2,undefined);
 const trailingWall=await diagnosePainting('80 m² duvar boyanacak',[],null);
 assert.equal(decodePaintingState(trailingWall.stateToken).fields.netAreaM2,undefined);
 const height=await diagnosePainting('Tavan yüksekliği 2,5 metre; evimi boyatacağım',[],null);
 assert.equal(decodePaintingState(height.stateToken).fields.ceilingHeightM,2.5);
 assert.equal(decodePaintingState(height.stateToken).fields.paintCeiling,undefined);
}));
test('explicit source-compatible paint and brand/color facts survive a natural first message',()=>signed(async()=>{
 const input='Boya işi: duvarlar eski boyalı, su bazlı silikonlu mat; mevcut renk koyu, yeni renk açık; boya markası: Filli Boya, renk kodu: Rezene 190.';
 const first=await diagnosePainting(input,[],null),fields=decodePaintingState(first.stateToken).fields;
 assert.equal(fields.paintWalls,true);assert.equal(fields.surfaceType,'old_painted');
 assert.equal(fields.paintType,'silicone_matte');assert.equal(fields.oldColorTone,'dark');assert.equal(fields.newColorTone,'light');
 assert.equal(fields.paintBrand,'Filli Boya');assert.equal(fields.colorCode,'Rezene 190');
 assert.equal(first.answeredSystemQuestions,0);
}));
test('explicit current and requested tones retain their labels even when stated in reverse order',()=>signed(async()=>{
 const first=await diagnosePainting('Duvarları boyatacağım; yeni renk açık, mevcut renk koyu.',[],null);
 const fields=decodePaintingState(first.stateToken).fields;
 assert.equal(fields.oldColorTone,'dark');assert.equal(fields.newColorTone,'light');
}));
test('painting progress counts accepted requested answers, ignores extraction/rejected repeats, reaches 100 without stopping',()=>signed(async()=>{
 let r=await diagnosePainting('3+1 100 metrekare evimi boyatmak istiyorum',[],null);
 assert.equal(r.answeredSystemQuestions,0);assert.equal(visualProgress(r.answeredSystemQuestions),0);
 r=await diagnosePainting('Belirli oda/odalar',[],r.stateToken);
 assert.equal(r.answeredSystemQuestions,1);assert.equal(visualProgress(r.answeredSystemQuestions),13);
 const unchanged=await diagnosePainting('3+1',[],r.stateToken);
 assert.equal(unchanged.answeredSystemQuestions,1);assert.equal(unchanged.stateToken.startsWith('painting.'),true);
 for(const answer of ['1','Eşyalı','2,5 metre','Duvarlar ve tavan','Eski boyalı','Yok','Koyu']){
  r=await diagnosePainting(answer,[],r.stateToken);
 }
 assert.equal(r.answeredSystemQuestions,8);assert.equal(visualProgress(r.answeredSystemQuestions),100);
 assert.equal(r.resultState,'painting_question');assert.equal(r.isReadyForPrice,false);
 for(const answer of ['Açık','Silikonlu mat','Duo - 6269 Denizaltı'])r=await diagnosePainting(answer,[],r.stateToken);
 assert.equal(r.resultState,'priced');assert.equal(visualProgress(r.answeredSystemQuestions),100);
 assert.equal(r.answeredSystemQuestions,11);
}));
test('painting and boiler child states are isolated; other four cards keep unavailable behavior',()=>signed(async()=>{
 const forbidden=async()=>{throw Error('Boiler engine must not run for painting');};
 const painting=await diagnoseService('3+1 evimi boyatmak istiyorum',[],null,{boiler:forbidden});
 assert.equal(painting.category,'painting');assert.equal(painting.resultState,'painting_service_selection');
 assert.equal(painting.visualProgress,0);assert.equal(decodeConversationState(painting.conversationToken).boilerStateToken,null);
 const started=await diagnoseService('Duvar Boyama',[],null,{conversationToken:painting.conversationToken,boiler:forbidden});
 assert.equal(started.resultState,'painting_question');
 assert.equal(decodeConversationState(started.conversationToken).paintingServiceType,'wall_painting');
 const boiler=await diagnoseService('Kombi',[{role:'user',content:'3+1 evimi boyatmak istiyorum'}],painting.stateToken,
  {conversationToken:painting.conversationToken,category:'boiler',categorySelected:true,
   boiler:async(_message,history,token)=>{
    assert.equal(token,null);assert.deepEqual(history,[]);return {aiText:'Marka nedir?',resultState:'diagnosing'};
   }});
 assert.equal(boiler.category,'boiler');assert.equal(decodeConversationState(boiler.conversationToken).paintingStateToken,null);
 for(const category of ['cleaning','moving','sofa_cleaning','carpet_cleaning']){
  const r=await diagnoseService(category,[],null,{category,categorySelected:true,boiler:forbidden});
  assert.equal(r.category,category);assert.equal(r.resultState,'category_unavailable');
 }
 const back=await diagnoseService('Boya',[],null,{category:'painting',categorySelected:true,boiler:forbidden});
 assert.equal(back.category,'painting');assert.equal(back.resultState,'painting_service_selection');
}));
test('existing result card presents one final painting amount and leaves normal boiler wording unchanged',()=>{
 const priced={category:'painting',resultState:'priced',estimatedPrice:'46.011,34 TL',pricingData:null,deterministicOMF:null};
 assert.deepEqual(servicePricePresentation(priced),{title:'Nihai boya hizmeti fiyatı',amount:'46.011,34 TL',lines:[]});
 assert.equal(servicePricePresentation({...priced,resultState:'painting_question'}),null);
 assert.equal(servicePricePresentation({...priced,category:'boiler'}).title,'Tahmini servis tutarı');
});
