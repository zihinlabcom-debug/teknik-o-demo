import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyServiceCategory} from '../src/lib/service-categories.ts';
import {diagnoseService,decodeConversationState} from '../src/lib/service-conversation.ts';
import {diagnoseBoiler,decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {withCopaRepository} from './helpers/copa-stage3-runtime.mjs';
import {generalAI,signedGeneral} from './helpers/stage3-general-runtime.mjs';
import {mentionedCatalogModel,officialModelLabelAlternatives} from '../src/lib/boiler-identity-suggestions.ts';
const data=JSON.parse(readFileSync(new URL('./fixtures/free-text-relevance.json',import.meta.url),'utf8'));
const run=f=>signedGeneral(()=>withCopaRepository(f,{data}));
const emptyAI=()=>generalAI({brand:'',model:'',errorCode:''});
const engine=(repo,ai=emptyAI())=>(message,history,token)=>diagnoseBoiler(message,history,token,repo,ai);

test('free-text A-I classification uses the runtime code grammar and keeps categories isolated',()=>{
 for(const [text,category] of [['Ariston CLAS ONE 1P1 hatası veriyor','boiler'],['Demirdöküm nitromiX F76 hatası veriyor','boiler'],
  ['Bosch Condens 2500 EA hatası veriyor','boiler'],['Vaillant ecoTEC intro F28','boiler'],['3+1 evi boyatmak istiyorum','painting'],
  ['evimi taşıyacağım','moving'],['koltuklarımı yıkatacağım','sofa_cleaning'],['halılarımı yıkatacağım','carpet_cleaning'],
  ['Yardım istiyorum',null],['Bosch klimam EA veriyor',null]])assert.equal(classifyServiceCategory(text),category,text);
});
test('A: Ariston free text survives canonicalized or empty AI identity and reaches the exact seven-candidate pool',()=>run(async repo=>{
 for(const ai of [emptyAI(),generalAI({brand:'Ariston',model:'CLAS ONE / CLAS ONE SYSTEM',errorCode:''})]){
  const r=await diagnoseService('Ariston CLAS ONE 1P1 hatası veriyor',[],null,{boiler:engine(repo,ai)}),s=decodeBoilerState(r.stateToken);
  assert.equal(r.category,'boiler');assert.equal(s.brand,'Ariston');assert.equal(s.model,'CLAS ONE');assert.equal(s.errorCode,'1P1');
  assert.ok(s.officialModelId);assert.equal(s.pendingIdentity,null);assert.equal(r.candidateProbabilities.length,7);
  assert.match(r.aiText,/Gaz kokusu/);assert.equal(r.questionCount,1);
 }
}));
test('B-D: explicit identity is recovered from customer/catalog evidence when AI omits it',()=>run(async repo=>{
 for(const [text,brand,code,n] of [['Demirdöküm nitromiX F76 hatası veriyor','DemirDöküm','F76',3],
  ['Bosch Condens 2500 W EA hatası veriyor','Bosch','EA',9],['Vaillant ecoTEC intro VUW 18/24 AS/1-1 F28','Vaillant','F28',6]]){
  const r=await diagnoseService(text,[],null,{boiler:engine(repo)}),s=decodeBoilerState(r.stateToken);
  assert.equal(r.category,'boiler');assert.equal(s.brand,brand);assert.equal(s.errorCode,code);assert.equal(s.pendingIdentity,null);
  assert.equal(r.candidateProbabilities.length,n,text);assert.equal(r.questionCount,1);
 }
}));
test('J: category confirmation replays the initial identity/timeline even if client sends no history',()=>run(async repo=>{
 const firstText='Ariston CLAS ONE 1P1 hatası veriyor; bir süre çalıştıktan sonra oluyor. Evimi boyatmak da istiyorum.';
 const first=await diagnoseService(firstText,[],null,{boiler:engine(repo)});
 assert.equal(first.category,null);assert.equal(first.resultState,'category_clarification');
 assert.ok(decodeConversationState(first.conversationToken).pendingCategoryHistory.some(m=>m.content===firstText));
 const second=await diagnoseService('Kombi',[],null,{conversationToken:first.conversationToken,boiler:engine(repo)});
 const s=decodeBoilerState(second.stateToken);
 assert.equal(s.brand,'Ariston');assert.equal(s.model,'CLAS ONE');assert.equal(s.errorCode,'1P1');assert.equal(s.pendingIdentity,null);
 assert.equal(second.candidateProbabilities.length,7);assert.equal(s.timeline.current.timing,'after_some_time');
 assert.match(second.aiText,/Gaz kokusu/);assert.equal(second.questionCount,2);
}));
test('category-confirmed model/code without a brand asks only the missing brand',()=>run(async repo=>{
 const ai=generalAI({brand:'',model:'CLAS ONE',errorCode:''});
 const first=await diagnoseService('Kombide CLAS ONE 1P1 hatası var, boya hizmeti de istiyorum.',[],null,{boiler:engine(repo,ai)});
 const r=await diagnoseService('Kombi',[],null,{conversationToken:first.conversationToken,boiler:engine(repo,ai)}),s=decodeBoilerState(r.stateToken);
 assert.equal(s.model,'CLAS ONE');assert.equal(s.errorCode,'1P1');assert.equal(s.pendingIdentity,'brand');assert.match(r.aiText,/markası/);
}));
test('K: explicit boiler card starts the normal missing-identity flow',()=>run(async repo=>{
 const r=await diagnoseService('Kombi hizmeti istiyorum',[],null,{category:'boiler',categorySelected:true,boiler:engine(repo)});
 assert.equal(r.category,'boiler');assert.equal(decodeBoilerState(r.stateToken).pendingIdentity,'brand');assert.equal(r.questionCount,1);
}));
test('catalog recovery never accepts assistant identity or silently absorbs an unknown numeric variant',()=>run(async repo=>{
 const fake=generalAI({brand:'Bosch',model:'Condens 2500 W',errorCode:'EA'});
 const r=await diagnoseBoiler('Kombim bozuldu',[{role:'assistant',content:'Bosch Condens 2500 W EA olabilir.'}],null,repo,fake);
 assert.equal(decodeBoilerState(r.stateToken).brand,'');
 const bad=await diagnoseBoiler('Demirdöküm nitromiX P99 F76',[],null,repo,emptyAI());
 assert.equal(bad.candidateProbabilities.length,0);assert.notEqual(decodeBoilerState(bad.stateToken).officialModelId,'p24');
}));

test('literal catalog recovery keeps capacities and unknown alphabetic sibling variants separate',()=>run(async repo=>{
 const catalog=await repo.getIdentityCatalog();
 for(const text of ['Ariston CLAS ONE PLUS 1P1','Demirdöküm nitromiX P99 F76','Demirdöküm nitromiX II F76'])
  assert.equal(mentionedCatalogModel(catalog,/^Ariston/.test(text)?'Ariston':'DemirDöküm',[text],/^Ariston/.test(text)?'1P1':'F76'),null,text);
 assert.equal(mentionedCatalogModel(catalog,'DemirDöküm',['Demirdokum nitromiX P24 NG HEP F.76 hatası'],'F.76'),'nitromiX P24 NG HEP');
 assert.deepEqual(officialModelLabelAlternatives('CLAS ONE / CLAS ONE SYSTEM'),['CLAS ONE','CLAS ONE SYSTEM']);
 assert.deepEqual(officialModelLabelAlternatives('ecoTEC intro VUW 18/24 AS/1-1'),[]);
 assert.deepEqual(officialModelLabelAlternatives('Domiproject F 24 / F 32'),[]);
 assert.deepEqual(officialModelLabelAlternatives('VICTRIX TERA 24 PLUS'),[]);
}));

test('category history merged with caller history preserves one observation and one budget slot per actual question',()=>run(async repo=>{
 const text='Ariston CLAS ONE 1P1 hatası, bir süre çalıştıktan sonra oluyor; evi de boyatmak istiyorum.';
 const first=await diagnoseService(text,[],null,{boiler:engine(repo)});
 const history=[{role:'user',content:text},{role:'assistant',content:first.aiText}];
 const r=await diagnoseService('Kombi',history,null,{conversationToken:first.conversationToken,boiler:engine(repo)});
 const state=decodeBoilerState(r.stateToken);
 assert.equal(state.totalAskedQuestions,2);assert.equal(state.answers.filter(a=>a.evidenceGroup==='fault_timing_after_start').length,1);
 assert.equal(state.timeline.current.quote,text);
}));
