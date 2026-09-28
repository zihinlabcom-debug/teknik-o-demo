import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeBoilerState,diagnoseBoiler,encodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {withGeneralRepository,generalAI,signedGeneral} from './helpers/stage3-general-runtime.mjs';

test('nitromic requires catalog confirmation, preserves F76 and resumes without a repeat',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const message='Demirdokum nitromic F76 hatasi veriyor',ai=generalAI({brand:'Demirdokum',model:'nitromic',errorCode:'F76'});
 const first=await diagnoseBoiler(message,[],null,repo,ai),state=decodeBoilerState(first.stateToken);
 assert.match(first.aiText,/nitromiX/i);assert.ok(state.identityConfirmation);assert.equal(state.totalAskedQuestions,1);
 assert.equal(first.candidateProbabilities.length,0);assert.equal(state.errorCode,'F76');
 const next=await diagnoseBoiler('evet',[],first.stateToken,repo,ai),confirmed=decodeBoilerState(next.stateToken);
 assert.equal(confirmed.model.toLowerCase(),'nitromix');assert.equal(confirmed.officialModelId,null);
 assert.equal(next.candidateProbabilities.length,3);assert.equal(confirmed.errorCode,'F76');
 assert.equal(confirmed.identityConfirmation,undefined);assert.doesNotMatch(next.aiText,/kastediyorsunuz/i);
 assert.equal(confirmed.sessionId,state.sessionId);
})));
test('brand and model typos ask one compact confirmation costing two independent identity requests',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const ai=generalAI({brand:'DemirDöküm',model:'nitromic',errorCode:'F76'});
 const first=await diagnoseBoiler('demirdokun nitromic F76',[],null,repo,ai),state=decodeBoilerState(first.stateToken);
 assert.deepEqual(state.identityConfirmation.fields,['brand','model']);assert.equal(state.totalAskedQuestions,2);
 assert.equal(state.brand,'');assert.equal(state.errorCode,'F76');
 const next=await diagnoseBoiler('evet',[],first.stateToken,repo,ai),confirmed=decodeBoilerState(next.stateToken);
 assert.equal(confirmed.brand,'DemirDöküm');assert.equal(confirmed.model.toLowerCase(),'nitromix');
 assert.equal(next.candidateProbabilities.length,3);
})));

test('literal brand typos and an introductory word still use the catalog brand confirmation',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 for(const [message,brand] of [['demirdokun nitromic F76','demirdokun'],['Kombim demirdokun nitromic F76','DemirDöküm']]){
  const ai=generalAI({brand,model:'nitromic',errorCode:'F76'});
  const first=await diagnoseBoiler(message,[],null,repo,ai),state=decodeBoilerState(first.stateToken);
  assert.deepEqual(state.identityConfirmation?.fields,['brand','model'],message);
  assert.equal(state.totalAskedQuestions,2);assert.equal(state.errorCode,'F76');
  const second=await diagnoseBoiler('Evet',[],first.stateToken,repo,ai),confirmed=decodeBoilerState(second.stateToken);
  assert.equal(confirmed.brand,'DemirDöküm');assert.equal(second.candidateProbabilities.length,3);
 }
})));
test('exact input avoids confirmation, COPA/Bosch typos use catalog-only proposals',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 for(const [message,identity,confirmation] of [
  ['Demirdokum nitromix F76',{brand:'Demirdokum',model:'nitromix',errorCode:'F76'},false],
  ['COPA eomiks E01',{brand:'COPA',model:'eomiks',errorCode:'E01'},true],
  ['Bosch condes 2500 EA',{brand:'Bosch',model:'condes 2500',errorCode:'EA'},true],
 ]){
  const result=await diagnoseBoiler(message,[],null,repo,generalAI(identity));
  assert.equal(!!decodeBoilerState(result.stateToken).identityConfirmation,confirmation,message);
 }
})));

test('an exact official model with the same family label is not a two-device ambiguity',()=>withGeneralRepository(async repo=>{
 const device=await repo.resolveDevice('Bosch','Condens 2500 W');
 assert.notEqual(device,'ambiguous');assert.ok(device.officialModelId);
 assert.equal(device.officialModelName,'Condens 2500 W');
}));
test('number mismatch asks the label and never proposes P24 for an absent P99',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const result=await diagnoseBoiler('Demirdokum nitromic P99 F76',[],null,repo,
   generalAI({brand:'Demirdokum',model:'nitromic P99',errorCode:'F76'}));
 const state=decodeBoilerState(result.stateToken);
 assert.equal(state.identityConfirmation,undefined);assert.equal(state.pendingIdentity,'model');
 assert.doesNotMatch(result.aiText,/P24/i);assert.equal(result.candidateProbabilities.length,0);
})));

test('a full exact label can replace a pending typo proposal without another confirmation',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const first=await diagnoseBoiler('Demirdokum nitromic F76',[],null,repo,
   generalAI({brand:'Demirdokum',model:'nitromic',errorCode:'F76'}));
 const result=await diagnoseBoiler('nitromiX P24 NG (HEP)',[],first.stateToken,repo,
   generalAI({brand:'Demirdokum',model:'nitromiX P24 NG (HEP)',errorCode:'F76'}));
 const state=decodeBoilerState(result.stateToken);
 assert.equal(state.identityConfirmation,undefined);
 assert.ok(state.officialModelId);assert.equal(state.errorCode,'F76');
 assert.equal(result.candidateProbabilities.length,3);
 assert.doesNotMatch(result.aiText,/kastediyorsunuz/i);
})));
test('confirmation cannot overflow twelve questions and rejected proposals are not silently accepted',()=>signedGeneral(()=>withGeneralRepository(async repo=>{
 const ai=generalAI({brand:'Demirdokum',model:'nitromic',errorCode:'F76'});
 const first=await diagnoseBoiler('Demirdokum nitromic F76',[],null,repo,ai);
 const rejected=await diagnoseBoiler('hayır',[],first.stateToken,repo,ai);
 assert.equal(decodeBoilerState(rejected.stateToken).model,'');assert.equal(rejected.candidateProbabilities.length,0);
 const state=decodeBoilerState(first.stateToken);state.totalAskedQuestions=12;
 const capped=await diagnoseBoiler('hayır',[],encodeBoilerState(state),repo,ai);
 assert.equal(capped.resultState,'uncertain_price');assert.equal(decodeBoilerState(capped.stateToken).totalAskedQuestions,12);
})));
