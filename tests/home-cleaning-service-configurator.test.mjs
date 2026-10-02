import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {advanceHomeCleaning,HOME_EXTRA_CHOICES,quoteHomeCleaning} from '../src/lib/cleaning-home.ts';
import {servicePricePresentation} from '../src/lib/service-presentation.ts';
const {toggleHomeExtra}=await import('../src/components/cleaning-input-selector.tsx');
const {HomeCleaningServiceConfigurator,EMPTY_HOME_CLEANING_SELECTION,homeCleaningSelectionAnswers}=
 await import('../src/components/home-cleaning-service-configurator.tsx');

const complete={...EMPTY_HOME_CLEANING_SELECTION,areaM2:'40',rooms:'2',bathrooms:1,balconies:0,
 noExtras:true,pet:false,materialsAvailable:true,equipmentAvailable:true,duration:'Aynı gün'};
const render=(selection=EMPTY_HOME_CLEANING_SELECTION,overrides={})=>renderToStaticMarkup(createElement(HomeCleaningServiceConfigurator,{
 selection,onChange(){},onCalculate(){},ready:true,busy:false,finished:false,
 result:null,onRequestTechnician(){},onReject(){},...overrides,
}));
const calculateButton=html=>html.match(/<button[^>]*>(?:Fiyatı Hesapla|Hesaplanıyor…)<\/button>/)?.[0]??'';
const runSelection=selection=>{
 let turn=advanceHomeCleaning('Ev Temizliği');
 for(const answer of homeCleaningSelectionAnswers(selection))turn=advanceHomeCleaning(answer,turn.state);
 return turn;
};

test('home configurator renders source-backed fields, sectioned form and summary without chat',()=>{
 const html=render();
 for(const text of ['Ev Bilgileri','Ek Hizmetler','Malzeme ve Ekipman','Süre Tercihi',
  'Eviniz kaç metrekare?','Ev tipi nedir?','Kaç banyo temizlenecek?','Kaç balkon var?',
  'Hangi ek işleri istersiniz?','Evde evcil hayvan var mı?','Temizlik malzemeleri evde mevcut mu?',
  'Elektrik süpürgesi ve temel ekipman mevcut mu?','Tamamlanma süresi tercihiniz nedir?',
  'Aynı gün','2 gün','Süre önemli değil','Hizmet özeti','Sipariş özetini göster','Fiyatı Hesapla'])
  assert.ok(html.includes(text),text);
 for(const extra of HOME_EXTRA_CHOICES)assert.ok(html.includes(extra.label),extra.label);
 for(const hidden of ['Mesajınızı yazın','Dosya / Foto','Sıfırla','<textarea'])assert.ok(!html.includes(hidden),hidden);
 assert.ok(html.includes('inputMode="decimal"'));
 assert.ok(html.includes('aria-label="Banyo artır"'));
 assert.ok(html.includes('aria-label="Balkon artır"'));
 assert.ok(html.includes('Henüz fiyat hesaplanmadı.'));
 assert.ok(calculateButton(html).includes('disabled=""'));
});

test('home form requires all fields and disables submission during request or after result',()=>{
 for(const field of ['areaM2','rooms','bathrooms','balconies','pet','materialsAvailable','equipmentAvailable','duration']){
  const invalid={...complete,[field]:field==='areaM2'||field==='rooms'?'':null};
  assert.equal(homeCleaningSelectionAnswers(invalid),null,field);
 }
 for(const areaM2 of ['0','abc','1e3'])assert.equal(homeCleaningSelectionAnswers({...complete,areaM2}),null);
 for(const rooms of ['0','100','2+1'])assert.equal(homeCleaningSelectionAnswers({...complete,rooms}),null);
 assert.equal(homeCleaningSelectionAnswers({...complete,noExtras:false}),null);
 assert.ok(!calculateButton(render(complete)).includes('disabled=""'));
 for(const overrides of [{busy:true},{ready:false},{finished:true}])
  assert.ok(calculateButton(render(complete,overrides)).includes('disabled=""'));
 const retry=render(complete,{fieldsLocked:true});
 assert.match(retry,/aria-label="Eviniz kaç metrekare\?"[^>]*disabled=""/);
 assert.ok(!calculateButton(retry).includes('disabled=""'));
});

