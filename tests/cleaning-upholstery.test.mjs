import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceUpholsteryCleaning,parseUpholsteryItems,quoteUpholsteryCleaning,UPHOLSTERY_PRODUCTS} from '../src/lib/cleaning-upholstery.ts';

test('all nine source products retain their locked unit prices',()=>{
 assert.deepEqual(UPHOLSTERY_PRODUCTS.map(p=>p.price),[500,1000,1000,1000,1000,1800,2500,3000,5500]);
});

test('quantity multiplies berjer and double-bed unit prices',()=>{
 assert.equal(quoteUpholsteryCleaning([{key:'armchair',quantity:3}]).basePrice,1500);
 assert.equal(quoteUpholsteryCleaning([{key:'double_bed',quantity:2}]).basePrice,3600);
});

test('a set is independent and is never decomposed into its components',()=>{
 const parsed=parseUpholsteryItems('1 koltuk takımı');
 assert.deepEqual(parsed,[{key:'sofa_set',quantity:1}]);
 assert.equal(quoteUpholsteryCleaning(parsed).basePrice,2500);
 assert.deepEqual(parseUpholsteryItems("1 koltuk takımı, 2 berjer"),
  [{key:'sofa_set',quantity:1},{key:'armchair',quantity:2}]);
});

test('set and extra pieces remain independent price rows with unchanged risk and service math',()=>{
 for(const [input,base] of [
  ['1 koltuk takımı, 1 berjer',3000],
  ['2 koltuk takımı, 2 berjer',6000],
  ["2 koltuk takımı, 2 berjer, 1 adet 3'lü koltuk",7000],
 ]){
  const items=parseUpholsteryItems(input);
  assert.ok(items,input);
  const quote=quoteUpholsteryCleaning(items);
  assert.equal(quote.basePrice,base,input);
  assert.equal(quote.finalPrice,base*1.15*1.15,input);
 }
});

test('mixed basket sums items and applies risk then service to the source base',()=>{
 const parsed=parseUpholsteryItems("1 adet 3'lü koltuk, 2 adet berjer, 1 adet çift kişilik yatak");
 const quote=quoteUpholsteryCleaning(parsed);
 assert.equal(quote.basePrice,3800);
 assert.equal(quote.finalPrice,3800*1.15*1.15);
});

test('unknown products and missing quantities cannot acquire a guessed price',()=>{
 assert.equal(parseUpholsteryItems('berjer'),null);
 assert.equal(parseUpholsteryItems('1 özel ürün'),null);
 let turn=advanceUpholsteryCleaning('Koltuk / Yatak Yıkama');
 turn=advanceUpholsteryCleaning('berjer',turn.state);
 assert.equal(turn.finished,false);assert.equal(turn.quote,null);
 turn=advanceUpholsteryCleaning('3 berjer',turn.state);
 assert.equal(turn.finished,true);assert.equal(turn.quote.basePrice,1500);
});

test('clear product phrases tolerate apostrophes, Turkish spellings, spaces and case without guessing',()=>{
 for(const input of ['1 adet 3lü koltuk',"1 adet 3'lü koltuk",'1 adet 3’lü koltuk',
  '1 adet üçlü koltuk','  1   ADET   UCLU   KOLTUK  '])
  assert.deepEqual(parseUpholsteryItems(input),[{key:'sofa_3',quantity:1}],input);
 for(const input of ['1 adet 2li koltuk',"1 adet 2'li koltuk",'1 adet 2’li koltuk',
  '1 adet ikili koltuk'])
  assert.deepEqual(parseUpholsteryItems(input),[{key:'sofa_2',quantity:1}],input);
 assert.deepEqual(parseUpholsteryItems('1 adet cift kisilik yatak'),[{key:'double_bed',quantity:1}]);
 assert.deepEqual(parseUpholsteryItems('2 adet berjer'),[{key:'armchair',quantity:2}]);
 assert.deepEqual(parseUpholsteryItems('1 adet 3lü koltuk 2 adet berjer'),
  [{key:'sofa_3',quantity:1},{key:'armchair',quantity:2}]);
 for(const input of ['koltuk var','3lü koltuk','1 özel ürün','1 berjer bilinmeyen'])
  assert.equal(parseUpholsteryItems(input),null,input);
});
