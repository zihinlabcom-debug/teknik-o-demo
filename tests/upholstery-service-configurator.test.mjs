import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {decodeHTML} from 'entities';
import {UPHOLSTERY_PRODUCTS,advanceUpholsteryCleaning} from '../src/lib/cleaning-upholstery.ts';
import {servicePricePresentation} from '../src/lib/service-presentation.ts';
const {changeUpholsteryQuantity,upholsterySelectionAnswer}=await import('../src/components/cleaning-input-selector.tsx');
const {UpholsteryServiceConfigurator}=await import('../src/components/upholstery-service-configurator.tsx');

const render=(selection={},overrides={})=>decodeHTML(renderToStaticMarkup(createElement(UpholsteryServiceConfigurator,{
 selection,onQuantityChange(){},onCalculate(){},ready:true,busy:false,finished:false,
 result:null,onRequestTechnician(){},onReject(){},...overrides,
})));
const calculateButton=html=>html.match(/<button[^>]*>(?:Fiyatı Hesapla|Hesaplanıyor…)<\/button>/)?.[0]??'';

test('upholstery configurator renders the source nine products, summary and no chat controls',()=>{
 const html=render();
 assert.equal(UPHOLSTERY_PRODUCTS.length,9);
 for(const product of UPHOLSTERY_PRODUCTS)assert.ok(html.includes(product.key==='sofa_set'?'Koltuk takımı / oturma grubu':product.label));
 assert.equal((html.match(/ artır/g)??[]).length,9);
 assert.ok(html.includes('1 oturma grubu = 2 adet 3’lü koltuk + 1 berjer'));
 assert.ok(html.includes('0 ürün'));
 assert.ok(html.includes('Sipariş özetini göster'));
 assert.ok(calculateButton(html).includes('disabled=""'));
 for(const control of ['Mesajınız','Dosya / Foto','Sıfırla','<textarea'])assert.ok(!html.includes(control),control);
});

test('mixed basket keeps set and extras independent with quantity limits and backend answer',()=>{
 let selection={};
 selection=changeUpholsteryQuantity(selection,'sofa_set',1);
 selection=changeUpholsteryQuantity(selection,'armchair',2);
 const html=render(selection);
 assert.ok(html.includes('3 ürün'));
 assert.ok(html.includes('Koltuk takımı yıkama'));
 assert.ok(html.includes('2 adet'));
 assert.ok(!calculateButton(html).includes('disabled=""'));
 const answer=upholsterySelectionAnswer(selection);
 assert.equal(answer,'2 adet Berjer, 1 adet Koltuk takımı yıkama');
 const start=advanceUpholsteryCleaning('Koltuk / Yatak Yıkama');
 const result=advanceUpholsteryCleaning(answer,start.state);
 assert.equal(result.quote.basePrice,3500);
 assert.ok(Math.abs(result.quote.finalPrice-4628.75)<1e-8);
 assert.deepEqual(result.state.items,[{key:'armchair',quantity:2},{key:'sofa_set',quantity:1}]);
 assert.equal(changeUpholsteryQuantity({armchair:100},'armchair',1).armchair,100);
 assert.equal(changeUpholsteryQuantity({armchair:0},'armchair',-1).armchair,0);
});

test('priced and uncertain results use the shared card; no client price preview',()=>{
 const selection={armchair:2};
 const before=render(selection);
 assert.ok(before.includes('Henüz fiyat hesaplanmadı.'));
 assert.ok(!before.includes('1.322,50'));
 const result=servicePricePresentation({category:'sofa_cleaning',resultState:'priced',estimatedPrice:'₺1.322,50',
  pricingData:null,deterministicOMF:null,cleaningQuote:{serviceType:'upholstery_cleaning',serviceLabel:'Koltuk / Yatak Yıkama',finalPrice:1322.5}});
 const html=render(selection,{finished:true,result});
 assert.ok(html.includes('₺1.322,50'));
 assert.ok(html.includes('Usta çağır'));
 assert.ok(html.includes('Talebi reddet'));
 assert.ok(calculateButton(html).includes('disabled=""'));
 const uncertain=servicePricePresentation({resultState:'uncertain_price',estimatedPrice:null,pricingData:null,deterministicOMF:null});
 assert.ok(render(selection,{finished:true,result:uncertain}).includes('Belirsiz'));
 assert.ok(render(selection,{busy:true}).includes('Hesaplanıyor'));
 assert.ok(!render(selection,{busy:true,finished:false,result:null}).includes('Usta çağır'));
});

test('minimum notice has no price or technician action and keeps the selected armchair editable',()=>{
 const message='Minimum sipariş tutarı 1.000 TL’dir. Bu tutarın altındaki siparişleri alamıyoruz.';
 const html=render({armchair:1},{minimumOrderMessage:message});
 assert.ok(html.includes('Minimum sipariş tutarı'));
 assert.ok(html.includes(message));
 assert.ok(!html.includes('Usta çağır'));
 assert.ok(!html.includes('₺661,25'));
 assert.ok(!calculateButton(html).includes('disabled=""'));
 const increaseButton=html.match(/<button[^>]*aria-label="Berjer artır"[^>]*>/)?.[0]??'';
 assert.ok(increaseButton);
 assert.ok(!increaseButton.includes('disabled=""'));
 const afterReject=render({armchair:2},{finished:false,result:null});
 assert.ok(afterReject.includes('2 adet'));
 assert.ok(!calculateButton(afterReject).includes('disabled=""'));
});

test('source product prices remain unchanged for berjer, double bed and set',()=>{
 const start=advanceUpholsteryCleaning('Koltuk / Yatak Yıkama');
 for(const [selection,expected] of [[{armchair:1},661.25],[{double_bed:1},2380.5],[{sofa_set:1},3306.25]]){
  const result=advanceUpholsteryCleaning(upholsterySelectionAnswer(selection),start.state);
  assert.ok(Math.abs(result.quote.finalPrice-expected)<1e-8);
 }
});