test('home extras use source answers, Yok is exclusive, and closet count is conditional',()=>{
 assert.deepEqual(toggleHomeExtra({selected:['oven'],none:false},'none'),{selected:[],none:true});
 assert.deepEqual(toggleHomeExtra({selected:[],none:true},'roomClosets'),{selected:['roomClosets'],none:false});
 const withClosets={...complete,noExtras:false,extras:['oven','roomClosets'],closetRooms:null};
 assert.equal(homeCleaningSelectionAnswers(withClosets),null);
 assert.ok(render(withClosets).includes('Kaç oda dolabının içi temizlenecek?'));
 assert.ok(!render(complete).includes('Kaç oda dolabının içi temizlenecek?'));
 const selected={...withClosets,closetRooms:2};
 assert.deepEqual(homeCleaningSelectionAnswers(selected),['40','2+1','1','0','Fırın, Oda dolabı','2','Hayır','Evet','Evet','Aynı gün']);
 const html=render(selected);
 assert.ok(html.includes('Fırın, Oda dolabı'));
 assert.ok(html.includes('Oda dolabı'));
 assert.equal(homeCleaningSelectionAnswers({...selected,noExtras:true}),null);
});

test('home answers preserve existing motor sequence, minimum price and extras calculations',()=>{
 const minimum=runSelection(complete);
 assert.equal(minimum.finished,true);
 assert.equal(minimum.quote.finalPrice,quoteHomeCleaning({...minimum.state.fields}).finalPrice);
 assert.equal(minimum.quote.laborPay,2300);
 const extras={...complete,areaM2:'100',rooms:'3',bathrooms:2,balconies:1,
  noExtras:false,extras:['oven','roomClosets','windows'],closetRooms:2,pet:true,
  materialsAvailable:false,equipmentAvailable:false,duration:'2 gün'};
 const turn=runSelection(extras);
 assert.equal(turn.finished,true);
 assert.deepEqual(turn.state.fields.extras,['oven','roomClosets','windows','pet']);
 assert.equal(turn.state.fields.bathrooms,2);
 assert.equal(turn.state.fields.balconies,1);
 assert.equal(turn.state.fields.closetRooms,2);
 assert.equal(turn.state.fields.duration,'two_days');
 assert.equal(turn.quote.finalPrice,quoteHomeCleaning({...turn.state.fields}).finalPrice);
 const materialsOnly=runSelection({...complete,materialsAvailable:false}).quote.finalPrice;
 const equipmentOnly=runSelection({...complete,equipmentAvailable:false}).quote.finalPrice;
 const both=runSelection({...complete,materialsAvailable:false,equipmentAvailable:false}).quote.finalPrice;
 assert.equal(materialsOnly-minimum.quote.finalPrice,1000);
 assert.equal(equipmentOnly-minimum.quote.finalPrice,1000);
 assert.ok(Math.abs((both-minimum.quote.finalPrice)-2000)<1e-8);
 assert.equal(runSelection({...complete,bathrooms:2}).quote.extraMinutes,20);
});

test('over 300 m² ends in the existing uncertain outcome after the first backend answer',()=>{
 const answers=homeCleaningSelectionAnswers({...complete,areaM2:'300.01'});
 assert.equal(answers.length,9);
 let turn=advanceHomeCleaning('Ev Temizliği');
 turn=advanceHomeCleaning(answers[0],turn.state);
 assert.equal(turn.finished,true);
 assert.equal(turn.answered,1);
 assert.equal(turn.quote,null);
 assert.match(turn.text,/fiyat belirsiz/);
});

test('home result reuses the shared priced and uncertain cards without a client price preview',()=>{
 const priced=servicePricePresentation({category:'cleaning',resultState:'priced',estimatedPrice:'₺3.041,75',
  pricingData:null,deterministicOMF:null,cleaningQuote:{serviceType:'home_cleaning',serviceLabel:'Ev Temizliği',finalPrice:3041.75}});
 const pricedHtml=render(complete,{finished:true,result:priced});
 assert.ok(pricedHtml.includes('₺3.041,75'));
 assert.ok(pricedHtml.includes('Usta çağır'));
 assert.ok(pricedHtml.includes('Talebi reddet'));
 const uncertain=servicePricePresentation({category:'cleaning',resultState:'uncertain_price',estimatedPrice:null,
  pricingData:null,deterministicOMF:null,cleaningQuote:null});
 const uncertainHtml=render({...complete,areaM2:'300.01'},{finished:true,result:uncertain});
 assert.match(uncertainHtml,/>Fiyat<\/h3>/);
 assert.match(uncertainHtml,/>Belirsiz<\/p>/);
 assert.ok(uncertainHtml.includes('Usta çağır'));
 assert.ok(uncertainHtml.includes('Talebi reddet'));
 assert.ok(!render(complete).includes('₺3.041,75'));
});
