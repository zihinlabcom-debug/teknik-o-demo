import test from 'node:test';
import assert from 'node:assert/strict';
import {runCleaning,MINIMUM_CLEANING_ORDER_MESSAGE} from '../src/lib/cleaning-engine.ts';
import {quoteCarpetCleaning} from '../src/lib/cleaning-carpet.ts';
import {servicePricePresentation} from '../src/lib/service-presentation.ts';

const upholstery=()=>runCleaning('Koltuk / Yatak Yıkama');
const carpet=()=>runCleaning('Halı Yıkama');
const priced=(reply,amount)=>{
 assert.equal(reply.resultState,'priced');
 assert.ok(Math.abs(reply.cleaningQuote.finalPrice-amount)<1e-8);
 assert.equal(reply.isReadyForPrice,true);
};
const minimum=reply=>{
 assert.equal(reply.resultState,'minimum_order_not_met');
 assert.equal(reply.aiText,MINIMUM_CLEANING_ORDER_MESSAGE);
 assert.equal(reply.estimatedPrice,null);
 assert.equal(reply.cleaningQuote,null);
 assert.equal(reply.canRouteTechnician,false);
 assert.equal(reply.isReadyForPrice,false);
 assert.equal(servicePricePresentation(reply),null);
};

test('upholstery threshold applies to final total; one armchair can be increased and requoted',()=>{
 const start=upholstery();
 const one=runCleaning('1 berjer',start.state);
 minimum(one);
 assert.deepEqual(one.state.upholstery.items,[{key:'armchair',quantity:1}]);
 assert.equal(one.cleaningInputMode,'upholstery_items');
 priced(runCleaning('2 berjer',one.state),1322.5);
 for(const [basket,amount] of [
  ['1 tek çekyat',1322.5],['1 çift kişilik yatak',2380.5],
  ['1 oturma grubu',3306.25],['1 oturma grubu, 2 berjer',4628.75],
 ])priced(runCleaning(basket,start.state),amount);
});

test('carpet threshold uses the unraised final basket amount and keeps physical ceiling separate',()=>{
 const machine=quoteCarpetCleaning([{key:'machine',areasM2:[4]}]);
 assert.equal(machine.baseTotal,396);
 assert.equal(Number(machine.finalPrice.toFixed(2)),523.71);
 const start=carpet();
 const low=runCleaning('Makina Halısı Yıkama: 4 m²',start.state);
 minimum(low);
 assert.equal(low.cleaningInputMode,'carpet_items');
 assert.deepEqual(low.state.carpet.items,[{key:'machine',areasM2:[4]}]);
 priced(runCleaning('Makina Halısı Yıkama: 4 m²; Battaniye Yıkama: 1 adet',low.state),
  (396+499)*1.15*1.15);
 const acrylic=runCleaning('Akrilik Halı Yıkama: 4,2 m² + 6,1 m²',start.state);
 priced(acrylic,1904.4);
 assert.deepEqual(acrylic.cleaningQuote.items[0].billableM2,[5,7]);
 minimum(runCleaning('Makina Halısı Yıkama: 2 m²; Battaniye Yıkama: 1 adet',start.state));
 const mixed=runCleaning('Akrilik Halı Yıkama: 4,2 m²; Stor Perde Yıkama: 2,2 m²; Battaniye Yıkama: 1 adet',start.state);
 priced(mixed,(600+297+499)*1.15*1.15);
});

test('normal priced baskets accept a new full-basket submission without clearing the chosen service',()=>{
 const start=upholstery();
 const first=runCleaning('2 berjer',start.state);
 priced(first,1322.5);
 const second=runCleaning('3 berjer',first.state);
 priced(second,1983.75);
 assert.equal(second.state.serviceType,'upholstery_cleaning');
 assert.deepEqual(second.state.upholstery.items,[{key:'armchair',quantity:3}]);
 const rugStart=carpet();
 const rugFirst=runCleaning('Akrilik Halı Yıkama: 4,2 m² + 6,1 m²',rugStart.state);
 const rugSecond=runCleaning('Akrilik Halı Yıkama: 4,2 m² + 6,1 m²; Battaniye Yıkama: 1 adet',rugFirst.state);
 priced(rugSecond,(1440+499)*1.15*1.15);
 assert.equal(rugSecond.state.serviceType,'carpet_cleaning');
});
