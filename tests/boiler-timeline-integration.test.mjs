import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeBoilerState,diagnoseBoiler,encodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {withGeneralRepository,generalAI,signedGeneral} from './helpers/stage3-general-runtime.mjs';
const story='Önceleri normal çalışıyordu sonra hata verdi reset attım düzeldi bir süre sonra tekrar verdi böyle devam etti sonra artık hata hep çıkıyor';
const productionStory='bir süre çalıştıktan sonra veriyordu, reset atınca düzeliyordu ama sonra tekrar ediyordu; en son sürekli vermeye başladı';
const clarification='Şu anda resetten sonra bir süre çalışıyor mu, yoksa hata hemen tekrar mı geliyor?';

async function productionFlow(repo){
 const ai=generalAI({brand:'Demirdokum',model:'nitromix',errorCode:'F76'});
 ai.chooseQuestion=async({questions})=>(questions.find(q=>q.question_key==='display_temperature_rise')??questions[0])?.id??null;
 // A mistaken AI reading of the historical clause must not bypass timeline validation.
 ai.classifyAnswer=async q=>q.question_key==='fault_timing_after_start'?'after_some_time':'no';
 const timingId=(await repo.getQuestions()).find(q=>q.question_key==='fault_timing_after_start').id;
 ai.extractObservedAnswers=async message=>message===productionStory?[{
  questionId:timingId,answerKey:'after_some_time',quote:'bir süre çalıştıktan sonra veriyordu',
 }]:message==='Bilmiyorum, bazen oluyor.'?[{
  questionId:timingId,answerKey:'intermittent',quote:'bazen oluyor',
 }]:[];
 const first=await diagnoseBoiler('Demirdöküm nitromiX F76',[],null,repo,ai);
 assert.match(first.aiText,/gaz kokusu/i);
 const second=await diagnoseBoiler('Hayır',[],first.stateToken,repo,ai);
 assert.equal(decodeBoilerState(second.stateToken).pendingQuestionId,(await repo.getQuestions()).find(q=>q.question_key==='display_temperature_rise').id);
 const third=await diagnoseBoiler('Hayır',[],second.stateToken,repo,ai);
 assert.equal(decodeBoilerState(third.stateToken).pendingQuestionId,timingId);
 assert.equal(decodeBoilerState(third.stateToken).totalAskedQuestions,3);
 return {ai,third,timingId};
}

test('production no/no/timeline flow asks exactly one clarification; a second ambiguous reply is neutral',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const {ai,third}=await productionFlow(repo);
 const fourth=await diagnoseBoiler(productionStory,[],third.stateToken,repo,ai),state=decodeBoilerState(fourth.stateToken);
 assert.equal(fourth.aiText,clarification);assert.equal(fourth.resultState,'diagnosing');
 assert.equal(state.timeline.current.timing,null);assert.equal(state.timeline.current.persistent,true);
 assert.deepEqual(state.timeline.historical.map(e=>e.kind),['after_some_time','intermittent','reset_temporarily_helped']);
 assert.equal(state.totalAskedQuestions,4);assert.equal(state.timelineClarificationAsked,true);
 const timing=state.answers.filter(a=>a.evidenceGroup==='fault_timing_after_start');
 assert.equal(timing.length,1);assert.equal(timing[0].answerKey,'unknown');
 assert.deepEqual(fourth.candidateProbabilities,third.candidateProbabilities);
 const fifth=await diagnoseBoiler('Bilmiyorum, bazen oluyor.',[],fourth.stateToken,repo,ai),next=decodeBoilerState(fifth.stateToken);
 assert.notEqual(fifth.aiText,clarification);assert.equal(next.totalAskedQuestions,4);
 assert.equal(next.answers.filter(a=>a.evidenceGroup==='fault_timing_after_start').length,1);
 assert.equal(next.answers.find(a=>a.evidenceGroup==='fault_timing_after_start').answerKey,'unknown');
 assert.deepEqual(fifth.candidateProbabilities,fourth.candidateProbabilities);
})));

for(const [reply,key] of [['hemen tekrar geliyor','immediate'],['bir süre çalışıyor sonra veriyor','after_some_time']]){
 test('production clarification accepts only current timing, counted once: '+key,()=>signedGeneral(()=>withGeneralRepository(async repo=>{
  const {ai,third}=await productionFlow(repo);
  const fourth=await diagnoseBoiler(productionStory,[],third.stateToken,repo,ai);
  const fifth=await diagnoseBoiler(reply,[],fourth.stateToken,repo,ai),state=decodeBoilerState(fifth.stateToken);
  assert.equal(state.timeline.current.timing,key);assert.equal(state.timeline.current.persistent,true);assert.equal(state.timeline.historical.length,3);
  const timing=state.answers.filter(a=>a.evidenceGroup==='fault_timing_after_start');
  assert.equal(timing.length,1);assert.equal(timing[0].answerKey,key);assert.equal(state.totalAskedQuestions,4);
  const ordinary=await diagnoseBoiler(reply,[],third.stateToken,repo,ai);
  assert.deepEqual(fifth.candidateProbabilities,ordinary.candidateProbabilities);
 })));
}

