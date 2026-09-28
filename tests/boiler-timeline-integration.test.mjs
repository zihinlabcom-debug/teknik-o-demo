import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeBoilerState,diagnoseBoiler,encodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {withGeneralRepository,generalAI,signedGeneral} from './helpers/stage3-general-runtime.mjs';
const story='Önceleri normal çalışıyordu sonra hata verdi reset attım düzeldi bir süre sonra tekrar verdi böyle devam etti sonra artık hata hep çıkıyor';

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
