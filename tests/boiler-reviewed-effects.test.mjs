import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedBoilerEffects} from '../src/lib/boiler-effects.ts';
import {calculateBoilerWeights} from '../src/lib/boiler-probability.ts';
test('warmup timing leaves the wiring factor neutral and preserves all locked coefficients',()=>{
 const cs=[{id:'wire',candidate_name:'Kablolama/soket/bağlantı sorunu'}, {id:'heat',candidate_name:'Eşanjör sorunu'}];
 const qs=[{id:'q',question_key:'fault_timing_after_start'}];
 const old=[{candidate_id:'wire',question_id:'q',answer_key:'after_some_time',effect:'weaken'},
  {candidate_id:'heat',question_id:'q',answer_key:'after_some_time',effect:'support'}];
 const reviewed=reviewedBoilerEffects(cs,qs,old);
 assert.equal(reviewed[0].effect,'neutral');assert.equal(reviewed[1].effect,'support');
 assert.equal(old[0].effect,'weaken');
 const result=calculateBoilerWeights(cs,[{questionId:'q',answerKey:'after_some_time',evidenceGroup:'timing'}],reviewed);
 assert.equal(result[0].probability,33.33);assert.equal(result[1].probability,66.67);
});
