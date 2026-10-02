import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {servicePricePresentation} from '../src/lib/service-presentation.ts';
import {advanceCarpetCleaning} from '../src/lib/cleaning-carpet.ts';
const {changeCarpetQuantity,setCarpetArea,carpetSelectionAnswer}=
 await import('../src/components/cleaning-carpet-input-selector.tsx');
const {CarpetServiceConfigurator}=await import('../src/components/carpet-service-configurator.tsx');

const render=(selection={},overrides={})=>renderToStaticMarkup(createElement(CarpetServiceConfigurator,{
 selection,onQuantityChange(){},onAreaChange(){},onCalculate(){},ready:true,busy:false,finished:false,
 result:null,onRequestTechnician(){},onReject(){},...overrides,
}));
const calculateButton=html=>html.match(/<button[^>]*>Fiyatı Hesapla<\/button>/)?.[0]??'';

test('carpet configurator renders a full product form and summary without chat controls',()=>{
 const html=render();
 for(const label of ['Halılar','Perdeler','Yorgan / Battaniye','Sipariş özeti','0 ürün','Henüz fiyat hesaplanmadı']){
  assert.ok(html.includes(label),label);
 }
 assert.equal((html.match(/ artır/g)??[]).length,15);
 assert.ok(html.includes('en fazla 7 gün'));
 assert.ok(html.includes('<details'));
 assert.ok(html.includes('Sipariş özetini göster'));
 assert.ok(html.includes('Sepette en az bir ürün seçin.'));
 assert.ok(calculateButton(html).includes('disabled=""'));
 for(const chatControl of ['Mesajınız','Dosya / Foto','Sıfırla','<textarea'])assert.ok(!html.includes(chatControl),chatControl);
});

test('selected products and their separate areas appear in the order summary',()=>{
 let selection={};
 selection=changeCarpetQuantity(selection,'acrylic',1);
 selection=changeCarpetQuantity(selection,'acrylic',1);
 selection=setCarpetArea(selection,'acrylic',0,'4,2');
 selection=setCarpetArea(selection,'acrylic',1,'6.1');
 selection=changeCarpetQuantity(selection,'blanket',1);
 const html=render(selection);
 assert.ok(html.includes('3 ürün'));
 assert.ok(html.includes('Akrilik Halı Yıkama'));
 assert.ok(html.includes('Battaniye Yıkama'));
 assert.ok(html.includes('4,2 m²'));
 assert.ok(html.includes('6.1 m²'));
 assert.ok(html.includes('1. ürün m²'));
 assert.ok(html.includes('2. ürün m²'));
 assert.ok(!calculateButton(html).includes('disabled=""'));
 assert.equal(carpetSelectionAnswer(selection),'Akrilik Halı Yıkama: 4.2 m² + 6.1 m²; Battaniye Yıkama: 1 adet');
});

test('missing m² and pending requests prevent submission',()=>{
 const incomplete=changeCarpetQuantity({},'roller_blind',1);
 const html=render(incomplete);
 assert.ok(html.includes('1. ürünün m² bilgisi gerekli'));
 assert.ok(calculateButton(html).includes('disabled=""'));
 const complete=setCarpetArea(incomplete,'roller_blind',0,'3');
 assert.ok(calculateButton(render(complete,{ready:false})).includes('disabled=""'));
 assert.ok(render(complete,{busy:true}).includes('Hesaplanıyor'));
 assert.ok(render(complete,{busy:true}).includes('disabled=""'));
});

test('backend result uses the shared price card and no client-side price preview',()=>{
 const selection=setCarpetArea(setCarpetArea(changeCarpetQuantity(changeCarpetQuantity({},'acrylic',1),'acrylic',1),
  'acrylic',0,'4.2'),'acrylic',1,'6.1');
 const before=render(selection);
 assert.ok(before.includes('Henüz fiyat hesaplanmadı'));
 assert.ok(!before.includes('1.904'));
 const result=servicePricePresentation({category:'carpet_cleaning',resultState:'priced',estimatedPrice:'1.904,40 ₺',
  pricingData:null,deterministicOMF:null,cleaningQuote:{serviceType:'carpet_cleaning',serviceLabel:'Halı, Perde ve Ev Tekstili Yıkama',finalPrice:1904.4}});
 const html=render(selection,{finished:true,result});
 assert.ok(html.includes('Değerlendirme tamamlandı.'));
 assert.ok(html.includes('1.904,40 ₺'));
 assert.ok(html.includes('Usta çağır'));
 assert.ok(html.includes('Talebi reddet'));
 assert.ok(calculateButton(html).includes('disabled=""'));
 assert.ok(!render(selection,{busy:true,finished:false,result:null}).includes('Usta çağır'));
});

test('below-minimum carpet basket shows only warning and remains editable for another item',()=>{
 const selection=setCarpetArea(changeCarpetQuantity({},'machine',1),'machine',0,'4');
 const message='Minimum sipariş tutarı 1.000 TL’dir. Bu tutarın altındaki siparişleri alamıyoruz.';
 const html=render(selection,{minimumOrderMessage:message});
 assert.ok(html.includes('Minimum sipariş tutarı'));
 assert.ok(html.includes(message));
 assert.ok(!html.includes('Usta çağır'));
 assert.ok(!html.includes('523,71'));
 assert.ok(!html.includes('1.322,50'));
 assert.ok(!calculateButton(html).includes('disabled=""'));
 const increaseButton=html.match(/<button[^>]*aria-label="Makina Halısı Yıkama artır"[^>]*>/)?.[0]??'';
 assert.ok(increaseButton);
 assert.ok(!increaseButton.includes('disabled=""'));
});

test('configurator answers retain locked single, per-item area and mixed-basket prices',()=>{
 const start=advanceCarpetCleaning('Halı Yıkama');
 const cases=[
  [setCarpetArea(changeCarpetQuantity({},'non_slip',1),'non_slip',0,'3'),396.75],
  [setCarpetArea(setCarpetArea(changeCarpetQuantity(changeCarpetQuantity({},'acrylic',1),'acrylic',1),'acrylic',0,'4.2'),'acrylic',1,'6.1'),1904.4],
 ];
 for(const [selection,expected] of cases){
  const result=advanceCarpetCleaning(carpetSelectionAnswer(selection),start.state);
  assert.equal(result.finished,true);
  assert.ok(Math.abs(result.quote.finalPrice-expected)<1e-9);
 }
 let mixed={};
 mixed=setCarpetArea(changeCarpetQuantity(mixed,'acrylic',1),'acrylic',0,'4.2');
 mixed=setCarpetArea(changeCarpetQuantity(mixed,'roller_blind',1),'roller_blind',0,'2.2');
 mixed=changeCarpetQuantity(mixed,'blanket',1);
 const result=advanceCarpetCleaning(carpetSelectionAnswer(mixed),start.state);
 assert.equal(result.finished,true);
 assert.deepEqual(result.quote.items.map(item=>item.key),['acrylic','roller_blind','blanket']);
 assert.ok(Math.abs(result.quote.finalPrice-(600+297+499)*1.15*1.15)<1e-9);
});
