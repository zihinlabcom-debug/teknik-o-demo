import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseBoiler, decodeBoilerState } from '../src/lib/boiler-diagnosis.ts';
import { normalizePartText } from '../src/lib/parts-catalog.ts';

// Deliberately bad AI outputs exercise post-validation, not a corrected prompt.
const names = ['Termik kapatma düzeneği sorunu', 'Kablolama/soket/bağlantı sorunu', 'Eşanjör/ısı bloğu sorunu'];
function fixture(identity, {family = 'nitromiX', officialModels = ['nitromiX P24 NG (HEP)'], catalogBrand} = {}) {
  const calls = [];
  const repo = {
    async resolveDevice(brand, model) {
      calls.push({brand, model});
      const exact = officialModels.find(name => normalizePartText(name) === normalizePartText(model));
      if (!exact && normalizePartText(model) !== normalizePartText(family)) return null;
      return {brand:catalogBrand, familyId:'family', familyName:family, officialModelId:exact?'exact':null, officialModelName:exact??null};
    },
    async getCandidates() { return names.map((candidate_name, index) => ({
      id:'c'+index, candidate_name, family_id:'family', official_model_id:null,
      error_code:identity.actualCode??'F76', verification_status:'verified', is_active:true,
    })); },
    async getQuestions() { return [{id:'safety', question_key:'safety_gas_smell',
      question_text:'Gaz kokusu alıyor musunuz?', evidence_group:'safety_gas_smell',
      is_safety_question:true, customer_observable:true, is_active:true, answer_options:['yes','no','unknown']}]; },
    async getEffects() { return []; }, async getPricing() { throw Error('Unexpected pricing'); },
    async createSession() { return 'session'; }, async updateSession() {}, async recordCandidates() {},
    async recordQuestionAsked() {}, async recordAnswer() {}, async deleteAnswer() {},
  };
  const ai = {async extractIdentity() { return identity; }, async chooseQuestion({questions}) {return questions[0]?.id??null;}};
  return {repo, ai, calls};
}
async function run(message, identity, options) {
  const previous = process.env.DIAGNOSIS_STATE_SECRET;
  process.env.DIAGNOSIS_STATE_SECRET = 'offline-identity-regression';
  try {
    const f = fixture(identity, options);
    const result = await diagnoseBoiler(message, [], null, f.repo, f.ai);
    return {...f, result, state:decodeBoilerState(result.stateToken)};
  } finally {
    if (previous === undefined) delete process.env.DIAGNOSIS_STATE_SECRET;
    else process.env.DIAGNOSIS_STATE_SECRET = previous;
  }
}

test('A: explicit F76 survives AI Hatası and is removed from the family name', async () => {
  const {state, result} = await run('Demirdokum nitromiX F76 hatasi veriyor.',
    {brand:'DemirDöküm', model:'Nitromix F76', errorCode:'Hatası'});
  assert.equal(state.brand, 'DemirDöküm');
  assert.equal(normalizePartText(state.model), 'nitromix');
  assert.equal(state.errorCode, 'F76');
  assert.equal(state.familyId, 'family'); assert.equal(state.officialModelId, null);
  assert.equal(result.candidateProbabilities.length, 3);
  assert.equal(result.aiText, 'Gaz kokusu alıyor musunuz?');
  assert.equal(state.totalAskedQuestions, 1);
});

test('B: Turkish spelling and dotted F.76 survive the same malformed extraction', async () => {
  const {state, result} = await run('DemirDöküm nitromiX F.76 hatası veriyor.',
    {brand:'DemirDöküm', model:'nitromiX F.76', errorCode:'hatasi'});
  assert.equal(state.model, 'nitromiX'); assert.equal(state.errorCode, 'F.76');
  assert.equal(state.familyId, 'family'); assert.equal(result.resultState, 'diagnosing');
});

test('C: a natural-language hata is never an error code and the code is requested', async () => {
  for (const errorCode of ['hata','hatasi','Hatası','arıza','arizasi','veriyor','gösteriyor']) {
    const {state, result} = await run('Demirdokum nitromiX hata veriyor.',
      {brand:'DemirDöküm', model:'nitromiX', errorCode});
    assert.equal(state.model, 'nitromiX'); assert.equal(state.errorCode, null);
    assert.equal(state.pendingIdentity, 'code'); assert.match(result.aiText, /hata kodu/);
  }
});

test('D: official P24 NG HEP variant is preserved while trailing F76 is separated', async () => {
  const {state, result} = await run('Demirdokum nitromiX P24 NG HEP F76 hatasi veriyor.',
    {brand:'DemirDöküm', model:'nitromiX P24 NG HEP F76', errorCode:'hatasi'});
  assert.equal(state.model, 'nitromiX P24 NG (HEP)'); assert.equal(state.officialModelId, 'exact');
  assert.equal(state.errorCode, 'F76'); assert.equal(result.candidateProbabilities.length, 3);
});

