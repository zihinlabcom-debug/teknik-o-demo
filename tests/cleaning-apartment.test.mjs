import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceApartmentCleaning,quoteApartmentCleaning} from '../src/lib/cleaning-apartment.ts';

const apartment=(changes={})=>({floors:5,apartments:10,glass:'none',glassCount:0,elevator:false,
  materialsAvailable:true,...changes});

test('five floors have 7.5 base hours; normal/full glass add 5/15 without stacking',()=>{
 assert.equal(quoteApartmentCleaning(apartment()).personHours,7.5);
 assert.equal(quoteApartmentCleaning(apartment({glass:'normal',glassCount:2})).personHours,12.5);
 assert.equal(quoteApartmentCleaning(apartment({glass:'full',glassCount:2})).personHours,22.5);
});

test('elevator adds one hour only and apartment/glass counts remain data',()=>{
 const basic=quoteApartmentCleaning(apartment());
 assert.equal(quoteApartmentCleaning(apartment({elevator:true})).personHours,basic.personHours+1);
 for(const fields of [{apartments:30},{glassCount:100}]){
  const other=quoteApartmentCleaning(apartment(fields));
  assert.equal(other.personHours,basic.personHours);
  assert.equal(other.finalPrice,basic.finalPrice);
 }
});

test('apartment pay has 2000 minimum and no arbitrary money rounding',()=>{
 const small=quoteApartmentCleaning(apartment({floors:1,apartments:1}));
 assert.equal(small.laborPay,2000);
 assert.equal(small.finalPrice,2000*1.15*1.15);
 const normal=quoteApartmentCleaning(apartment());
 assert.equal(normal.laborPay,7.5*350);
 assert.equal(normal.finalPrice,7.5*350*1.15*1.15);
});

test('missing apartment materials add 1000 before risk and service, unlike home',()=>{
 const withMaterials=quoteApartmentCleaning(apartment());
 const without=quoteApartmentCleaning(apartment({materialsAvailable:false}));
 assert.equal(without.costBase,withMaterials.laborPay+1000);
 assert.ok(Math.abs((without.finalPrice-withMaterials.finalPrice)-1000*1.15*1.15)<1e-8);
});

test('apartment wizard never asks glass count for none, normal or full glass',()=>{
 for(const [glass,hours] of [['Cam yok',7.5],['Normal cam',12.5],['Full cam',22.5]]){
  let turn=advanceApartmentCleaning('Apartman Temizliği');
  for(const answer of ['5','10',glass])turn=advanceApartmentCleaning(answer,turn.state);
  assert.equal(turn.state.step,'elevator');
  assert.equal(turn.text,'Asansör temizlenecek mi?');
  assert.equal(turn.state.fields.glassCount,0);
  for(const answer of ['Hayır','Evet'])turn=advanceApartmentCleaning(answer,turn.state);
  assert.equal(turn.finished,true);assert.equal(turn.quote.personHours,hours);
 }
});
