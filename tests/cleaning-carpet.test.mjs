import test from 'node:test';
import assert from 'node:assert/strict';
import {CARPET_PRODUCTS,parseCarpetBasket,quoteCarpetCleaning,advanceCarpetCleaning} from '../src/lib/cleaning-carpet.ts';

test('all locked carpet, curtain and bedding unit prices are exact',()=>{
 assert.deepEqual(CARPET_PRODUCTS.map(({key,unit,price})=>[key,unit,price]),[
  ['acrylic','m2',120],['machine','m2',99],['mega','m2',120],['fringed','m2',120],
  ['shaggy','m2',120],['machine_wool','m2',120],['hand_wool','m2',200],['nepal','m2',200],
  ['silk','m2',200],['non_slip','m2',100],['roller_blind','m2',99],['zebra_blind','m2',120],
  ['fiber_duvet','adet',599],['wool_duvet','adet',599],['blanket','adet',499],
 ]);
});
test('each physical m² item is rounded separately, without monetary rounding',()=>{
 const quote=quoteCarpetCleaning([{key:'acrylic',areasM2:[3.2,4.1]}]);
 assert.deepEqual(quote.items[0].billableM2,[4,5]);
 assert.equal(quote.baseTotal,1080);
 assert.equal(quote.finalPrice,1080*1.15*1.15);
 for(const [area,billable] of [[3,3],[3.01,4],[3.2,4],[4.99,5],[5,5]]){
  assert.deepEqual(quoteCarpetCleaning([{key:'non_slip',areasM2:[area]}]).items[0].billableM2,[billable]);
 }
 const multi=quoteCarpetCleaning([{key:'acrylic',areasM2:[4.2,6.1]}]);
 assert.deepEqual(multi.items[0].billableM2,[5,7]);assert.equal(multi.baseTotal,1440);
});
test('mixed basket has one final-price threshold and one risk/service application',()=>{
 const first=quoteCarpetCleaning([{key:'acrylic',areasM2:[4.2]},{key:'non_slip',areasM2:[3.1]}]);
 assert.equal(first.baseTotal,1000);assert.equal(first.hakEdis,1000);assert.equal(first.finalPrice,1322.5);
 const second=quoteCarpetCleaning([{key:'roller_blind',areasM2:[2.2,3.1]},{key:'blanket',quantity:1}]);
 assert.deepEqual(second.items[0].billableM2,[3,4]);
 assert.equal(second.baseTotal,1192);assert.ok(Math.abs(second.finalPrice-1576.42)<1e-9);
 const minimum=quoteCarpetCleaning([{key:'non_slip',areasM2:[3]}]);
 assert.equal(minimum.baseTotal,300);assert.equal(minimum.hakEdis,300);
 assert.ok(Math.abs(minimum.finalPrice-396.75)<1e-9);
 const mixed=quoteCarpetCleaning([{key:'acrylic',areasM2:[4.2]},{key:'roller_blind',areasM2:[2.2,3.1]},{key:'blanket',quantity:1}]);
 assert.equal(mixed.baseTotal,600+297+396+499);
 assert.equal(mixed.finalPrice,mixed.baseTotal*1.15*1.15);
});
test('zero, unknown and incomplete product data never receives a quote',()=>{
 assert.equal(quoteCarpetCleaning([]),null);
 assert.equal(quoteCarpetCleaning([{key:'blanket',quantity:0}]),null);
 assert.equal(quoteCarpetCleaning([{key:'acrylic',areasM2:[0]}]),null);
 assert.equal(quoteCarpetCleaning([{key:'acrylic',areasM2:[]}]),null);
 assert.equal(quoteCarpetCleaning([{key:'nonexistent',areasM2:[3]}]),null);
 assert.equal(quoteCarpetCleaning([{key:'blanket',quantity:1,areasM2:[2]}]),null);
 assert.equal(parseCarpetBasket('Akrilik Halı: 4.2 m² + ').missing,'Akrilik Halı Yıkama — 2. ürünün m² bilgisi eksik veya geçersiz.');
 assert.equal(parseCarpetBasket('Bilinmeyen Halı: 3 m²').unknown,true);
 assert.equal(parseCarpetBasket('kaymaz hali yikama: 3,2 m2').items[0].key,'non_slip');
 assert.deepEqual(parseCarpetBasket('Stor Perde: 2.2 m² + 3.1 m²; Battaniye: 1 adet').items,
  [{key:'roller_blind',areasM2:[2.2,3.1]},{key:'blanket',quantity:1}]);
});
test('unknown free text ends uncertain; incomplete m² asks for the precise physical item',()=>{
 const start=advanceCarpetCleaning('Halı Yıkama');
 assert.equal(start.finished,false);
 const missing=advanceCarpetCleaning('Akrilik Halı: 4.2 m² + ',start.state);
 assert.equal(missing.finished,false);assert.match(missing.text,/2\. ürünün m² bilgisi/);assert.equal(missing.quote,null);
 const unknown=advanceCarpetCleaning('İran halısı: 4 m²',start.state);
 assert.equal(unknown.finished,true);assert.equal(unknown.quote,null);
 const good=advanceCarpetCleaning('Kaymaz Halı: 3 m²',start.state);
 assert.equal(good.finished,true);assert.ok(Math.abs(good.quote.finalPrice-396.75)<1e-9);
});

test('four square metres of machine carpet keep the unraised final amount for the server acceptance gate',()=>{
 const quote=quoteCarpetCleaning([{key:'machine',areasM2:[4]}]);
 assert.equal(quote.baseTotal,396);
 assert.equal(quote.hakEdis,396);
 assert.equal(Number(quote.finalPrice.toFixed(2)),523.71);
});
