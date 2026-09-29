import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {diagnoseBoiler,decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {withCopaRepository} from './helpers/copa-stage3-runtime.mjs';
import {generalAI,signedGeneral} from './helpers/stage3-general-runtime.mjs';
import {reviewedBoilerQuestions} from '../src/lib/boiler-effects.ts';
const data=JSON.parse(readFileSync(new URL('./fixtures/free-text-relevance.json',import.meta.url),'utf8'));
const run=f=>signedGeneral(()=>withCopaRepository(f,{data}));
async function flow(repo,identity,expected){
 const ai=generalAI(identity);ai.classifyAnswer=async q=>q.is_safety_question?'no':'unknown';
 ai.chooseQuestion=async({questions,questionValue})=>{
  assert.ok(questions.every(q=>q.is_safety_question||Object.values(questionValue[q.id]).some(Boolean)));
  return [...questions].sort((a,b)=>b.priority-a.priority)[0].id;
 };
 const questions=await repo.getQuestions();let r=await diagnoseBoiler(`${identity.brand} ${identity.model} ${identity.errorCode} hatası`,[],null,repo,ai);
 for(const key of expected){
  const s=decodeBoilerState(r.stateToken),q=questions.find(q=>q.id===s.pendingQuestionId);
  assert.equal(q?.question_key,key);assert.equal(r.candidateProbabilities.reduce((sum,c)=>sum+Math.round(c.probability*100),0),10000);
  r=await diagnoseBoiler(q.is_safety_question?'Hayır':'Bilmiyorum',[],r.stateToken,repo,ai);
 }
 return r;
}
test('Ariston 1P1 asks safety then source-backed visible pressure before broad thermal process questions',()=>run(async repo=>{
 const r=await flow(repo,{brand:'Ariston',model:'CLAS ONE',errorCode:'1P1'},['safety_gas_smell','display_low_water_pressure',
  'fault_timing_after_start','display_temperature_rise','heating_dhw_scope']);
 assert.equal(r.candidateProbabilities.length,7);
}));
test('F76 has no pressure/pump/heating-scope questions and retains its diagnostic order/boundary',()=>run(async repo=>{
 const r=await flow(repo,{brand:'DemirDöküm',model:'nitromiX',errorCode:'F76'},['safety_gas_smell','fault_timing_after_start','display_temperature_rise']);
 assert.equal(r.resultState,'uncertain_price');assert.equal(r.candidateProbabilities.length,3);
 assert.ok(r.candidateProbabilities.every(c=>c.probability<34));
}));
test('Ariston low-pressure yes strengthens only the source pressure point; no does not eliminate it',()=>run(async repo=>{
 const ai=generalAI({brand:'Ariston',model:'CLAS ONE',errorCode:'1P1'});ai.classifyAnswer=async(_q,m)=>m==='Hayır'?'no':'yes';
 const first=await diagnoseBoiler('Ariston CLAS ONE 1P1 hatası',[],null,repo,ai),second=await diagnoseBoiler('Hayır',[],first.stateToken,repo,ai);
 const q=(await repo.getQuestions()).find(q=>q.id===decodeBoilerState(second.stateToken).pendingQuestionId);
 assert.equal(q.question_key,'display_low_water_pressure');
 for(const [answer,wanted] of [['Evet',25],['Hayır',7.69]]){
  const r=await diagnoseBoiler(answer,[],second.stateToken,repo,ai);
  assert.equal(r.candidateProbabilities.find(c=>/su basıncı/.test(c.name)).probability,wanted);
 }
}));

test('source priority cannot invent an effect, change a weight or promote a pressure-free fault pool',()=>run(async repo=>{
 const device=await repo.resolveDevice('Ariston','CLAS ONE');
 const candidates=(await repo.getCandidates(device.familyId)).filter(c=>c.error_code==='1P1');
 const questions=await repo.getQuestions(),effects=await repo.getEffects(candidates.map(c=>c.id));
 const originals=structuredClone({questions,effects,candidates}),key='display_low_water_pressure';
 const priority=qs=>qs.find(q=>q.question_key===key).priority;
 assert.equal(priority(reviewedBoilerQuestions(candidates,questions,effects)),81);
 assert.equal(priority(reviewedBoilerQuestions(candidates,questions,[])),70);
 assert.equal(priority(reviewedBoilerQuestions(candidates.map(c=>({...c,sourceRecord:undefined})),questions,effects)),70);
 assert.equal(priority(reviewedBoilerQuestions(candidates.filter(c=>!c.candidate_name.includes('su basıncı')),questions,effects)),70);
 assert.deepEqual({questions,effects,candidates},originals);
}));
