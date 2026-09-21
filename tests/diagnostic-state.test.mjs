import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDiagnosis,emptyMemory,normalizeProbabilities,encodeMemory,decodeMemory} from '../src/lib/diagnostic-state.ts';
const first = {informative:true,newEvidence:['uğultu var'],candidates:[
  {name:'A',probability:70,supports:['uğultu var']},{name:'B',probability:30,supports:['uğultu var']}],nextQuestions:['overheating']};
test('relative weights total exactly 100 including rounding',()=>{
  assert.deepEqual(normalizeProbabilities([1,1,1].map((n,i)=>({name:String(i),probability:n,supports:[],contradicts:[]}))).map(c=>c.probability),[34,33,33]);
});
test('no information freezes distribution and counter; repeated question is rejected',()=>{
  const start=advanceDiagnosis(emptyMemory(),first,'uğultu var');
  const next=advanceDiagnosis(start.memory,{...first,nextQuestions:['overheating','pressure']},'Bilmiyorum');
  assert.deepEqual(next.memory.candidates,start.memory.candidates);
  assert.equal(next.memory.information,10);
  assert.match(next.question,/basınç/);
});
test('fabricated customer evidence does not change candidate weights or information',()=>{
  const result=advanceDiagnosis(emptyMemory(),first,'Ekran kapalı');
  assert.equal(result.memory.information,0);
  assert.deepEqual(result.memory.candidates,[]);
});
test('supported update preserves all candidates and increments exactly ten',()=>{
  const start=advanceDiagnosis(emptyMemory(),first,'uğultu var');
  const result=advanceDiagnosis(start.memory,{informative:true,newEvidence:['çok sıcak'],candidates:[{name:'A',probability:90,supports:['çok sıcak']},{name:'B',probability:10,contradicts:['çok sıcak']}],nextQuestions:['leak']},'çok sıcak');
  assert.equal(result.memory.information,20);
  assert.deepEqual(result.memory.candidates.map(c=>c.probability),[90,10]);
  assert.deepEqual(result.memory.candidates[1].contradicts,['çok sıcak']);
});
test('at eighty information points no new question is sent',()=>{
  const previous={...emptyMemory(),information:70};
  const result=advanceDiagnosis(previous,first,'uğultu var');
  assert.equal(result.memory.information,80);
  assert.equal(result.question,null);
  assert.equal(result.memory.finished,true);
});
test('a valid negative observation advances the counter without forcing a probability change',()=>{
  const start=advanceDiagnosis(emptyMemory(),first,'uğultu var');
  const result=advanceDiagnosis(start.memory,{informative:false,newEvidence:[],nextQuestions:['leak']},'Hayır, normalden fazla ısınma yok.');
  assert.equal(result.memory.information,20);
  assert.deepEqual(result.memory.candidates,start.memory.candidates);
});
test('signed state cannot be changed by the client',()=>{
  const saved=process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY='unit-test-only';
  try {
    const token=encodeMemory(emptyMemory());
    assert.deepEqual(decodeMemory(token),emptyMemory());
    assert.throws(()=>decodeMemory('e30.'+token.split('.')[1]));
  } finally {if(saved === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=saved;}
});
