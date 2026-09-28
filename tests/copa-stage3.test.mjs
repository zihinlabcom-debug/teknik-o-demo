import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateAllowedForFuel,questionAllowedForFuel} from '../src/lib/boiler-fuel.ts';
import {decodeBoilerState,diagnoseBoiler,encodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {calculateBoilerWeights,selectCandidatePool} from '../src/lib/boiler-probability.ts';
import {copaData,fakeCopaAI,withCopaRepository} from './helpers/copa-stage3-runtime.mjs';

async function signed(run){
 const saved=process.env.DIAGNOSIS_STATE_SECRET;process.env.DIAGNOSIS_STATE_SECRET='copa-offline-test-secret';
 try{return await run();}finally{if(saved===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=saved;}
}

test('COPA gas family, official variants and safe compact aliases resolve from the real repository',()=>withCopaRepository(async repo=>{
 for(const brand of ['COPA','Copa','copa'])assert.equal((await repo.resolveDevice(brand,'Eomix')).fuelType,'gas');
 assert.equal((await repo.resolveDevice('COPA','Eomix')).officialModelId,null);
 assert.equal((await repo.resolveDevice('COPA','EomixPlus')).familyName,'Eomix Plus');
 assert.equal((await repo.resolveDevice('COPA','Eomix 20')).officialModelName,'Eomix 20');
 assert.equal(await repo.resolveDevice('COPA','Eomix 99'),null);
}));

test('e-Lecto/e Lecto/eLecto aliases resolve as electric; 24 and 12 stay different exact models',()=>withCopaRepository(async repo=>{
 for(const model of ['e-Lecto','e Lecto','eLecto','electo'])assert.equal((await repo.resolveDevice('COPA',model)).fuelType,'electric');
 assert.equal((await repo.resolveDevice('COPA','e-Lecto 24')).officialModelName,'e-Lecto 24 kW');
 assert.equal((await repo.resolveDevice('COPA','eLecto 12')).officialModelName,'e-Lecto 12 kW');
}));

test('electric rejects gas safety, household gas, ignition, flame and flue questions deterministically',()=>{
 for(const key of ['safety_gas_smell','household_gas_availability','ignition_attempt_sequence']){
  assert.equal(questionAllowedForFuel({question_key:key,question_text:'Bu gözlem var mı?',evidence_group:null},'electric'),false);
 }
 for(const text of ['Gaz vanası açık mı?','Alev görüyor musunuz?','Baca çıkışında engel var mı?','İyonizasyon ölçümü var mı?'])
  assert.equal(questionAllowedForFuel({question_key:'other',question_text:text},'electric'),false);
 assert.equal(questionAllowedForFuel({question_key:'water_pressure',question_text:'Su basıncı düşük mü?'},'electric'),true);
 assert.equal(questionAllowedForFuel({question_key:'safety_gas_smell',question_text:'Gaz kokusu alıyor musunuz?'},'gas'),true);
});

test('electric candidate guard rejects gas classes and combustion-specific sensor labels',()=>{
 for(const fault_class of ['gas_supply','ignition','combustion_air'])
  assert.equal(candidateAllowedForFuel({candidate_name:'Teknik nokta',fault_class},'electric'),false);
 assert.equal(candidateAllowedForFuel({candidate_name:'Baca gazı sensörü sorunu',fault_class:'sensor'},'electric'),false);
 assert.equal(candidateAllowedForFuel({candidate_name:'Su basınç sensörü sorunu',fault_class:'sensor'},'electric'),true);
});

test('COPA Eomix E01 reaches real family consensus and retains gas safety',()=>signed(()=>withCopaRepository(async repo=>{
 const message='COPA Eomix E01 hatası veriyor.';
 const result=await diagnoseBoiler(message,[],null,repo,fakeCopaAI(message));
 assert.equal(result.resultState,'diagnosing');assert.equal(result.aiText,'Gaz kokusu alıyor musunuz?');
 assert.deepEqual(result.candidateProbabilities.map(c=>c.name),['Gaz beslemesi sorunu']);
 const state=decodeBoilerState(result.stateToken);
 assert.equal(state.fuelType,'gas');assert.equal(state.officialModelId,null);assert.equal(state.totalAskedQuestions,1);
 const covered=await repo.getErrorCodeModelIds('eomix','E01');
 const pool=selectCandidatePool(await repo.getCandidates('eomix'),'eomix',null,'E01',covered);
 assert.equal(pool.mode,'family_code_consensus');assert.equal(pool.candidates[0].sourceCandidateIds.length,3);
})));

test('a different COPA variant candidate cannot establish false consensus',()=>{
 const data=copaData(), rows=data.candidates.filter(c=>c.family_id==='eomix');
 const changed=structuredClone(rows);changed.find(c=>c.official_model_id==='eomix 35'&&c.error_code==='E01').candidate_name='Başka nokta';
 assert.equal(selectCandidatePool(changed,'eomix',null,'E01',['eomix 20','eomix 24','eomix 35']).requiresExactModel,true);
});

test('e-Lecto 24 F47 has pressure-sensor/wiring only and never asks a gas question',()=>signed(()=>withCopaRepository(async repo=>{
 const message='COPA e-Lecto 24 F47';
 const result=await diagnoseBoiler(message,[],null,repo,fakeCopaAI(message));
 const state=decodeBoilerState(result.stateToken);
 assert.equal(state.brand,'COPA');assert.equal(state.fuelType,'electric');assert.equal(state.officialModelId,'e lecto 24 kw');
 assert.deepEqual(new Set(result.candidateProbabilities.map(c=>c.name)),new Set(['Su basınç sensörü sorunu','Kablolama/soket/bağlantı sorunu']));
 assert.equal(result.resultState,'uncertain_price');assert.equal(state.totalAskedQuestions,0);
 assert.doesNotMatch(result.aiText,/gaz kokusu/i);
})));

test('unsupported e-Lecto 12 F47 resolves its catalog model but cannot inherit the 24 kW pool',()=>signed(()=>withCopaRepository(async repo=>{
 const message='COPA e-Lecto 12 F47';const result=await diagnoseBoiler(message,[],null,repo,fakeCopaAI(message));
 const state=decodeBoilerState(result.stateToken);
 assert.equal(state.officialModelId,'e lecto 12 kw');assert.equal(state.fuelType,'electric');
 assert.equal(result.candidateProbabilities.length,0);assert.equal(result.resultState,'uncertain_price');
})));

test('e-Lecto F34 source supply candidate cannot pass pricing from an unearned relative 100',()=>signed(()=>withCopaRepository(async repo=>{
 const message='COPA e-Lecto 24 F34';const result=await diagnoseBoiler(message,[],null,repo,fakeCopaAI(message));
 assert.deepEqual(result.candidateProbabilities,[{name:'Elektrik besleme/gerilim sorunu',probability:100}]);
 assert.equal(result.resultState,'uncertain_price');assert.equal(result.pricingData,null);
})));

test('electric filtering protects AI options and ignores stale combustion effects without forgetting evidence',()=>signed(async()=>{
 const data=copaData(), q=data.questions.find(q=>q.question_key==='display_low_water_pressure');
 const rows=data.candidates.filter(c=>c.error_code==='F47');
 data.effects=rows.flatMap(c=>[
  {candidate_id:c.id,question_id:'safety_gas_smell',answer_key:'yes',effect:'support'},
  {candidate_id:c.id,question_id:'ignition_attempt_sequence',answer_key:'silent_immediate',effect:'support'},
  {candidate_id:c.id,question_id:'gas_other_appliance',answer_key:'no',effect:'support'},
 ]);
 data.effects.push({candidate_id:rows[0].id,question_id:q.id,answer_key:'yes',effect:'support'});
 await withCopaRepository(async repo=>{
  const message='COPA e-Lecto 24 F47',ai=fakeCopaAI(message);
  ai.chooseQuestion=async({questions,effects})=>{
   assert.ok(questions.every(question=>questionAllowedForFuel(question,'electric')));
   assert.ok(effects.every(e=>e.question_id===q.id));return q.id;
  };
  const result=await diagnoseBoiler(message,[],null,repo,ai);
  assert.equal(result.aiText,q.question_text);assert.equal(result.resultState,'diagnosing');
  const stale=decodeBoilerState(result.stateToken);
  const historical=data.questions.filter(question=>['safety_gas_smell','gas_other_appliance'].includes(question.id));
  stale.answers=historical.map(question=>({questionId:question.id,answerKey:'no',evidenceGroup:question.evidence_group}));
  stale.askedQuestionIds=[...historical.map(question=>question.id),'ignition_attempt_sequence'];
  stale.totalAskedQuestions=3;stale.pendingQuestionId='ignition_attempt_sequence';
  ai.classifyAnswer=async()=>{throw Error('A stale combustion question must not be answered for an electric device');};
  const resumed=await diagnoseBoiler('Evet',[],encodeBoilerState(stale),repo,ai);
  const resumedState=decodeBoilerState(resumed.stateToken);
  assert.deepEqual(resumedState.answers,stale.answers);
  assert.deepEqual(resumedState.askedQuestionIds.slice(0,3),stale.askedQuestionIds);
  assert.equal(resumedState.totalAskedQuestions,4);
  assert.equal(resumedState.pendingQuestionId,q.id);
 },{data});
}));

test('COPA unknown is neutral and total question budget remains capped at twelve',()=>signed(()=>withCopaRepository(async repo=>{
 const data=copaData(), rows=data.candidates.filter(c=>c.official_model_id==='eomix 20'&&c.error_code==='E08');
 const base=calculateBoilerWeights(rows,[],data.effects);
 const answer={questionId:'display_low_water_pressure',answerKey:'unknown',evidenceGroup:'display_water_pressure'};
 assert.deepEqual(calculateBoilerWeights(rows,[answer],data.effects),base);
 const message='COPA Eomix 20 E08',first=await diagnoseBoiler(message,[],null,repo,fakeCopaAI(message));
 const state=decodeBoilerState(first.stateToken);state.totalAskedQuestions=12;
 const final=await diagnoseBoiler('bilmiyorum',[],encodeBoilerState(state),repo,fakeCopaAI(message));
 assert.equal(decodeBoilerState(final.stateToken).totalAskedQuestions,12);
 assert.equal(final.resultState,'uncertain_price');
})));
