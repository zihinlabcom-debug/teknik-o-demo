import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVE_SERVICE_CATEGORIES,classifyServiceCategory} from '../src/lib/service-categories.ts';
import {diagnoseService,decodeConversationState} from '../src/lib/service-conversation.ts';
import {encodeBoilerState,decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';

async function signed(run){
 const saved=process.env.DIAGNOSIS_STATE_SECRET;process.env.DIAGNOSIS_STATE_SECRET='service-routing-offline-secret';
 try{return await run();}finally{if(saved===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=saved;}
}
function fakeBoiler(){
 const calls=[];
 const run=async(message,history,token)=>{
  calls.push({message,history,token});const prior=decodeBoilerState(token),n=(prior?.totalAskedQuestions??0)+1;
  const state={version:1,sessionId:'fake-boiler',brand:'Test',model:'Model',errorCode:'F28',familyId:'family',officialModelId:null,
   codeAsked:true,pendingIdentity:null,answers:[],askedQuestionIds:Array.from({length:n},(_,i)=>'q'+i),totalAskedQuestions:n,
   pendingQuestionId:'q'+n,pendingAskedAt:'2026-09-29T00:00:00Z',firstThresholdAt:null,finished:false,resultState:'diagnosing'};
  return {aiText:'Gözleminiz '+n+' nedir?',stateToken:encodeBoilerState(state),resultState:'diagnosing',assessmentComplete:false,
   candidateProbabilities:[{name:'Manufacturer candidate',probability:100}],groupProbabilities:[],isReadyForPrice:false};
 };
 return {run,calls};
}
test('six active categories and free-text examples classify without a boiler default',()=>{
 assert.deepEqual(ACTIVE_SERVICE_CATEGORIES.map(c=>c.id),['boiler','painting','cleaning','moving','sofa_cleaning','carpet_cleaning']);
 const cases=[['Demirdöküm nitromiX F76','boiler'],['3+1 evi boyatmak istiyorum','painting'],
  ['ev temizliği yaptırmak istiyorum','cleaning'],['evimi başka eve taşıyacağım','moving'],
  ['koltuklarımı yıkatmak istiyorum','sofa_cleaning'],['6 metrekare halılarımı yıkatmak istiyorum','carpet_cleaning']];
 for(const [message,category] of cases)assert.equal(classifyServiceCategory(message),category,message);
 for(const message of ['Yardım istiyorum','Bosch klimam EA veriyor','Evimi boyatıp koltukları yıkatacağım'])
  assert.equal(classifyServiceCategory(message),null,message);
});
test('every non-boiler card has isolated category state and never invokes the boiler engine',()=>signed(async()=>{
 const forbidden=async()=>{throw Error('Non-boiler engine fallback forbidden');};
 for(const c of ACTIVE_SERVICE_CATEGORIES.filter(c=>c.id!=='boiler')){
  const result=await diagnoseService(c.label+' hizmeti istiyorum',[],null,{category:c.id,categorySelected:true,boiler:forbidden,turnId:c.id});
  assert.equal(result.category,c.id);assert.equal(result.categoryState.category,c.id);
  assert.equal(result.stateToken,null);assert.deepEqual(result.candidateProbabilities,[]);
  assert.doesNotMatch(result.aiText,/markası|modeli|hata kodu/);
  assert.equal(result.answeredSystemQuestions,0);assert.equal(result.visualProgress,0);
  const state=decodeConversationState(result.conversationToken);assert.equal(state.category,c.id);assert.equal(state.boilerStateToken,null);
 }
}));
test('ambiguous/unsupported messages ask for a category; an explicit selection routes to boiler',()=>signed(async()=>{
 const engine=fakeBoiler();
 for(const message of ['Arızam var','Klima desteği istiyorum']){
  const reply=await diagnoseService(message,[],null,{boiler:engine.run});
  assert.equal(reply.category,null);assert.equal(reply.resultState,'category_clarification');
  assert.equal(reply.options.length,6);assert.equal(engine.calls.length,0);
 }
 const boiler=await diagnoseService('Kombi hizmeti',[],null,{category:'boiler',categorySelected:true,boiler:engine.run});
 assert.equal(boiler.category,'boiler');assert.equal(engine.calls.length,1);
}));
test('category changes discard the child token, candidates, timeline and old category history',()=>signed(async()=>{
 const engine=fakeBoiler();
 const first=await diagnoseService('Kombim arızalı',[],null,{category:'boiler',boiler:engine.run,turnId:'first'});
 const moving=await diagnoseService('Evimi taşıyacağım',[{role:'user',content:'Kombim F76'}],first.stateToken,
  {conversationToken:first.conversationToken,category:'boiler',boiler:engine.run,turnId:'moving'});
 assert.equal(moving.category,'moving');assert.equal(moving.stateToken,null);assert.deepEqual(moving.candidateProbabilities,[]);
 assert.equal(moving.answeredSystemQuestions,0);assert.equal(engine.calls.length,1);
 const back=await diagnoseService('Kombi hizmeti',[{role:'user',content:'Evimi taşıyacağım'}],first.stateToken,
  {conversationToken:moving.conversationToken,category:'boiler',categorySelected:true,boiler:engine.run,turnId:'back'});
 assert.equal(back.category,'boiler');assert.equal(engine.calls.length,2);
 assert.equal(engine.calls[1].token,null);assert.deepEqual(engine.calls[1].history,[]);
 assert.equal(back.questionCount,1);assert.equal(back.answeredSystemQuestions,0);
}));
test('progress counts actual replies including unknown, caps visually at 100 and never finishes diagnosis',()=>signed(async()=>{
 const engine=fakeBoiler();
 let reply=await diagnoseService('Kombi arızası',[],null,{category:'boiler',boiler:engine.run,turnId:'initial'});
 assert.equal(reply.visualProgress,0);
 const expected=[13,26,39,52,65,78,91,100,100];
 for(let i=0;i<expected.length;i++){
  reply=await diagnoseService('Bilmiyorum',[],reply.stateToken,{conversationToken:reply.conversationToken,boiler:engine.run,turnId:'answer-'+i});
  assert.equal(reply.answeredSystemQuestions,i+1);assert.equal(reply.visualProgress,expected[i]);
  assert.equal(reply.resultState,'diagnosing');assert.equal(reply.awaitingAnswer,true);assert.equal(reply.isReadyForPrice,false);
  assert.deepEqual(reply.candidateProbabilities,[{name:'Manufacturer candidate',probability:100}]);
 }
}));
test('reprocessing the same turn does not count or run the engine again; equal text for another question does count',()=>signed(async()=>{
 const engine=fakeBoiler();
 const first=await diagnoseService('Kombi arızası',[],null,{boiler:engine.run,turnId:'initial'});
 const second=await diagnoseService('Hayır',[],first.stateToken,{conversationToken:first.conversationToken,boiler:engine.run,turnId:'answer'});
 const duplicate=await diagnoseService('Hayır',[],second.stateToken,{conversationToken:second.conversationToken,boiler:engine.run,turnId:'answer'});
 assert.equal(duplicate.visualProgress,13);assert.equal(engine.calls.length,2);
 assert.equal(duplicate.stateToken,second.stateToken);assert.equal(duplicate.resultState,second.resultState);
 const third=await diagnoseService('Hayır',[],second.stateToken,{conversationToken:second.conversationToken,boiler:engine.run,turnId:'different-answer'});
 assert.equal(third.visualProgress,26);assert.equal(engine.calls.length,3);
}));
test('spontaneous identity and unsolicited placeholder details do not increase progress',()=>signed(async()=>{
 const engine=fakeBoiler();
 const first=await diagnoseService('Demirdöküm nitromiX F76',[],null,{boiler:engine.run});
 assert.equal(first.visualProgress,0);
 const moving=await diagnoseService('Evimi taşıyacağım',[],null,{});
 const extra=await diagnoseService('3+1, üçüncü kat.',[],null,{conversationToken:moving.conversationToken});
 assert.equal(extra.category,'moving');assert.equal(extra.visualProgress,0);assert.equal(extra.awaitingAnswer,false);
}));

test('identity, safety, diagnostic, clarification and verification replies use the same visual counter',()=>signed(async()=>{
 const engine=fakeBoiler();
 const stages=['brand','model','errorCode','safety','diagnostic','clarification','verification'];
 const run=async(...args)=>{
  const result=await engine.run(...args),state=decodeBoilerState(result.stateToken),stage=stages[state.totalAskedQuestions-1];
  state.pendingIdentity=['brand','model','errorCode'].includes(stage)?stage:null;
  if(state.pendingIdentity)state.pendingQuestionId=null;
  state.resultState=stage==='verification'?'verification':'diagnosing';
  return {...result,resultState:state.resultState,stateToken:encodeBoilerState(state)};
 };
 let reply=await diagnoseService('Kombim arızalı',[],null,{boiler:run,turnId:'start'});
 for(let i=0;i<stages.length;i++){
  reply=await diagnoseService('Bilmiyorum',[],reply.stateToken,{conversationToken:reply.conversationToken,boiler:run,turnId:stages[i]});
  assert.equal(reply.answeredSystemQuestions,i+1,stages[i]);assert.equal(reply.visualProgress,(i+1)*13,stages[i]);
 }
}));
test('ordinary boiler observations mentioning cleaning do not become a category change',()=>signed(async()=>{
 const engine=fakeBoiler();
 const first=await diagnoseService('Kombim arızalı',[],null,{boiler:engine.run});
 const next=await diagnoseService('Kombinin filtre temizliği yapılmıştı.',[],first.stateToken,{conversationToken:first.conversationToken,boiler:engine.run});
 assert.equal(next.category,'boiler');assert.equal(engine.calls.length,2);assert.equal(next.visualProgress,13);
}));
test('debug input cannot alter routing, weights, pricing or progress; final technical prose is hidden',()=>signed(async()=>{
 const terminal=async()=>({aiText:'Olası arızalar güvenilir biçimde yeterince ayrılamadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
  stateToken:null,resultState:'uncertain_price',assessmentComplete:true,isReadyForPrice:false,
  candidateProbabilities:[{name:'A',probability:65},{name:'B',probability:35}],groupProbabilities:[]});
 const normal=await diagnoseService('Kombi arızası',[],null,{boiler:terminal});
 const debug=await diagnoseService('Kombi arızası',[],null,{boiler:terminal,debug:true});
 assert.equal(normal.aiText,'');assert.equal(debug.aiText,'');assert.equal(normal.resultState,'uncertain_price');
 assert.deepEqual(normal.candidateProbabilities,debug.candidateProbabilities);assert.equal(normal.visualProgress,debug.visualProgress);
}));
