import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseBoiler, decodeBoilerState } from '../src/lib/boiler-diagnosis.ts';
import { diagnose } from '../src/lib/diagnosis.ts';

const baseCandidate = (id, error_code='F28', status='verified') => ({ id, candidate_name:id,
  verification_status:status, is_active:true, family_id:'family', official_model_id:null, error_code });
const question = (n, group=`group${n}`) => ({ id:`q${n}`,question_key:`topic${n}`,
  question_text:`Cihazınızda ${n}. gözlemi görüyor musunuz?`,evidence_group:group,
  customer_observable:true,is_safety_question:false,is_active:true,priority:13-n });
function fakeStore({ candidates=[baseCandidate('c0'),baseCandidate('c1')], questions=[question(1),question(2)],
  effects=questions.flatMap(q=>[{question_id:q.id,candidate_id:'c0',answer_key:'yes',effect:'support'}]), price=null }={}) {
  const calls={sessions:[],asked:[],answers:[],snapshots:[],updates:[],pricing:[]};
  const store={
    async resolveDevice(){return {familyId:'family',familyName:'Test Model',officialModelId:null,officialModelName:null};},
    async getCandidates(){return candidates;},async getQuestions(){return questions;},async getEffects(){return effects;},
    async getPricing(id){calls.pricing.push(id);return price;},
    async createSession(input){calls.sessions.push(input);return `session-${calls.sessions.length}`;},
    async recordQuestionAsked(sessionId,questionId,askedAt){calls.asked.push({sessionId,questionId,askedAt});},
    async deleteAnswer(sessionId,questionId){calls.answers=calls.answers.filter(item=>item.sessionId!==sessionId||item.questionId!==questionId);},
    async recordAnswer(input){calls.answers.push(input);},
    async recordCandidates(id,items){calls.snapshots.push({id,items});},
    async updateSession(id,input){calls.updates.push({id,input});},
  };
  return {store,calls};
}
const ai = (identity={brand:'Test',model:'Model',errorCode:'F28'})=>({
  async extractIdentity(){return identity;},async classifyAnswer(_q,message){return /bilmiyorum/i.test(message)?'unknown':/hayır/i.test(message)?'no':'yes';},
  async chooseQuestion({questions}){return questions[0]?.id??null;},
});
const turn = (store,provider,message,history=[],token=null)=>diagnoseBoiler(message,history,token,store,provider);

