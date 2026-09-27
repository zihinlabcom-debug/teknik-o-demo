import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diagnoseBoiler } from '../src/lib/boiler-diagnosis.ts';

function fixture() {
  const candidates = ['gas','ignition'].map(id => ({ id, candidate_name:id,
    verification_status:'verified', is_active:true, family_id:'family', official_model_id:null, error_code:'F.28' }));
  const questions = [
    { id:'safety', question_key:'safety_gas_smell', question_text:'Gaz kokusu alıyor musunuz?',
      answer_options:['yes','no','unknown'], evidence_group:'safety_gas_smell',
      customer_observable:true, is_safety_question:true, is_active:true, priority:100 },
    { id:'gas', question_key:'gas_other_appliance', question_text:'Evinizdeki başka bir gazlı cihaz normal çalışıyor mu?',
      answer_options:['yes','no','unknown'], evidence_group:'household_gas_availability',
      customer_observable:true, is_safety_question:false, is_active:true, priority:80 },
  ];
  const effects = [{ question_id:'gas', candidate_id:'gas', answer_key:'no', effect:'support' }];
  const recorded = [];
  const repository = {
    async resolveDevice(){ return { familyId:'family', familyName:'ecoTEC intro', officialModelId:null, officialModelName:null }; },
    async getCandidates(){ return candidates; }, async getQuestions(){ return questions; },
    async getEffects(){ return effects; }, async getPricing(){ return null; },
    async createSession(){ return 'session'; }, async recordQuestionAsked(){},
    async recordAnswer(input){ recorded.push(input); }, async deleteAnswer(){},
    async recordCandidates(){}, async updateSession(){},
  };
  const ai = { async extractIdentity(){ return {brand:'Vaillant',model:'ecoTEC intro',errorCode:'F.28'}; },
    async classifyAnswer(_question,message,allowed){ const key = message === 'Evet' ? 'yes' : 'no';
      assert.ok(allowed.includes(key)); return key; },
    async chooseQuestion({questions: choices}){ return choices[0]?.id ?? null; } };
  return {repository,ai,recorded};
}

test('seeded safety question supports no without effect rows, then reaches diagnostic question', async () => {
  const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='offline-test-secret';
  try {
    const {repository,ai,recorded}=fixture();
    const first=await diagnoseBoiler('Vaillant ecoTEC intro F.28 hatası var.',[],null,repository,ai);
    assert.equal(first.aiText,'Gaz kokusu alıyor musunuz?');
    assert.equal(first.resultState,'diagnosing');
    const second=await diagnoseBoiler('Hayır',[],first.stateToken,repository,ai);
    assert.equal(recorded[0].answerKey,'no');
    assert.equal(second.aiText,'Evinizdeki başka bir gazlı cihaz normal çalışıyor mu?');
    assert.equal(second.resultState,'diagnosing');
    assert.ok(second.candidateProbabilities.every(item=>item.probability<75));
  } finally { if(old===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=old; }
});

test('yes to a seeded safety question stops diagnosis', async () => {
  const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='offline-test-secret';
  try {
    const {repository,ai}=fixture();
    const first=await diagnoseBoiler('Vaillant ecoTEC intro F.28 hatası var.',[],null,repository,ai);
    const second=await diagnoseBoiler('Evet',[],first.stateToken,repository,ai);
    assert.equal(second.resultState,'safety_stop');
  } finally { if(old===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=old; }
});

test('an explicit denial of gas smell does not trigger a false safety stop', async () => {
  const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='offline-test-secret';
  try {
    const {repository,ai}=fixture();
    const first=await diagnoseBoiler('Vaillant ecoTEC intro F.28 hatası var.',[],null,repository,ai);
    const second=await diagnoseBoiler('Hayır, gaz kokusu almıyorum.',[],first.stateToken,repository,ai);
    assert.equal(second.resultState,'diagnosing');
    assert.equal(second.aiText,'Evinizdeki başka bir gazlı cihaz normal çalışıyor mu?');
  } finally { if(old===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=old; }
});

test('reconstructed yes to a seeded safety question also stops diagnosis', async () => {
  const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='offline-test-secret';
  try {
    const {repository,ai}=fixture();
    const history=[{role:'user',content:'Vaillant ecoTEC intro F.28 hatası var.'},
      {role:'assistant',content:'Gaz kokusu alıyor musunuz?'},{role:'user',content:'Evet'}];
    const result=await diagnoseBoiler('Tekrar deneyelim',history,null,repository,ai,{rebuildFromHistory:true});
    assert.equal(result.resultState,'safety_stop');
  } finally { if(old===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=old; }
});

test('offline six-candidate Vaillant F.28 starts with a question and never prices below 75', async () => {
  const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='offline-test-secret';
  try {
    const report=JSON.parse(readFileSync(new URL('../test-results/stage3-question-seed-report.json',import.meta.url),'utf8'));
    const spot=report.spot_checks.find(item=>item.brand==='Vaillant' && item.code==='F.28');
    assert.equal(spot.candidates.length,6);
    const {repository,ai}=fixture();
    const candidates=spot.candidates.map((name,index)=>({ id:String(index),candidate_name:name,
      verification_status:'verified',is_active:true,family_id:'family',official_model_id:null,error_code:'F.28' }));
    repository.getCandidates=async()=>candidates;
    repository.getEffects=async()=>spot.effects.map(entry=>({ question_id:'gas',
      candidate_id:String(spot.candidates.indexOf(entry.candidate)),answer_key:entry.answer,effect:entry.effect }));
    const initial='Vaillant ecoTEC intro VUW 18/24 AS/1-1 kombim F.28 hatası veriyor.';
    const first=await diagnoseBoiler(initial,[],null,repository,ai);
    assert.equal(first.resultState,'diagnosing');
    assert.equal(first.candidateProbabilities.length,6);
    assert.equal(first.pricingData,null);
    const second=await diagnoseBoiler('Hayır',[],first.stateToken,repository,ai);
    assert.equal(second.resultState,'diagnosing');
    assert.equal(second.aiText,'Evinizdeki başka bir gazlı cihaz normal çalışıyor mu?');
    const third=await diagnoseBoiler('Hayır',[],second.stateToken,repository,ai);
    assert.ok(third.candidateProbabilities.every(item=>item.probability<75));
    assert.equal(third.pricingData,null);
  } finally { if(old===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=old; }
});

test('a safety answer alone cannot price a single-candidate pool', async () => {
  const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='offline-test-secret';
  try {
    const {repository,ai}=fixture();
    const sole={id:'gas',candidate_name:'Tek aday',verification_status:'verified',is_active:true,
      family_id:'family',official_model_id:null,error_code:'F.28'};
    repository.getCandidates=async()=>[sole];
    repository.getEffects=async()=>[];
    let pricingCalls=0;
    repository.getPricing=async()=>{pricingCalls++;return {id:'stored-price'};};
    const first=await diagnoseBoiler('Vaillant ecoTEC intro F.28 hatası var.',[],null,repository,ai);
    assert.equal(first.resultState,'diagnosing');
    assert.deepEqual(first.candidateProbabilities.map(item=>item.probability),[100]);
    const second=await diagnoseBoiler('Hayır, gaz kokusu almıyorum.',[],first.stateToken,repository,ai);
    assert.equal(second.resultState,'uncertain_price');
    assert.equal(second.pricingData,null);
    assert.equal(pricingCalls,0);
  } finally { if(old===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=old; }
});