test('existing F76 başlar başlamaz weights equal ordinary immediate timing',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const {ai,third}=await productionFlow(repo);
 const immediate=await diagnoseBoiler('hemen tekrar geliyor',[],third.stateToken,repo,ai);
 const starts=await diagnoseBoiler('başlar başlamaz',[],third.stateToken,repo,ai);
 assert.equal(decodeBoilerState(starts.stateToken).timeline.current.timing,'immediate');
 assert.deepEqual(starts.candidateProbabilities,immediate.candidateProbabilities);
 assert.equal(decodeBoilerState(starts.stateToken).totalAskedQuestions,3);
})));

test('production clarification consumes the last slot but cannot exceed twelve',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const {ai,third}=await productionFlow(repo);
 for(const budget of [11,12]){
  const state=decodeBoilerState(third.stateToken);state.totalAskedQuestions=budget;
  const result=await diagnoseBoiler(productionStory,[],encodeBoilerState(state),repo,ai),after=decodeBoilerState(result.stateToken);
  assert.equal(after.totalAskedQuestions,12);
  if(budget===11){
   assert.equal(result.aiText,clarification);
   const final=await diagnoseBoiler('Bilmiyorum',[],result.stateToken,repo,ai);
   assert.equal(decodeBoilerState(final.stateToken).totalAskedQuestions,12);assert.notEqual(final.aiText,clarification);
  }else{assert.notEqual(result.aiText,clarification);assert.equal(result.resultState,'uncertain_price');}
 }
})));

test('a historical timeline gets one current-timing clarification within the total question budget',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const ai=generalAI({brand:'Demirdokum',model:'nitromix',errorCode:'F76'});
 ai.classifyAnswer=async q=>q.is_safety_question?'no':'after_some_time';
 const first=await diagnoseBoiler('Demirdokum nitromix F76',[],null,repo,ai);
 const second=await diagnoseBoiler(story,[],first.stateToken,repo,ai),state=decodeBoilerState(second.stateToken);
 assert.match(second.aiText,/Şu anda resetten sonra/);assert.equal(state.timelineClarificationAsked,true);
 assert.equal(state.totalAskedQuestions,2);assert.equal(state.timeline.current.timing,null);
 assert.ok(state.timeline.historical.some(e=>e.kind==='reset_temporarily_helped'));
 const third=await diagnoseBoiler('Bilmiyorum',[],second.stateToken,repo,ai),next=decodeBoilerState(third.stateToken);
 assert.doesNotMatch(third.aiText,/Şu anda resetten sonra/);
 assert.equal(next.answers.find(a=>a.evidenceGroup==='fault_timing_after_start').answerKey,'unknown');
 assert.equal(next.timelineClarificationAsked,true);assert.ok(next.totalAskedQuestions<=12);
})));
test('clear current timing replaces a prior timing observation, historical evidence remains descriptive',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const ai=generalAI({brand:'Demirdokum',model:'nitromix',errorCode:'F76'});
 ai.classifyAnswer=async q=>q.is_safety_question?'no':'after_some_time';
 const first=await diagnoseBoiler('Demirdokum nitromix F76',[],null,repo,ai);
 const second=await diagnoseBoiler(story,[],first.stateToken,repo,ai);
 const third=await diagnoseBoiler('Şu anda hata hemen geliyor',[],second.stateToken,repo,ai),state=decodeBoilerState(third.stateToken);
 assert.equal(state.answers.filter(a=>a.evidenceGroup==='fault_timing_after_start').length,1);
 assert.equal(state.answers.find(a=>a.evidenceGroup==='fault_timing_after_start').answerKey,'immediate');
 assert.equal(state.timeline.current.timing,'immediate');assert.ok(state.timeline.historical.length>=3);
 const locked=decodeBoilerState(second.stateToken);locked.totalAskedQuestions=12;
 const final=await diagnoseBoiler('Bilmiyorum',[],encodeBoilerState(locked),repo,ai);
 assert.equal(decodeBoilerState(final.stateToken).totalAskedQuestions,12);assert.equal(final.resultState,'uncertain_price');
})));

test('a later persistent fault moves the old current timing to history and waits for one clarification',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const ai=generalAI({brand:'Demirdokum',model:'nitromix',errorCode:'F76'});
 ai.classifyAnswer=async q=>q.is_safety_question?'no':'unknown';
 const first=await diagnoseBoiler('Demirdokum nitromix F76 Bir süre çalıştıktan sonra hata veriyor.',[],null,repo,ai);
 const second=await diagnoseBoiler('Hayır, gaz kokusu almıyorum.',[],first.stateToken,repo,ai);
 const third=await diagnoseBoiler('Artık hata hep çıkıyor.',[],second.stateToken,repo,ai);
 const state=decodeBoilerState(third.stateToken);
 assert.equal(state.timeline.current.persistent,true);assert.equal(state.timeline.current.timing,null);
 assert.ok(state.timeline.historical.some(e=>e.kind==='after_some_time'));
 assert.equal(state.answers.find(a=>a.evidenceGroup==='fault_timing_after_start').answerKey,'unknown');
 assert.match(third.aiText,/Şu anda resetten sonra/);
 assert.deepEqual(new Set(third.candidateProbabilities.map(c=>c.probability)),new Set([33.33,33.34]));
})));
