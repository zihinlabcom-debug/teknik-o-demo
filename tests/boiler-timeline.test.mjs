import test from 'node:test';
import assert from 'node:assert/strict';
import {extractBoilerTimeline} from '../src/lib/boiler-timeline.ts';

test('historical operation/reset recurrence is separated from current persistent fault',()=>{
 const message='Önceleri normal çalışıyordu sonra hata verdi reset attım düzeldi bir süre sonra tekrar verdi böyle devam etti sonra artık hata hep çıkıyor';
 const t=extractBoilerTimeline(message);
 assert.ok(t.historical.some(e=>e.kind==='after_some_time'));
 assert.ok(t.historical.some(e=>e.kind==='intermittent'));
 assert.ok(t.historical.some(e=>e.kind==='reset_temporarily_helped'));
 assert.equal(t.current.persistent,true);assert.equal(t.current.timing,null);assert.equal(t.needsClarification,true);
 assert.ok(t.historical.every(e=>message.includes(e.quote)));
});
test('an explicit current timing outranks an earlier different timing',()=>{
 const t=extractBoilerTimeline('Eskiden bir süre çalıştıktan sonra veriyordu, artık hata hemen geliyor.');
 assert.ok(t.historical.some(e=>e.kind==='after_some_time'));assert.equal(t.current.timing,'immediate');
 assert.equal(t.needsClarification,false);
});
test('current clear timing can be used while unknown wording remains neutral',()=>{
 assert.equal(extractBoilerTimeline('Bir süre çalıştıktan sonra hata geliyor').current.timing,'after_some_time');
 assert.equal(extractBoilerTimeline('Şu anda aralıklı hata oluyor').current.timing,'intermittent');
 assert.equal(extractBoilerTimeline('Bilmiyorum galiba hemen geliyor').current.timing,null);
 assert.equal(extractBoilerTimeline('hata hep var').current.timing,null);
});
