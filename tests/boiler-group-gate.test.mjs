import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseBoiler} from '../src/lib/boiler-diagnosis.ts';
import {withGeneralRepository,generalAI,signedGeneral} from './helpers/stage3-general-runtime.mjs';
const identity={brand:'Test',model:'Model',errorCode:'F28'};
function fixture(single=false){
 const names=single?['Gaz beslemesi sorunu']:['Gaz beslemesi sorunu','Gaz valfi sorunu','Gaz memesi sorunu','Elektronik kontrol sorunu'];
 const candidates=names.map((name,i)=>({id:'c'+i,candidate_name:name,fault_class:i===3?'electronic':'gas_supply',
   family_id:'f',official_model_id:'m',error_code:'F28',verification_status:'verified',is_active:true}));
 const questions=single?[]:[1,2].map(i=>({id:'q'+i,question_key:'q'+i,evidence_group:'q'+i,
   question_text:`Cihazınızda ${i}. gözlemi görüyor musunuz?`,is_active:true,is_safety_question:false,customer_observable:true,answer_options:['yes','unknown']}));
 const effects=questions.flatMap(q=>candidates.map(c=>({candidate_id:c.id,question_id:q.id,answer_key:'yes',effect:c.id==='c3'?'weaken':'support'})));
 let priceCalls=0;
 const repo={async resolveDevice(){return {familyId:'f',familyName:'Model',officialModelId:'m',officialModelName:'Model'};},
   async getCandidates(){return candidates;},async getQuestions(){return questions;},async getEffects(){return effects;},
   async getPricing(){priceCalls++;return {amount:900};},async createSession(){return 'session';},
   async updateSession(){},async recordCandidates(){},async recordQuestionAsked(){},async recordAnswer(){},async deleteAnswer(){}};
 return {repo,calls:()=>priceCalls};
}
test('a group over seventy-five percent cannot bypass the candidate pricing gate',()=>signedGeneral(async()=>{
 const run=fixture(),ai=generalAI(identity);ai.classifyAnswer=async()=> 'yes';
 const first=await diagnoseBoiler('Test Model F28',[],null,run.repo,ai);
 const second=await diagnoseBoiler('Evet',[],first.stateToken,run.repo,ai);
 assert.ok(second.groupProbabilities.find(g=>g.key==='gas_path').probability>75);
 assert.ok(second.candidateProbabilities.every(c=>c.probability<75));
 assert.equal(second.resultState,'diagnosing');assert.equal(run.calls(),0);
 const third=await diagnoseBoiler('Evet',[],second.stateToken,run.repo,ai);
 assert.equal(third.resultState,'uncertain_price');assert.equal(run.calls(),0);
}));
test('one candidate and one hundred percent group share still need accepted diagnostic support',()=>signedGeneral(async()=>{
 const run=fixture(true),result=await diagnoseBoiler('Test Model F28',[],null,run.repo,generalAI(identity));
 assert.equal(result.groupProbabilities[0].probability,100);
 assert.equal(result.resultState,'uncertain_price');assert.equal(run.calls(),0);
}));
test('real F28 source pool retains six exact candidates under technical groups',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const result=await diagnoseBoiler('Vaillant ecoTEC intro VUW 18/24 AS/1-1 F28',[],null,repo,
   generalAI({brand:'Vaillant',model:'ecoTEC intro VUW 18/24 AS/1-1',errorCode:'F28'}));
 assert.equal(result.candidateProbabilities.length,6);
 const groups=result.groupProbabilities;
 for(const key of ['gas_path','ignition','electrical_wiring','electronic_control','combustion_air_flue'])assert.ok(groups.some(g=>g.key===key),key);
 assert.equal(groups.flatMap(g=>g.candidateIds).length,6);
 assert.equal(groups.reduce((sum,g)=>sum+Math.round(g.probability*100),0),10000);
})));
