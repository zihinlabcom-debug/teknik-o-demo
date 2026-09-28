import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeBoilerState, diagnoseBoiler } from '../src/lib/boiler-diagnosis.ts';
import { calculateBoilerWeights, consensusQuestionEffects, eligibleQuestions, selectCandidatePool } from '../src/lib/boiler-probability.ts';
import { countBoilerQuestionRequests } from '../src/lib/boiler-question-budget.ts';

const data = JSON.parse(readFileSync(new URL('./fixtures/stage3-question-backfill.json', import.meta.url), 'utf8'));
const f76 = data.candidates.filter(c => c.family_id === 'nitromix');
const models = [...new Set(f76.map(c => c.official_model_id))];
const family = selectCandidatePool(f76, 'nitromix', null, 'F76', models);
const effects = consensusQuestionEffects(family.candidates, data.effects);
const answer = (questionId, answerKey) => ({ questionId, answerKey, evidenceGroup: questionId });
const probabilities = answers => calculateBoilerWeights(family.candidates, answers, effects);
const byName = result => Object.fromEntries(result.map(c => [c.candidateName ?? c.name, c.probability]));
const termic = 'Termik kapatma düzeneği sorunu', exchanger = 'Eşanjör/ısı bloğu sorunu', cable = 'Kablolama/soket/bağlantı sorunu';

async function signed(run) {
  const previous = process.env.DIAGNOSIS_STATE_SECRET;
  process.env.DIAGNOSIS_STATE_SECRET = 'offline-question-backfill-secret';
  try { await run(); } finally {
    if (previous === undefined) delete process.env.DIAGNOSIS_STATE_SECRET;
    else process.env.DIAGNOSIS_STATE_SECRET = previous;
  }
}

function fixture({ questions = data.questions, extract = false } = {}) {
  const calls = { answers: [], prices: 0, questions: [] };
  const repo = {
    async resolveDevice() { return { familyId: 'nitromix', familyName: 'nitromiX', officialModelId: null }; },
    async getErrorCodeModelIds() { return models; }, async getCandidates() { return f76; },
    async getQuestions() { return questions; }, async getEffects(ids) { return data.effects.filter(e => ids.includes(e.candidate_id)); },
    async getPricing() { calls.prices++; throw Error('Family pricing must remain blocked'); },
    async createSession() { return 'offline-session'; }, async updateSession() {}, async recordCandidates() {},
    async recordQuestionAsked(_session, id) { calls.questions.push(id); },
    async recordAnswer(input) { calls.answers.push(input); }, async deleteAnswer() {},
  };
  const ai = {
    async extractIdentity() { return { brand: 'DemirDöküm', model: 'nitromiX', errorCode: 'F.76' }; },
    async chooseQuestion({ questions: choices }) { return choices[0]?.id ?? null; },
    async classifyAnswer(question, message, allowed) {
      const key = question.id === 'safety_gas_smell' ? (/var|evet/i.test(message) ? 'yes' : 'no') :
        question.id === 'fault_timing_after_start' ? (/bir süre/i.test(message) ? 'after_some_time' : 'immediate') :
        question.id === 'display_temperature_rise' && /^Evet/.test(message) ? 'yes' : 'unknown';
      assert.ok(allowed.includes(key)); return key;
    },
    ...(extract ? { async extractObservedAnswers(message) {
      const match = message.match(/Bir süre çalıştıktan sonra|hata başlar başlamaz geliyor/i);
      return match ? [{ questionId: 'fault_timing_after_start', answerKey: /bir süre/i.test(match[0]) ? 'after_some_time' : 'immediate', quote: match[0] }] : [];
    } } : {}),
  };
  return { repo, ai, calls };
}
const initial = 'DemirDöküm nitromiX kombim F.76 hatası veriyor.';
async function start(run) {
  const first = await diagnoseBoiler(initial, [], null, run.repo, run.ai);
  const second = await diagnoseBoiler('Hayır, gaz kokusu almıyorum.', [{ role: 'user', content: initial }], first.stateToken, run.repo, run.ai);
  return { first, second, history: [{ role: 'user', content: initial }, { role: 'user', content: 'Hayır, gaz kokusu almıyorum.' }] };
}