test('E: Vaillant ecoTEC intro and F28 retain the family identity', async () => {
  const {state, result} = await run('Vaillant ecoTEC intro F28 hatası',
    {brand:'Vaillant', model:'ecoTEC intro F28', errorCode:'hatasi', actualCode:'F28'},
    {family:'ecoTEC intro', officialModels:[]});
  assert.equal(state.brand, 'Vaillant'); assert.equal(state.model, 'ecoTEC intro');
  assert.equal(state.errorCode, 'F28'); assert.equal(state.familyId, 'family');
  assert.equal(result.resultState, 'diagnosing');
});

test('F: a catalog-confirmed error-like model suffix is not stripped or treated as a fault code', async () => {
  const {state, result} = await run('Bosch Example C4 hata veriyor.',
    {brand:'Bosch', model:'Example C4', errorCode:'C4'},
    {family:'Example', officialModels:['Example C4']});
  assert.equal(state.model, 'Example C4'); assert.equal(state.errorCode, null);
  assert.equal(state.pendingIdentity, 'code'); assert.match(result.aiText, /hata kodu/);
});

test('a code-like official model token and a separate real code coexist safely', async () => {
  const {state} = await run('Bosch Example C4 EA hatası veriyor.',
    {brand:'Bosch', model:'Example C4 EA', errorCode:'Hatası', actualCode:'EA'},
    {family:'Example', officialModels:['Example C4']});
  assert.equal(state.model, 'Example C4'); assert.equal(state.officialModelId, 'exact');
  assert.equal(state.errorCode, 'EA');
});

test('deterministic extraction supports existing code formats even when AI returns a word', async () => {
  for (const code of ['F 76','E01','EA','C4','6A','A7','C6','501','5 01','5-01','5.01','1P1','6A/227']) {
    const {state, result} = await run(`Bosch Example ${code} hatası veriyor.`,
      {brand:'Bosch', model:`Example ${code}`, errorCode:'hatasi', actualCode:code},
      {family:'Example', officialModels:[]});
    assert.equal(state.model, 'Example', code); assert.equal(state.errorCode, code);
    assert.equal(result.resultState, 'diagnosing', code);
  }
});

test('model identifiers P24/P28/P35, 236/286 and 2500/2300 survive the new fault grammar',async()=>{
  for(const [brand,family,model] of [['DemirDöküm','nitromiX','nitromiX P24 NG HEP'],['DemirDöküm','nitromiX','nitromiX P28 NG HEP'],
    ['DemirDöküm','nitromiX','nitromiX P35 NG HEP'],['Vaillant','ecoTEC plus','ecoTEC plus 236'],['Vaillant','ecoTEC plus','ecoTEC plus 286'],
    ['Bosch','Condens','Condens 2500 W'],['Bosch','Condens','Condens 2300 W']]){
    const {state}=await run(`${brand} ${model} F28 hatası`,{brand,model:`${model} F28`,errorCode:'Hatası',actualCode:'F28'},
      {family,officialModels:[model]});
    assert.equal(state.model,model);assert.equal(state.officialModelId,'exact');assert.equal(state.errorCode,'F28');
  }
});

test('an explicit real code overrides a valid-looking but wrong AI code without deleting model numbers', async () => {
  const {state} = await run('Demirdokum nitromiX P24 NG HEP F76 hatasi veriyor.',
    {brand:'DemirDöküm', model:'nitromiX P24 NG HEP F76', errorCode:'P24'});
  assert.equal(state.errorCode, 'F76'); assert.equal(state.officialModelId, 'exact');
  assert.equal(state.model, 'nitromiX P24 NG (HEP)');
});

test('identity invented by AI still cannot enter state', async () => {
  const {state, result} = await run('Kombim hata veriyor.',
    {brand:'Bosch', model:'Example', errorCode:'EA'});
  assert.equal(state.brand, ''); assert.equal(state.model, ''); assert.equal(state.errorCode, null);
  assert.match(result.aiText, /markası nedir/);
});

test('equivalent brand display comes from the catalog without a manufacturer-specific rule', async () => {
  const {state} = await run('Demirdokum nitromiX F76 hatasi veriyor.',
    {brand:'Demirdokum', model:'nitromiX F76', errorCode:'Hatası'}, {catalogBrand:'DemirDöküm'});
  assert.equal(state.brand, 'DemirDöküm'); assert.equal(state.errorCode, 'F76');
  assert.equal(state.familyId, 'family');
});

test('bare alphabetic EA is separated from a model when AI misses the code', async () => {
  const {state} = await run('Bosch Example EA',
    {brand:'Bosch', model:'Example EA', errorCode:'', actualCode:'EA'},
    {family:'Example', officialModels:[]});
  assert.equal(state.model, 'Example'); assert.equal(state.errorCode, 'EA');
  assert.equal(state.familyId, 'family');
});
