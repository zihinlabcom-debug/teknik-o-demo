import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseBoiler, decodeBoilerState } from '../src/lib/boiler-diagnosis.ts';
import { countBoilerQuestionRequests, canAskBoilerQuestion } from '../src/lib/boiler-question-budget.ts';

const candidate = (id) => ({ id, candidate_name:id, verification_status:'verified', is_active:true,
  family_id:'family', official_model_id:null, error_code:'F28' });
const question = (n) => ({ id:`q${n}`, question_key:`topic${n}`, question_text:`Belirti ${n} var mı?`,
  evidence_group:`group${n}`, customer_observable:true, is_safety_question:false, is_active:true, priority:20-n });
const questions = Array.from({length:15}, (_,n)=>question(n+1));
function fixture({ambiguous=false, oneCandidate=false}={}) {
  const candidates=oneCandidate?[candidate('c0')]:[candidate('c0'),candidate('c1')];
  const effects=questions.map(q=>({question_id:q.id,candidate_id:'c0',answer_key:'yes',effect:'support'}));
  const store={
    async createSession(){return 'session';}, async updateSession(){}, async recordCandidates(){},
    async recordQuestionAsked(){},
    async recordAnswer(){}, async getPricing(){return null;},
    async resolveDevice(_brand,model){return ambiguous && model!=='Model Tam' ? 'ambiguous' :
      {familyId:'family',familyName:'Model',officialModelId:null,officialModelName:null};},
    async getCandidates(){return candidates;},async getQuestions(){return questions;},async getEffects(){return effects;},
  };
  const ai={
    async extractIdentity(conversation){const text=conversation.filter(m=>m.role==='user').map(m=>m.content).join(' ');
      return {brand:/\bTest\b/.test(text)?'Test':'',model:/Model Tam/.test(text)?'Model Tam':/\bModel\b/.test(text)?'Model':'',
        errorCode:/\bF28\b/.test(text)?'F28':''};},
    async classifyAnswer(_q,message){return /bilmiyorum/i.test(message)?'unknown':'yes';},
    async chooseQuestion({questions:available}){return available[0]?.id??null;},
  };
  return {store,ai};
}
async function run(messages, options={}) {
  const {store,ai}=fixture(options); let token=null; const history=[]; const replies=[];
  for(const message of messages){
    const reply=await diagnoseBoiler(message,history,token,store,ai);
    replies.push(reply); token=reply.stateToken;
    history.push({role:'user',content:message},{role:'assistant',content:reply.aiText});
  }
  return {state:decodeBoilerState(token),replies,store,ai,history,token};
}
const withSecret = async (callback) => {
  const saved=process.env.DIAGNOSIS_STATE_SECRET;process.env.DIAGNOSIS_STATE_SECRET='budget-test-secret';
  try{return await callback();}finally{if(saved===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;
    else process.env.DIAGNOSIS_STATE_SECRET=saved;}
};

test('brand, model and error code asked separately consume three of twelve slots',()=>withSecret(async()=>{
  const {state,replies}=await run(['Kombim arızalı','Test','Model','F28']);
  assert.match(replies[0].aiText,/marka/i);
  assert.match(replies[1].aiText,/model/i);
  assert.match(replies[2].aiText,/hata kodu/i);
  assert.equal(state.totalAskedQuestions,4); // The fourth turn asks the first diagnostic question.
  assert.equal(state.askedQuestionIds.length,1);
  assert.equal(replies[2].informationProgress,25);
}));

test('three identity questions leave only nine further questions, including unknown answers',()=>withSecret(async()=>{
  const messages=['Kombim arızalı','Test','Model','F28',...Array(12).fill('Bilmiyorum')];
  const {state,replies}=await run(messages);
  assert.equal(state.totalAskedQuestions,12);
  assert.equal(state.askedQuestionIds.length,9);
  assert.equal(replies.at(-1).resultState,'uncertain_price');
  assert.ok(replies.every(reply=>decodeBoilerState(reply.stateToken).totalAskedQuestions<=12));
}));

test('identity supplied in the first message costs no question slots',()=>withSecret(async()=>{
  const {state}=await run(['Test Model F28 arızalı.']);
  assert.equal(state.totalAskedQuestions,1);
  assert.equal(state.askedQuestionIds.length,1);
}));

test('model clarification and post-threshold verification consume the same total budget',()=>withSecret(async()=>{
  const clarified=await run(['Test Model F28 arızalı.','Model Tam'],{ambiguous:true});
  assert.equal(clarified.replies[0].resultState,'diagnosing');
  assert.match(clarified.replies[0].aiText,/tam model/i);
  assert.equal(clarified.state.totalAskedQuestions,2);
  assert.equal(clarified.state.askedQuestionIds.length,1);
  const verification=await run(['Test Model F28 arızalı.','Bilmiyorum','Bilmiyorum'],{oneCandidate:true});
  assert.equal(verification.replies[0].resultState,'verification');
  assert.equal(verification.replies[1].resultState,'verification');
  assert.equal(verification.state.totalAskedQuestions,2);
  assert.equal(verification.replies[2].resultState,'pricing_missing');
}));

test('independent requests in one message each cost a slot and cannot exceed twelve',()=>{
  assert.equal(countBoilerQuestionRequests('Markanız, modeliniz ve hata kodunuz nedir?'),3);
  assert.equal(countBoilerQuestionRequests('Fan sesi geliyor mu ve petekler ısınıyor mu?'),2);
  assert.equal(canAskBoilerQuestion(10,'Markanız, modeliniz ve hata kodunuz nedir?'),false);
  assert.equal(canAskBoilerQuestion(9,'Markanız, modeliniz ve hata kodunuz nedir?'),true);
});