test('real backend path persists a session, customer answers, unknown and candidate snapshots without AI percentages',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore();const provider=ai();
    const first=await turn(store,provider,'Test Model F28 arızalı.');
    assert.equal(first.resultState,'diagnosing');
    assert.deepEqual(first.candidateProbabilities.map(item=>item.probability),[50,50]);
    assert.equal(calls.sessions.length,1);
    assert.equal(calls.asked.length,1);
    assert.equal(calls.sessions[0].initialMessage,'Test Model F28 arızalı.');
    const second=await turn(store,provider,'Evet',[{role:'user',content:'Test Model F28 arızalı.'}],first.stateToken);
    assert.deepEqual(second.candidateProbabilities.map(item=>item.probability),[66.67,33.33]);
    assert.equal(calls.answers.length,1);
    assert.equal(calls.answers[0].answerKey,'yes');
    const third=await turn(store,provider,'Bilmiyorum',[],second.stateToken);
    assert.equal(calls.answers[1].answerKey,'unknown');
    assert.deepEqual(third.candidateProbabilities.map(item=>item.probability),[66.67,33.33]);
    assert.equal(calls.snapshots.at(-1).items.reduce((sum,item)=>sum+item.probability,0),100);
    assert.equal(calls.updates.at(-1).input.confidenceBasis.calibrated,false);
    assert.equal(decodeBoilerState(third.stateToken).askedQuestionIds.length,2);
    assert.equal(calls.updates.at(-1).input.questionCompletionPercent,16.67);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('missing brand or model after an unknown answer ends without candidates and allows technician routing',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    for(const identity of [{brand:'',model:'',errorCode:''},{brand:'Test',model:'',errorCode:''}]){
      const {store,calls}=fakeStore();const provider=ai(identity);
      const first=await turn(store,provider,identity.brand?'Test kombim arızalı.':'Kombim arızalı.');
      assert.equal(first.resultState,'diagnosing');
      const second=await turn(store,provider,'Bilmiyorum',[],first.stateToken);
      assert.equal(second.resultState,'uncertain_price');
      assert.equal(second.canRouteTechnician,true);
      assert.deepEqual(second.candidateProbabilities,[]);
      assert.equal(calls.snapshots.length,0);
    }
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('an explicitly unknown brand in the first message goes directly to uncertain routing',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store}=fakeStore();
    const result=await turn(store,ai({brand:'',model:'',errorCode:''}),
      'Kombimin markasını bilmiyorum.');
    assert.equal(result.resultState,'uncertain_price');
    assert.equal(result.canRouteTechnician,true);
    assert.deepEqual(result.candidateProbabilities,[]);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('unknown code selects only verified symptom pool, with no fabricated price',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store}=fakeStore({candidates:[baseCandidate('review',null,'needs_review'),baseCandidate('symptom',null)]
      ,questions:[],effects:[]});
    const response=await turn(store,ai({brand:'Test',model:'Model',errorCode:'E99'}),'Test Model E99 arızalı.');
    assert.equal(response.resultState,'uncertain_price');
    assert.deepEqual(response.candidateProbabilities,[{name:'symptom',probability:100}]);
    assert.equal(response.pricingData,null);
    assert.equal(response.estimatedPrice,null);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('no displayed error code continues in the verified symptom pool without demanding a code',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store}=fakeStore({candidates:[baseCandidate('symptom',null)],questions:[],effects:[]});
    const response=await turn(store,ai({brand:'Test',model:'Model',errorCode:''}),
      'Test Model hata kodu yok, sıcak su gelmiyor.');
    assert.equal(response.resultState,'uncertain_price');
    assert.deepEqual(response.candidateProbabilities,[{name:'symptom',probability:100}]);
    assert.doesNotMatch(response.aiText,/hangi hata kodu/i);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('a lone candidate without customer evidence never fetches stored pricing',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const storedPrice={id:'price-id',candidate_id:'c0',operation_name:'Kayıtlı işlem',pricing_mode:'range',
      currency:'TRY',labor_price_min:100,labor_price_max:200};
    const {store,calls}=fakeStore({candidates:[baseCandidate('c0')],questions:[],effects:[],price:storedPrice});
    const unconfirmed=await turn(store,ai(),'Test Model F28 arızalı.');
    assert.equal(unconfirmed.resultState,'uncertain_price');
    assert.deepEqual(unconfirmed.candidateProbabilities,[{name:'c0',probability:100}]);
    assert.equal(unconfirmed.pricingData,null);
    assert.deepEqual(calls.pricing,[]);
    const {store:safetyStore,calls:safetyCalls}=fakeStore();
    const stopped=await turn(safetyStore,ai(),'Test Model F28, gaz kokusu var.');
    assert.equal(stopped.resultState,'safety_stop');
    assert.equal(safetyCalls.snapshots.length,0);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('customer-supported leader still enters the existing verification and stored-price flow',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const storedPrice={id:'price-id',candidate_id:'c0',operation_name:'Kayıtlı işlem',pricing_mode:'range',
      currency:'TRY',labor_price_min:100,labor_price_max:200};
    const {store,calls}=fakeStore({price:storedPrice});
    const provider=ai();
    const first=await turn(store,provider,'Test Model F28 arızalı.');
    assert.equal(first.resultState,'diagnosing');
    const second=await turn(store,provider,'Evet',[],first.stateToken);
    assert.equal(second.resultState,'diagnosing');
    const priced=await turn(store,provider,'Evet',[],second.stateToken);
    assert.equal(priced.resultState,'priced_candidate');
    assert.deepEqual(priced.candidateProbabilities.map(item=>item.probability),[80,20]);
    assert.deepEqual(priced.pricingData,storedPrice);
    assert.deepEqual(calls.pricing,['c0']);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('twelve diagnostic questions are the hard limit, including unknown answers',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const questions=Array.from({length:13},(_,i)=>question(i+1));
    const effects=questions.map(q=>({question_id:q.id,candidate_id:'c0',answer_key:'yes',effect:'support'}));
    const {store,calls}=fakeStore({questions,effects});const provider=ai();
    let response=await turn(store,provider,'Test Model F28 arızalı.');
    for(let i=0;i<12;i++)response=await turn(store,provider,'Bilmiyorum',[],response.stateToken);
    assert.equal(response.resultState,'uncertain_price');
    assert.equal(decodeBoilerState(response.stateToken).askedQuestionIds.length,12);
    assert.equal(calls.answers.length,12);
    assert.equal(calls.updates.at(-1).input.questionCompletionPercent,100);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('missing server-only Supabase configuration retries once and returns service_unavailable without invented weights or price',async()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try{
    const result=await diagnose('Kombim arızalı.',[]);
    assert.equal(result.resultState,'service_unavailable');
    assert.equal(result.canRouteTechnician,true);
    assert.deepEqual(result.candidateProbabilities,[]);
    assert.equal(result.estimatedPrice,null);
    assert.equal(result.researchStatus,'unavailable');
  }finally{
    if(url===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=url;
    if(key===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=key;
  }
});

test('a corrected device identity starts a new session instead of reusing old answers',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore();
    const provider={...ai(),async extractIdentity(conversation){const latest=conversation.at(-1).content;
      return {brand:'Test',model:latest.includes('Model2')?'Model2':'Model',errorCode:'F28'};}};
    const first=await turn(store,provider,'Test Model F28 arızalı.');
    const corrected=await turn(store,provider,'Aslında Test Model2 F28.',[],first.stateToken);
    assert.equal(calls.sessions.length,2);
    assert.equal(calls.updates.some(row=>row.id==='session-1' && row.input.confidenceBasis?.reason==='device_identity_changed'),true);
    assert.equal(decodeBoilerState(corrected.stateToken).sessionId,'session-2');
    assert.deepEqual(decodeBoilerState(corrected.stateToken).answers,[]);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('an explicit spontaneous observation is counted once and the same topic is not asked',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore();
    const provider={...ai(),async extractObservedAnswers(){return [
      {questionId:'q1',answerKey:'yes',quote:'Ocak çalışıyor'}];}};
    const response=await turn(store,provider,'Test Model F28. Ocak çalışıyor.');
    assert.deepEqual(response.candidateProbabilities.map(item=>item.probability),[66.67,33.33]);
    assert.equal(calls.answers[0].source,'ai_extracted');
    assert.equal(calls.answers[0].rawAnswer,'Ocak çalışıyor');
    assert.equal(decodeBoilerState(response.stateToken).askedQuestionIds.length,1);
    assert.equal(decodeBoilerState(response.stateToken).pendingQuestionId,'q2');
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('AI cannot attach an invented customer quote to an answer or change weights',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore();
    const provider={...ai(),async extractObservedAnswers(){return [
      {questionId:'q1',answerKey:'yes',quote:'Ocak çalışıyor'}];}};
    const response=await turn(store,provider,'Test Model F28.');
    assert.equal(calls.answers.length,0);
    assert.deepEqual(response.candidateProbabilities.map(item=>item.probability),[50,50]);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('a corrected identity starts another session without resetting the total question budget',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore();
    const provider={...ai(),async extractIdentity(conversation){const latest=conversation.at(-1).content;
      return {brand:'Test',model:latest.includes('Model2')?'Model2':'Model',errorCode:'F28'};}};
    const first=await turn(store,provider,'Test Model F28 arızalı.');
    const corrected=await turn(store,provider,'Aslında Test Model2 F28.',[],first.stateToken);
    assert.equal(calls.sessions.length,2);
    assert.equal(decodeBoilerState(first.stateToken).totalAskedQuestions,1);
    assert.equal(decodeBoilerState(corrected.stateToken).totalAskedQuestions,2);
    assert.deepEqual(decodeBoilerState(corrected.stateToken).answers,[]);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('a corrected observation replaces the old answer and its probability effect',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore({effects:[
      {question_id:'q1',candidate_id:'c0',answer_key:'yes',effect:'support'},
      {question_id:'q1',candidate_id:'c0',answer_key:'no',effect:'weaken'},
      {question_id:'q2',candidate_id:'c0',answer_key:'yes',effect:'support'},
    ]});
    const provider={...ai(),async classifyAnswer(_q,message){return message.startsWith('Aslında')?'unknown':'yes';},
      async extractObservedAnswers(message){return message.includes('Ocak çalışmıyor')
        ?[{questionId:'q1',answerKey:'no',quote:'Ocak çalışmıyor'}]:[];}};
    const first=await turn(store,provider,'Test Model F28 arızalı.');
    const second=await turn(store,provider,'Evet',[],first.stateToken);
    assert.deepEqual(second.candidateProbabilities.map(item=>item.probability),[66.67,33.33]);
    const corrected=await turn(store,provider,'Aslında Ocak çalışmıyor.',[],second.stateToken);
    assert.deepEqual(corrected.candidateProbabilities.map(item=>item.probability),[33.33,66.67]);
    assert.equal(decodeBoilerState(corrected.stateToken).answers.find(item=>item.questionId==='q1').answerKey,'no');
    assert.equal(calls.answers.at(-1).rawAnswer,'Ocak çalışmıyor');
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('ambiguous customer wording remains neutral even if AI would classify it as yes',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore();const provider=ai();
    const first=await turn(store,provider,'Test Model F28 arızalı.');
    const answer=await turn(store,provider,'Galiba var ama emin değilim.',[],first.stateToken);
    assert.equal(calls.answers[0].answerKey,'unknown');
    assert.deepEqual(answer.candidateProbabilities.map(item=>item.probability),[50,50]);
    assert.equal(decodeBoilerState(answer.stateToken).totalAskedQuestions,2);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('repeated spontaneous evidence is counted once and does not consume another question slot',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore({questions:[question(1),question(2),question(3)]});
    const provider={...ai(),async classifyAnswer(){return 'unknown';},
      async extractObservedAnswers(message){return message.includes('Ocak çalışıyor')
        ?[{questionId:'q1',answerKey:'yes',quote:'Ocak çalışıyor'}]:[];}};
    const first=await turn(store,provider,'Test Model F28. Ocak çalışıyor.');
    const second=await turn(store,provider,'Ocak çalışıyor.',[],first.stateToken);
    assert.deepEqual(second.candidateProbabilities.map(item=>item.probability),[66.67,33.33]);
    assert.equal(decodeBoilerState(second.stateToken).answers.filter(item=>item.questionId==='q1').length,1);
    assert.equal(calls.answers.filter(item=>item.questionId==='q1').length,1);
    assert.equal(decodeBoilerState(second.stateToken).totalAskedQuestions,2);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('a failed technical lookup retries once, rebuilds explicit evidence and preserves the question budget',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store}=fakeStore({questions:[question(1),question(2),question(3)]});
    const provider={...ai(),async extractObservedAnswers(message){return message.includes('Ocak çalışıyor')
      ?[{questionId:'q1',answerKey:'yes',quote:'Ocak çalışıyor'}]:[];}};
    const first=await turn(store,provider,'Test Model F28 arızalı.');
    let attempts=0;
    const result=await diagnose('Ocak çalışıyor.',[
      {role:'user',content:'Test Model F28 arızalı.'},{role:'assistant',content:first.aiText}],first.stateToken,
    {boiler:{repositoryFactory(){attempts++;return attempts===1?{
      ...store,async getCandidates(){throw Error('Boiler data access failed: offline');}
    }:store;},aiFactory(){return provider;}}});
    assert.equal(attempts,2);
    assert.equal(result.resultState,'diagnosing');
    assert.deepEqual(result.candidateProbabilities.map(item=>item.probability),[66.67,33.33]);
    assert.equal(decodeBoilerState(result.stateToken).totalAskedQuestions,2);
    assert.equal(decodeBoilerState(result.stateToken).askedQuestionIds.length,2);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('two failed technical lookups return service_unavailable without candidates or price',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    let attempts=0;
    const result=await diagnose('Test Model F28 arızalı.',[],null,{boiler:{
      repositoryFactory(){attempts++;return null;},aiFactory(){return ai();}}});
    assert.equal(attempts,2);
    assert.equal(result.resultState,'service_unavailable');
    assert.equal(result.canRouteTechnician,true);
    assert.deepEqual(result.candidateProbabilities,[]);
    assert.equal(result.pricingData,null);
    assert.equal(result.estimatedPrice,null);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});

test('retry rebuilds the answer to the last asked question without asking it twice',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-signing-secret';
  try{
    const {store,calls}=fakeStore();const provider=ai();
    const first=await turn(store,provider,'Test Model F28 arızalı.');
    let attempts=0;
    const result=await diagnose('Evet',[
      {role:'user',content:'Test Model F28 arızalı.'},{role:'assistant',content:first.aiText}],first.stateToken,
    {boiler:{repositoryFactory(){attempts++;return attempts===1?{
      ...store,async getCandidates(){throw Error('Boiler data access failed: offline');}
    }:store;},aiFactory(){return provider;}}});
    assert.equal(attempts,2);
    assert.deepEqual(result.candidateProbabilities.map(item=>item.probability),[66.67,33.33]);
    assert.equal(decodeBoilerState(result.stateToken).totalAskedQuestions,2);
    assert.deepEqual(decodeBoilerState(result.stateToken).askedQuestionIds,['q1','q2']);
    assert.equal(calls.asked.filter(item=>item.questionId==='q1').length,2); // one in each session
    assert.equal(new Set(calls.asked.map(item=>`${item.sessionId}:${item.questionId}`)).size,calls.asked.length);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});