test('generated F76 family pool has three logical candidates and compatible timing and temperature questions', () => {
  assert.equal(family.mode, 'family_code_consensus'); assert.equal(family.candidates.length, 3);
  assert.ok(family.candidates.every(c => c.sourceCandidateIds.length === 3));
  assert.deepEqual(new Set(eligibleQuestions(data.questions, effects, family.candidates.map(c => c.id), [], []).map(q => q.id)),
    new Set(['fault_timing_after_start', 'display_temperature_rise']));
});

test('F76 safety no keeps all candidates and now continues with a diagnostic timing question', async () => signed(async () => {
  const run = fixture(); const { first, second } = await start(run);
  assert.equal(first.aiText, data.questions.find(q => q.id === 'safety_gas_smell').question_text);
  assert.equal(second.resultState, 'diagnosing');
  assert.equal(decodeBoilerState(second.stateToken).pendingQuestionId, 'fault_timing_after_start');
  assert.deepEqual(second.candidateProbabilities, first.candidateProbabilities);
  assert.equal(decodeBoilerState(second.stateToken).totalAskedQuestions, 2);
  assert.equal(run.calls.prices, 0);
}));

test('F76 after-running evidence supports thermal/exchanger and leaves wiring neutral without reaching 75', async () => signed(async () => {
  const run = fixture(); const { second, history } = await start(run);
  const third = await diagnoseBoiler('Bir süre çalıştıktan sonra hata veriyor.', history, second.stateToken, run.repo, run.ai);
  assert.deepEqual(byName(third.candidateProbabilities), { [exchanger]: 40, [cable]: 20, [termic]: 40 });
  assert.equal(decodeBoilerState(third.stateToken).pendingQuestionId, 'display_temperature_rise');
  const fourth = await diagnoseBoiler('Evet, ekrandaki sıcaklık normalden çok hızlı yükseliyor.', history, third.stateToken, run.repo, run.ai);
  assert.deepEqual(byName(fourth.candidateProbabilities), { [exchanger]: 44.45, [cable]: 11.11, [termic]: 44.44 });
  assert.equal(fourth.resultState, 'uncertain_price'); assert.equal(fourth.pricingData, null);
  assert.equal(run.calls.prices, 0);
}));

test('unknown timing remains neutral and no same physical group is ever multiplied twice', () => {
  assert.deepEqual(probabilities([answer('fault_timing_after_start', 'unknown')]), probabilities([]));
  const one = answer('fault_timing_after_start', 'after_some_time');
  assert.deepEqual(probabilities([one, one, { ...one, questionId: 'duplicated-observation' }]), probabilities([one]));
  assert.equal(probabilities([one]).reduce((sum, c) => sum + c.probability, 0), 100);
});

test('a repeated timing observation is persisted once and is not asked again', async () => signed(async () => {
  const run = fixture({ extract: true }); const { second, history } = await start(run);
  const third = await diagnoseBoiler('Bir süre çalıştıktan sonra hata veriyor.', history, second.stateToken, run.repo, run.ai);
  const fourth = await diagnoseBoiler('Bir süre çalıştıktan sonra hata veriyor.', history, third.stateToken, run.repo, run.ai);
  assert.deepEqual(fourth.candidateProbabilities, third.candidateProbabilities);
  assert.equal(run.calls.answers.filter(a => a.questionId === 'fault_timing_after_start').length, 1);
  assert.equal(run.calls.questions.filter(id => id === 'fault_timing_after_start').length, 1);
  assert.equal(decodeBoilerState(fourth.stateToken).totalAskedQuestions, 3);
}));

test('timing correction replaces old evidence and recomputes from scratch in the real backend', async () => signed(async () => {
  const run = fixture({ extract: true }); const { second, history } = await start(run);
  const third = await diagnoseBoiler('Bir süre çalıştıktan sonra hata veriyor.', history, second.stateToken, run.repo, run.ai);
  const fourth = await diagnoseBoiler('Aslında hata başlar başlamaz geliyor.', history, third.stateToken, run.repo, run.ai);
  const state = decodeBoilerState(fourth.stateToken);
  assert.equal(state.answers.filter(a => a.evidenceGroup === 'fault_timing_after_start').length, 1);
  assert.equal(state.answers.find(a => a.evidenceGroup === 'fault_timing_after_start').answerKey, 'immediate');
  assert.deepEqual(byName(fourth.candidateProbabilities), { [exchanger]: 25, [cable]: 50, [termic]: 25 });
  assert.equal(state.totalAskedQuestions, 3);
}));

