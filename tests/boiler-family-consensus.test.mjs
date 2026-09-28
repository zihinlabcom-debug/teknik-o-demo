import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as probability from '../src/lib/boiler-probability.ts';
import { decodeBoilerState, diagnoseBoiler } from '../src/lib/boiler-diagnosis.ts';
import { createSupabaseBoilerRepository } from '../src/lib/boiler-supabase.ts';

const { calculateBoilerWeights, consensusQuestionEffects, selectCandidatePool } = probability;

const modelIds = ['p24','p28','p35'];
const names = ['Termik kapatma düzeneği sorunu','Kablolama/soket/bağlantı sorunu','Eşanjör/ısı bloğu sorunu'];
const classes = ['electrical','electrical','hydraulic'];
const rows = (labels=names) => modelIds.flatMap(model => labels.map((name,index) => ({
  id:`${model}-${index}`,candidate_key:`different-key-${model}-${index}`,candidate_name:name,fault_class:classes[index],
  family_id:'family',official_model_id:model,error_code:'F.76',verification_status:'verified',is_active:true,
})));
const select = data => selectCandidatePool(data,'family',null,'F76',modelIds);
const question = {id:'q',question_key:'observation',question_text:'Cihazınızda bu belirtiyi gözlüyor musunuz?',
  evidence_group:'observation',answer_options:['yes','no','unknown'],customer_observable:true,
  is_safety_question:false,is_active:true,priority:1};
const sameEffects = () => modelIds.map(model => ({question_id:'q',candidate_id:`${model}-0`,answer_key:'yes',effect:'support'}));

test('family/code consensus uses semantic names and classes, not variant candidate keys or repeated rows',()=>{
  const data=rows();data[3].candidate_name='TERMIK KAPATMA DÜZENEĞİ SORUNU';
  const pool=select(data);
  assert.equal(pool.mode,'family_code_consensus');
  assert.equal(pool.requiresExactModel,false);
  assert.equal(pool.candidates.length,3);
  assert.deepEqual(new Set(pool.candidates.map(c=>c.candidate_name.toLocaleLowerCase('tr-TR'))),new Set(names.map(n=>n.toLocaleLowerCase('tr-TR'))));
  assert.ok(pool.candidates.every(c=>c.sourceCandidateIds.length===3));
  assert.deepEqual(select([...data].reverse()),pool);
  assert.equal(calculateBoilerWeights(pool.candidates,[],[]).reduce((sum,c)=>sum+c.probability,0),100);
});

test('different semantic sets or fault classes cannot establish family consensus',()=>{
  const changed=rows();changed[8].candidate_name='Başka teknik aday';
  assert.equal(select(changed).requiresExactModel,true);
  assert.equal(select(changed).candidates.length,0);
  const differentClass=rows();differentClass[8].fault_class='sensor';
  assert.equal(select(differentClass).requiresExactModel,true);
  const missingClass=rows();delete missingClass[8].fault_class;
  assert.equal(select(missingClass).requiresExactModel,true);
});

test('raw code coverage includes a variant with zero candidates and blocks false consensus',()=>{
  assert.equal(select(rows().filter(c=>c.official_model_id!=='p35')).requiresExactModel,true);
  const inactive=rows();inactive[8].is_active=false;
  assert.equal(select(inactive).requiresExactModel,true);
  const rejected=rows();rejected[8].verification_status='rejected';
  assert.equal(select(rejected).requiresExactModel,true);
  assert.notEqual(selectCandidatePool(rows(),'family',null,'F76').mode,'family_code_consensus');
});

test('exact model and explicitly family-scoped code pools retain their existing selection',()=>{
  const exact=selectCandidatePool(rows(),'family','p24','F76',modelIds);
  assert.equal(exact.mode,'error_code');
  assert.deepEqual(exact.candidates.map(c=>c.id),['p24-0','p24-1','p24-2']);
  const native={...rows()[0],id:'native',official_model_id:null};
  assert.deepEqual(select([native,...rows()]).candidates,[native]);
});

test('matching effects across every member yield one logical effect',()=>{
  const pool=select(rows());
  const effects=consensusQuestionEffects(pool.candidates,sameEffects());
  assert.equal(effects.length,1);
  assert.equal(effects[0].effect,'support');
  const assessed=calculateBoilerWeights(pool.candidates,[{questionId:'q',answerKey:'yes',evidenceGroup:'observation'}],effects);
  assert.equal(assessed.find(c=>c.candidateName===names[0]).probability,50);
});

test('conflicting or missing variant effects are neutral, and unknown never changes probabilities',()=>{
  const pool=select(rows());
  for(const data of [sameEffects().slice(0,2),sameEffects().map((e,i)=>i===2?{...e,effect:'weaken'}:e),
    sameEffects().map((e,i)=>i===2?{...e,effect:'neutral'}:e)]){
    const effects=consensusQuestionEffects(pool.candidates,data);
    assert.ok(effects.every(e=>e.effect==='neutral'));
    assert.deepEqual(calculateBoilerWeights(pool.candidates,[{questionId:'q',answerKey:'yes',evidenceGroup:'observation'}],effects),
      calculateBoilerWeights(pool.candidates,[],[]));
  }
  assert.ok(consensusQuestionEffects(pool.candidates,sameEffects().map(e=>({...e,answer_key:'unknown'})))
    .every(e=>e.effect==='neutral'));
});

