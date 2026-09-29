import {normalizePartText} from './parts-catalog';
import type {BoilerCandidate,BoilerQuestion,BoilerQuestionEffect} from './boiler-probability';
import type {BoilerTimeline} from './boiler-timeline';

// Compatibility guard until the additive effect-review migration is applied.
// Warmup timing alone does not contradict heat-sensitive contact faults.
// "Immediate" describes timing, not a first cold startup: recurring faults
// cannot inherit a startup-control inference just by returning immediately.
export function reviewedBoilerEffects(candidates:BoilerCandidate[],questions:BoilerQuestion[],effects:BoilerQuestionEffect[],timeline?:BoilerTimeline) {
  const connections=new Set(candidates.filter(c=>/\b(?:kablo|soket|baglanti)\w*/.test(normalizePartText(c.candidate_name))).map(c=>c.id));
  const timing=new Set(questions.filter(q=>q.question_key==='fault_timing_after_start').map(q=>q.id));
  const startupPoints=new Set(candidates.filter(c=>/\b(?:kablo|soket|baglanti|kontrol|elektronik)\w*/.test(normalizePartText(c.candidate_name))).map(c=>c.id));
  return effects.map(e=>
    (connections.has(e.candidate_id)&&timing.has(e.question_id)&&e.answer_key==='after_some_time'&&e.effect==='weaken')||
    (timeline?.startupContext!=='first_cold_start'&&timing.has(e.question_id)&&
      startupPoints.has(e.candidate_id)&&e.answer_key==='immediate'&&e.effect==='support')
    ?{...e,effect:'neutral' as const,sourceEffects:e.sourceEffects??[e]}:e);
}
