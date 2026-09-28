import {normalizePartText} from './parts-catalog';
import type {BoilerCandidate,BoilerQuestion,BoilerQuestionEffect} from './boiler-probability';

// Compatibility guard until the additive effect-review migration is applied.
// Warmup timing alone does not contradict heat-sensitive contact faults.
export function reviewedBoilerEffects(candidates:BoilerCandidate[],questions:BoilerQuestion[],effects:BoilerQuestionEffect[]) {
  const connections=new Set(candidates.filter(c=>/\b(?:kablo|soket|baglanti)\w*/.test(normalizePartText(c.candidate_name))).map(c=>c.id));
  const timing=new Set(questions.filter(q=>q.question_key==='fault_timing_after_start').map(q=>q.id));
  return effects.map(e=>connections.has(e.candidate_id)&&timing.has(e.question_id)&&e.answer_key==='after_some_time'&&e.effect==='weaken'
    ?{...e,effect:'neutral' as const}:e);
}