function fixture({data=rows(),covered=modelIds,questions=[],effects=[],exact=false,price={id:'exact-offer'}}={}){
  const calls={price:[],snapshots:[],coverage:0};
  const repo={
    async resolveDevice(){return {familyId:'family',familyName:'nitromiX',officialModelId:exact?'p24':null,officialModelName:exact?'nitromiX P24 NG (HEP)':null};},
    async getCandidates(){return data;},async getErrorCodeModelIds(){calls.coverage++;return covered;},
    async getQuestions(){return questions;},async getEffects(ids){return effects.filter(e=>ids.includes(e.candidate_id));},
    async getPricing(id){calls.price.push(id);return price;},async createSession(){return 'session';},
    async recordQuestionAsked(){},async recordAnswer(){},async deleteAnswer(){},
    async recordCandidates(_session,assessment){calls.snapshots.push(assessment);},async updateSession(){},
  };
  const ai={async extractIdentity(){return {brand:'DemirDöküm',model:exact?'nitromiX P24 NG HEP':'nitromiX',errorCode:'F.76'};},
    async classifyAnswer(){return 'yes';},async chooseQuestion({questions:choices}){return choices[0]?.id??null;}};
  return {repo,ai,calls,message:exact?'Demirdokum nitromiX P24 NG HEP F76 hatasi veriyor.':'Demirdokum nitromiX F76 hatasi veriyor.'};
}
async function signed(run){
  const saved=process.env.DIAGNOSIS_STATE_SECRET;process.env.DIAGNOSIS_STATE_SECRET='offline-family-test-secret';
  try{await run();}finally{if(saved===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=saved;}
}

test('Nitromix-like family fixture returns exactly three candidates without consuming identity questions',async()=>signed(async()=>{
  const {repo,ai,calls,message}=fixture();const result=await diagnoseBoiler(message,[],null,repo,ai);
  const state=decodeBoilerState(result.stateToken);
  assert.equal(result.resultState,'uncertain_price');
  assert.equal(result.candidateProbabilities.length,3);
  assert.deepEqual(new Set(result.candidateProbabilities.map(c=>c.name)),new Set(names));
  assert.deepEqual(result.candidateProbabilities.map(c=>c.probability).sort(),[33.33,33.33,33.34]);
  assert.equal(state.officialModelId,null);assert.equal(state.familyId,'family');assert.equal(state.totalAskedQuestions,0);
  assert.doesNotMatch(result.aiText,/havuzu bulunamadı|tam model|markası nedir/);
  assert.equal(calls.price.length,0);assert.equal(calls.snapshots[0].length,3);
}));

test('family consensus asks its first compatible diagnostic question as question one',async()=>signed(async()=>{
  const {repo,ai,message}=fixture({questions:[question],effects:sameEffects()});
  const result=await diagnoseBoiler(message,[],null,repo,ai);
  assert.equal(result.aiText,question.question_text);assert.equal(result.resultState,'diagnosing');
  assert.equal(decodeBoilerState(result.stateToken).totalAskedQuestions,1);
}));

test('inconsistent or uncovered variant pools ask for exact model safely',async()=>signed(async()=>{
  for(const data of [rows().filter(c=>c.official_model_id!=='p35'),rows().map(c=>c.id==='p35-2'?{...c,candidate_name:'Başka aday'}:c)]){
    const {repo,ai,message}=fixture({data});const result=await diagnoseBoiler(message,[],null,repo,ai);
    assert.match(result.aiText,/tam model adını/);assert.equal(decodeBoilerState(result.stateToken).pendingIdentity,'model');
    assert.equal(result.candidateProbabilities.length,0);
  }
}));

test('conflicting effects cannot make a variant-only question eligible for the family',async()=>signed(async()=>{
  const {repo,ai,message}=fixture({questions:[question],effects:sameEffects().slice(0,2)});
  const result=await diagnoseBoiler(message,[],null,repo,ai);
  assert.equal(result.resultState,'uncertain_price');assert.equal(decodeBoilerState(result.stateToken).totalAskedQuestions,0);
  assert.equal(result.candidateProbabilities.length,3);
}));

test('a singleton consensus never fetches an arbitrary exact-model price, even after support',async()=>signed(async()=>{
  const {repo,ai,calls,message}=fixture({data:rows([names[0]]),questions:[question],effects:sameEffects()});
  const first=await diagnoseBoiler(message,[],null,repo,ai);
  assert.equal(first.resultState,'diagnosing');assert.equal(first.candidateProbabilities[0].probability,100);
  assert.equal(calls.price.length,0);
  const second=await diagnoseBoiler('Evet',[{role:'user',content:message}],first.stateToken,repo,ai);
  assert.equal(second.resultState,'uncertain_price');assert.equal(second.pricingData,null);assert.equal(calls.price.length,0);
}));

test('exact variant diagnosis does not use consensus or query raw family coverage',async()=>signed(async()=>{
  const {repo,ai,calls,message}=fixture({exact:true});
  const result=await diagnoseBoiler(message,[],null,repo,ai);
  assert.equal(decodeBoilerState(result.stateToken).officialModelId,'p24');
  assert.equal(result.candidateProbabilities.length,3);assert.equal(calls.coverage,0);
  assert.deepEqual(calls.snapshots[0].map(c=>c.candidateId),['p24-0','p24-1','p24-2']);
}));

test('archived Vaillant ecoTEC intro F.28 pool still starts safely for an exact official model',async()=>signed(async()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20260927000014_seed_vaillant_ecotec_intro_f28_candidates.sql',import.meta.url),'utf8');
  const data=[...sql.matchAll(/\('(vaillant_ecotec_intro_f28_[^']+)',\s*'([^']+)',\s*'[^']+',\s*'([^']+)'\)/g)]
    .map(([,id,candidate_name,fault_class])=>({id,candidate_name,fault_class,family_id:'family',official_model_id:null,
      error_code:'F.28',verification_status:'verified',is_active:true}));
  assert.equal(data.length,6);
  const safety={...question,id:'safety',question_key:'safety_gas_smell',evidence_group:'safety_gas_smell',
    question_text:'Gaz kokusu alıyor musunuz?',is_safety_question:true};
  const {repo,calls}=fixture({data,questions:[safety]});
  repo.resolveDevice=async()=>({familyId:'family',familyName:'ecoTEC intro',officialModelId:'intro-exact',
    officialModelName:'ecoTEC intro VUW 18/24 AS/1-1'});
  const ai={async extractIdentity(){return {brand:'Vaillant',model:'ecoTEC intro VUW 18/24 AS/1-1',errorCode:'F.28'};},
    async chooseQuestion(){return 'safety';}};
  const result=await diagnoseBoiler('Vaillant ecoTEC intro VUW 18/24 AS/1-1 F.28 hatası var.',[],null,repo,ai);
  assert.equal(result.resultState,'diagnosing');assert.equal(result.aiText,safety.question_text);
  assert.equal(result.candidateProbabilities.length,6);assert.equal(calls.coverage,0);assert.equal(calls.price.length,0);
  assert.equal(decodeBoilerState(result.stateToken).officialModelId,'intro-exact');
}));

test('repository raw model/code coverage includes models that have no candidate rows',async()=>{
  const saved=globalThis.fetch;const requests=[];
  globalThis.fetch=async input=>{
    const url=new URL(String(input));requests.push(url);
    let data;
    if(url.pathname.endsWith('/boiler_model_families'))data={brand:'DemirDöküm'};
    else if(url.pathname.endsWith('/boiler_official_models'))data=modelIds.map((id,i)=>({id,official_model_name:`Model ${i}`}));
    else if(url.pathname.endsWith('/official_error_codes_raw'))data=modelIds.map((_id,i)=>({id:i+1,official_model:`Model ${i}`,error_code:i===2?'F76':'F.76'}));
    else throw Error('Unexpected repository request '+url.pathname);
    return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const repo=createSupabaseBoilerRepository('https://fixture.supabase.co','test-service-key');
    assert.deepEqual((await repo.getErrorCodeModelIds('family','F.76')).sort(),modelIds);
    assert.ok(requests.some(url=>url.pathname.endsWith('/official_error_codes_raw')));
    assert.equal(requests.some(url=>url.pathname.endsWith('/boiler_fault_candidates')),false);
  }finally{globalThis.fetch=saved;}
});

test('a complete official model explicitly in the customer reply survives AI suffix omission without guessing variants',async()=>{
  const saved=globalThis.fetch;
  globalThis.fetch=async input=>{
    const url=new URL(String(input));
    const data=url.pathname.endsWith('/boiler_model_families')
      ?[{id:'family',brand:'DemirDöküm',family_name:'nitromiX',normalized_name:'nitromix'}]
      :url.pathname.endsWith('/boiler_official_models')
        ?modelIds.map((id,i)=>({id,family_id:'family',official_model_name:`nitromiX P${[24,28,35][i]} NG (HEP)`,normalized_name:`nitromix p${[24,28,35][i]} ng hep`}))
        :[];
    return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const repo=createSupabaseBoilerRepository('https://fixture.supabase.co','test-service-key');
    assert.equal((await repo.resolveDevice('Demirdokum','nitromiX P24 NG',
      'Demirdokum nitromiX P24 NG HEP F76 hatasi veriyor.'))?.officialModelId,'p24');
    assert.equal(await repo.resolveDevice('Demirdokum','nitromiX P24 NG','Demirdokum nitromiX P24 NG F76'),null);
    assert.equal(await repo.resolveDevice('Demirdokum','nitromiX P24 NG',
      'nitromiX P24 NG HEP veya nitromiX P28 NG HEP'),'ambiguous');
    assert.equal((await repo.resolveDevice('Demirdokum','nitromiX','Demirdokum nitromiX F76')).officialModelId,null);
  }finally{globalThis.fetch=saved;}
});