test('spontaneous timing evidence consumes zero question slots and suppresses the corresponding question', async () => signed(async () => {
  const run = fixture({ extract: true });
  const first = await diagnoseBoiler(`${initial} Bir süre çalıştıktan sonra hata veriyor.`, [], null, run.repo, run.ai);
  const state = decodeBoilerState(first.stateToken);
  assert.equal(state.totalAskedQuestions, 1); // Only the actually asked safety question.
  assert.equal(state.answers[0].askedAt, null);
  assert.equal(state.answers[0].answerKey, 'after_some_time');
  assert.deepEqual(run.calls.questions, ['safety_gas_smell']);
}));

test('the catalog has exactly one ignition physical group and each new prompt costs one question', () => {
  assert.deepEqual(data.questions.filter(q => q.question_key.includes('ignition')).map(q => q.evidence_group), ['ignition_attempt_sequence']);
  for (const q of data.questions.filter(q => ['fault_timing_after_start', 'display_temperature_rise', 'ignition_attempt_sequence', 'heating_dhw_scope'].includes(q.id)))
    assert.equal(countBoilerQuestionRequests(q.question_text), 1);
});

test('Vaillant F28 generated sequences change relative weights and keep the six original candidates', () => {
  const pool = data.candidates.filter(c => c.family_id === 'ecotec intro');
  const gasYes = answer('gas_other_appliance', 'yes');
  const clicks = calculateBoilerWeights(pool, [gasYes, answer('ignition_attempt_sequence', 'clicks_no_heat')], data.effects);
  const silent = calculateBoilerWeights(pool, [gasYes, answer('ignition_attempt_sequence', 'silent_immediate')], data.effects);
  assert.equal(pool.length, 6); assert.notDeepEqual(clicks, silent);
  assert.ok(clicks.find(c => /Gaz armatürü/.test(c.candidateName)).probability > silent.find(c => /Gaz armatürü/.test(c.candidateName)).probability);
  assert.equal(clicks.reduce((sum, c) => sum + c.probability, 0), 100);
  assert.equal(silent.reduce((sum, c) => sum + c.probability, 0), 100);
});

test('generated variant effects require every source member; conflict or missing stays neutral', () => {
  const target = data.effects.find(e => f76.some(c => c.id === e.candidate_id) && e.question_id === 'fault_timing_after_start' && e.answer_key === 'after_some_time');
  for (const stored of [data.effects.filter(e => e !== target), data.effects.map(e => e === target ? { ...e, effect: 'neutral' } : e)]) {
    const mapped = consensusQuestionEffects(family.candidates, stored);
    const logical = family.candidates.find(c => c.sourceCandidateIds.includes(target.candidate_id));
    assert.equal(mapped.find(e => e.candidate_id === logical.id && e.question_id === target.question_id && e.answer_key === target.answer_key).effect, 'neutral');
  }
});

test('generated rows never eliminate; safety gas smell has no probability effects and still stops', async () => signed(async () => {
  assert.ok(data.effects.every(e => e.effect !== 'eliminate' && e.answer_key !== 'unknown' && e.question_id !== 'safety_gas_smell'));
  const run = fixture(); const { first } = await start(run);
  const stopped = await diagnoseBoiler('Evet, gaz kokusu var.', [{ role: 'user', content: initial }], first.stateToken, run.repo, run.ai);
  assert.equal(stopped.resultState, 'safety_stop'); assert.equal(stopped.pricingData, null);
}));

test('new questions cannot exceed the existing total twelve-question cap', async () => signed(async () => {
  const run = fixture();
  const history = Array.from({ length: 12 }, () => ({ role: 'assistant', content: 'Gözlem nedir?' }));
  const result = await diagnoseBoiler(initial, history, null, run.repo, run.ai);
  assert.equal(decodeBoilerState(result.stateToken).totalAskedQuestions, 12);
  assert.equal(run.calls.questions.length, 0); assert.equal(result.resultState, 'uncertain_price');
}));
