// Offline QA: uses the actual prepared rows and unchanged V1 probability engine.
// No HTTP, Supabase or OpenAI calls; no migration execution.
import { readFileSync, writeFileSync } from 'node:fs';
import { calculateBoilerWeights, consensusQuestionEffects, selectCandidatePool } from '../src/lib/boiler-probability.ts';

const data = JSON.parse(readFileSync(new URL('../tests/fixtures/stage3-question-backfill.json', import.meta.url), 'utf8'));
const variants = data.candidates.filter(c => c.family_id === 'nitromix');
const models = [...new Set(variants.map(c => c.official_model_id))];
const pool = selectCandidatePool(variants, 'nitromix', null, 'F76', models).candidates;
const mapped = consensusQuestionEffects(pool, data.effects);
const questions = Object.fromEntries(data.questions.map(q => [q.id, q]));
const observe = (id, key) => ({ questionId: id, answerKey: key, evidenceGroup: questions[id].evidence_group });
const scenarios = [
  { name: 'after_running_then_fast_temperature', inputs: [observe('safety_gas_smell', 'no'), observe('fault_timing_after_start', 'after_some_time'), observe('display_temperature_rise', 'yes')] },
  { name: 'immediate_then_unknown_temperature', inputs: [observe('safety_gas_smell', 'no'), observe('fault_timing_after_start', 'immediate'), observe('display_temperature_rise', 'unknown')] },
  { name: 'all_unknown_diagnostic_observations', inputs: [observe('safety_gas_smell', 'no'), observe('fault_timing_after_start', 'unknown'), observe('display_temperature_rise', 'unknown')] },
  { name: 'correct_after_running_to_immediate', inputs: [observe('fault_timing_after_start', 'after_some_time'), observe('fault_timing_after_start', 'immediate')] },
];
const result = scenarios.map(({ name, inputs }) => {
  let evidence = [];
  const steps = inputs.map(input => {
    evidence = [...evidence.filter(a => a.evidenceGroup !== input.evidenceGroup), input];
    const assessment = calculateBoilerWeights(pool, evidence, mapped);
    return { question: questions[input.questionId].question_text, answer: input.answerKey,
      evidenceCount: evidence.filter(a => a.answerKey !== 'unknown' && !questions[a.questionId].is_safety_question).length,
      effects: pool.map(c => ({ candidate: c.candidate_name,
        effect: mapped.find(e => e.candidate_id === c.id && e.question_id === input.questionId && e.answer_key === input.answerKey)?.effect ?? 'neutral' })),
      probabilities: assessment, leaderAtLeast75: assessment.some(a => a.probability >= 75) };
  });
  return { name, initial: calculateBoilerWeights(pool, [], mapped), steps };
});
const report = { mode: 'offline_unapplied_00031', f76: result, coefficientsUnchanged: 'support 2 / weaken 0.5 / neutral 1 / eliminate 0',
  limitation: '00031 is not applied. The live API cannot use these new effects yet. No live API/DB call was made.' };
writeFileSync(new URL('../test-results/stage3-question-backfill-offline.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ mode: report.mode, scenarios: result.map(s => ({
  name: s.name, final: s.steps.at(-1).probabilities.map(c => ({ name: c.candidateName, probability: c.probability })),
  leaderAtLeast75: s.steps.at(-1).leaderAtLeast75,
})), report: 'test-results/stage3-question-backfill-offline.json' }, null, 2));
