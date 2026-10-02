import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {advanceApartmentCleaning} from '../src/lib/cleaning-apartment.ts';
import {servicePricePresentation} from '../src/lib/service-presentation.ts';
const {ApartmentServiceConfigurator,EMPTY_APARTMENT_SELECTION,apartmentSelectionAnswers}=
 await import('../src/components/apartment-service-configurator.tsx');

const render=(selection=EMPTY_APARTMENT_SELECTION,overrides={})=>renderToStaticMarkup(createElement(ApartmentServiceConfigurator,{
 selection,onChange(){},onCalculate(){},ready:true,busy:false,finished:false,
 result:null,onRequestTechnician(){},onReject(){},...overrides,
}));
const calculateButton=html=>html.match(/<button[^>]*>(?:Fiyatı Hesapla|Hesaplanıyor…)<\/button>/)?.[0]??'';
const complete={floors:'5',apartments:'10',glass:'Full cam',elevator:true,materialsAvailable:false};

test('apartment configurator shows all five motor fields and no chat or glass count UI',()=>{
 const html=render();
 for(const label of ['Apartman kaç katlı?','Toplam kaç daire var?','Her kattaki cam tipi nedir?',
  'Asansör temizlenecek mi?','Yeterli temizlik malzemesi var mı?','Cam yok','Normal cam','Full cam'])
  assert.ok(html.includes(label),label);
 assert.ok(html.includes('Hizmet özeti'));
 assert.ok(html.includes('Sipariş özetini göster'));
 assert.ok(!html.includes('glassCount'));
 assert.ok(!html.includes('Cam sayısı'));
 assert.ok(calculateButton(html).includes('disabled=""'));
 for(const control of ['Mesajınız','Dosya / Foto','Sıfırla','<textarea'])assert.ok(!html.includes(control),control);
});

test('apartment form validates floors, apartments and required choices before submission',()=>{
 assert.equal(apartmentSelectionAnswers(EMPTY_APARTMENT_SELECTION),null);
 for(const field of ['floors','apartments'])for(const value of ['0','1.5','abc','100001']){
  const invalid={...complete,[field]:value};
  if(field==='floors'||value!=='100001')assert.equal(apartmentSelectionAnswers(invalid),null);
 }
 for(const field of ['glass','elevator','materialsAvailable'])
  assert.equal(apartmentSelectionAnswers({...complete,[field]:null}),null);
 assert.deepEqual(apartmentSelectionAnswers(complete),['5','10','Full cam','Evet','Hayır']);
 assert.ok(!calculateButton(render(complete)).includes('disabled=""'));
 assert.ok(calculateButton(render(complete,{busy:true})).includes('disabled=""'));
 assert.ok(calculateButton(render(complete,{ready:false})).includes('disabled=""'));
 const retry=render(complete,{fieldsLocked:true});
 const floorInput=retry.match(/<input[^>]*aria-label="Apartman kaç katlı\?"[^>]*>/)?.[0]??'';
 assert.ok(floorInput.includes('disabled=""'));
 assert.ok(floorInput.includes('value="5"'));
 assert.ok(!calculateButton(retry).includes('disabled=""'));
});

test('apartment answers follow the existing signed motor order and preserve source price',()=>{
 let turn=advanceApartmentCleaning('Apartman Temizliği');
 for(const answer of apartmentSelectionAnswers(complete))turn=advanceApartmentCleaning(answer,turn.state);
 assert.equal(turn.finished,true);
 assert.equal(turn.state.fields.glassCount,0);
 assert.equal(turn.state.fields.apartments,10);
 assert.equal(turn.quote.personHours,23.5);
 assert.equal(turn.quote.finalPrice,(23.5*350+1000)*1.15*1.15);
});

test('apartment result uses shared price card without client-side preview',()=>{
 const before=render(complete);
 assert.ok(before.includes('Henüz fiyat hesaplanmadı.'));
 assert.ok(!before.includes('12.'));
 const result=servicePricePresentation({category:'cleaning',resultState:'priced',estimatedPrice:'₺12.200,06',
  pricingData:null,deterministicOMF:null,cleaningQuote:{serviceType:'apartment_cleaning',serviceLabel:'Apartman Temizliği',finalPrice:12200.0625}});
 const html=render(complete,{finished:true,result});
 assert.ok(html.includes('₺12.200,06'));
 assert.ok(html.includes('Usta çağır'));
 assert.ok(html.includes('Talebi reddet'));
 assert.ok(calculateButton(html).includes('disabled=""'));
});
