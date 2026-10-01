import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceHomeCleaning,parseHomeExtras,quoteHomeCleaning,roundUpHalfHour,HOME_EXTRA_CHOICES} from '../src/lib/cleaning-home.ts';

const home=(changes={})=>({areaM2:100,rooms:3,bathrooms:1,balconies:0,extras:[],closetRooms:0,
  materialsAvailable:true,equipmentAvailable:true,duration:'same_day',...changes});

test('home area bands honor every supplied boundary, 40 floor and 300 ceiling',()=>{
 for(const [area,base] of [[35,4],[40,4],[59.99,4],[60,5],[79.99,5],[80,6],[99.99,6],
  [100,7],[119.99,7],[120,8],[139.99,8],[140,9],[159.99,9],[160,10],[179.99,10],
  [180,11],[199.99,11],[200,13],[219.99,13],[220,13],[224.99,13],
  [225,15],[249.99,15],[250,16],[300,16]]){
  assert.equal(quoteHomeCleaning(home({areaM2:area})).baseHours,base,`area ${area}`);
 }
 assert.equal(quoteHomeCleaning(home({areaM2:300.01})),null);
 let turn=advanceHomeCleaning('Ev Temizliği');
 turn=advanceHomeCleaning('300.01 m²',turn.state);
 assert.equal(turn.finished,true);assert.equal(turn.quote,null);
});

test('first bathroom is included and each additional bathroom adds exactly twenty minutes',()=>{
 for(const [bathrooms,minutes] of [[1,0],[2,20],[4,60]])
  assert.equal(quoteHomeCleaning(home({bathrooms})).extraMinutes,minutes);
});

test('home person-hours always round up to the next half-hour',()=>{
 for(const [value,expected] of [[6,6],[6.1,6.5],[6.49,6.5],[6.5,6.5],[6.51,7],[6.9,7]])
  assert.equal(roundUpHalfHour(value),expected);
 assert.equal(quoteHomeCleaning(home({areaM2:80,bathrooms:2})).roundedHours,6.5);
});

test('home base pay never drops below 2300 and material/equipment fees are outside both premiums',()=>{
 const plain=quoteHomeCleaning(home({areaM2:40}));
 const missing=quoteHomeCleaning(home({areaM2:40,materialsAvailable:false,equipmentAvailable:false}));
 assert.equal(plain.laborPay,2300);
 assert.equal(plain.finalPrice,2300*1.15*1.15);
 assert.ok(Math.abs((missing.finalPrice-plain.finalPrice)-2000)<1e-8);
 assert.equal(quoteHomeCleaning(home({areaM2:100})).laborPay,7*350);
});

test('balcony count is data only and does not affect duration or price',()=>{
 const baseline=quoteHomeCleaning(home());
 const many=quoteHomeCleaning(home({balconies:6}));
 assert.equal(many.roundedHours,baseline.roundedHours);
 assert.equal(many.finalPrice,baseline.finalPrice);
});

test('personnel is ceil(hours / (days × 8)) and flexible duration respects room-size cap',()=>{
 assert.equal(quoteHomeCleaning(home({areaM2:250,duration:'two_days'})).personnel,1);
 assert.equal(quoteHomeCleaning(home({areaM2:250,extras:['kitchenCabinets'],duration:'two_days'})).personnel,2);
 const large=quoteHomeCleaning(home({areaM2:250,rooms:4,bathrooms:4,extras:['handFloors','pet'],duration:'flexible'}));
 assert.equal(large.days,3);
 const smaller=quoteHomeCleaning(home({areaM2:250,rooms:3,bathrooms:4,extras:['handFloors','pet'],duration:'flexible'}));
 assert.equal(smaller.days,2);
});

test('source-defined extras use source minutes, with room closet quantity and window room type',()=>{
 const parsed=parseHomeExtras('fırın, buzdolabı, 2 oda dolabı, cam, evcil hayvan');
 assert.deepEqual(parsed,{extras:['oven','fridge','roomClosets','windows','pet'],closetRooms:2});
 const result=quoteHomeCleaning(home({rooms:4,extras:parsed.extras,closetRooms:parsed.closetRooms}));
 assert.equal(result.extraMinutes,30+45+60+180+120);
 assert.equal(parseHomeExtras('tanımsız özel iş'),null);
 assert.equal(parseHomeExtras('oda dolabı').closetRooms,0);
 assert.equal(quoteHomeCleaning(home({extras:['pet']})).extraMinutes,120);
});

test('home wizard asks the missing room-closet count and never guesses an undefined extra',()=>{
 let turn=advanceHomeCleaning('Ev Temizliği');
 for(const answer of ['100 m²','3+1','2','1'])turn=advanceHomeCleaning(answer,turn.state);
 assert.equal(turn.state.step,'extras');
 const invalid=advanceHomeCleaning('bilinmeyen iş',turn.state);
 assert.equal(invalid.state.step,'extras');assert.equal(invalid.answered,turn.answered);
 turn=advanceHomeCleaning('oda dolabı, cam',turn.state);
 assert.equal(turn.state.step,'closetRooms');
 turn=advanceHomeCleaning('2',turn.state);
 assert.equal(turn.state.fields.closetRooms,2);
 assert.equal(turn.state.step,'pet');
 turn=advanceHomeCleaning('Evet',turn.state);
 assert.ok(turn.state.fields.extras.includes('pet'));
});

test('every home extra selector answer maps to its existing engine key and keeps source time',()=>{
 for(const choice of HOME_EXTRA_CHOICES){
  const parsed=parseHomeExtras(choice.answer);
  assert.deepEqual(parsed.extras,[choice.key],choice.label);
 }
 const selected=[HOME_EXTRA_CHOICES[0],HOME_EXTRA_CHOICES[1],HOME_EXTRA_CHOICES[7]];
 const parsed=parseHomeExtras(selected.map(choice=>choice.answer).join(', '));
 assert.deepEqual(parsed.extras,['oven','fridge','walls']);
 assert.equal(quoteHomeCleaning(home({...parsed})).extraMinutes,30+45+30);
 let turn=advanceHomeCleaning('Ev Temizliği');
 for(const answer of ['100','3+1','1','0'])turn=advanceHomeCleaning(answer,turn.state);
 assert.equal(turn.state.step,'extras');
 assert.match(turn.text,/Devam Et/);
 turn=advanceHomeCleaning(selected.map(choice=>choice.answer).join(', '),turn.state);
 assert.equal(turn.state.step,'pet');
 assert.deepEqual(turn.state.fields.extras,parsed.extras);
});
