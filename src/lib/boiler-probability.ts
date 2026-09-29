import { normalizePartText } from './parts-catalog';
import {matchesBoilerErrorCode} from './boiler-error-code';
import {candidateSourceEvidence,deduplicateSourceCandidates} from './boiler-candidate-dedup';
export {normalizeBoilerErrorCode} from './boiler-error-code';

// V1 diagnostic weights are provisional relative weights, never calibrated
// probabilities. Keep all coefficients here so field evidence can replace them.
export const BOILER_EFFECT_FACTOR = { support: 2, weaken: 0.5, neutral: 1, eliminate: 0 } as const;
export const MAX_BOILER_QUESTIONS = 12;
export const PRICE_CANDIDATE_THRESHOLD = 75;

export type BoilerEffect = keyof typeof BOILER_EFFECT_FACTOR;
export type BoilerResultState = 'diagnosing' | 'verification' | 'priced_candidate' | 'pricing_missing' | 'uncertain_price' | 'safety_stop';
export interface BoilerCandidate {
  id: string; candidate_name: string; verification_status: string; is_active: boolean;
  family_id: string | null; official_model_id: string | null; error_code: string | null;
  fault_class?: string;
  // Runtime-only provenance for one logical candidate shared by model variants.
  sourceCandidateIds?: string[];
  sourceCandidateGroups?: string[][];
  official_error_record_id?: number | string;
  evidence_note?: string; evidence_url?: string; evidence_source_type?: string;
  sourceRecord?: {id:number|string;official_description:string|null;official_action:string|null;source_url:string};
  sourceEvidence?: BoilerSourceEvidence[];
}
export interface BoilerSourceEvidence {
  candidateId:string;candidateName:string;official_error_record_id:number|string;
  evidence_note:string;evidence_url:string;evidence_source_type?:string;
}
export interface BoilerQuestion {
  id: string; question_key: string; question_text: string; evidence_group: string | null;
  answer_options?: string[] | null;
  customer_observable: boolean; is_safety_question: boolean; is_active: boolean; priority: number | null;
}
export interface BoilerQuestionEffect {
  id?: string; evidence_note?: string; source_url?: string;
  sourceEffects?: BoilerQuestionEffect[];
  question_id: string; candidate_id: string; answer_key: string; effect: BoilerEffect;
}
export interface BoilerAnswer {
  questionId: string; answerKey: string; evidenceGroup: string; askedAt?: string | null;
}
export interface BoilerAssessment {
  candidateId: string; candidateName: string; probability: number; rank: number;
  sourceCandidateIds?: string[];
  sourceCandidateGroups?: string[][];
  sourceEvidence?: BoilerSourceEvidence[];
}

export function verifiedCandidates(rows: BoilerCandidate[]) {
  return rows.filter(row => row.verification_status === 'verified' && row.is_active);
}

export type BoilerCandidateMode = 'error_code' | 'family_code_consensus' | 'symptom';
export interface BoilerCandidatePool {
  candidates: BoilerCandidate[]; mode: BoilerCandidateMode; requiresExactModel: boolean;
}

export function selectCandidatePool(rows: BoilerCandidate[], familyId: string, modelId: string | null,
  errorCode: string | null, errorCodeModelIds: string[] = []): BoilerCandidatePool {
  const familyRows = deduplicateSourceCandidates(verifiedCandidates(rows).filter(row => row.family_id === familyId));
  const scoped = familyRows.filter(row =>
    (row.official_model_id === null || row.official_model_id === modelId));
  const matchesCode = (row: BoilerCandidate) => !!errorCode && !!row.error_code &&
    matchesBoilerErrorCode(row.error_code,errorCode);
  const byCode = scoped.filter(matchesCode);
  if (byCode.length) return { candidates: byCode, mode: 'error_code', requiresExactModel: false };

  if (modelId === null && errorCode) {
    const variantRows = familyRows.filter(row => row.official_model_id !== null && matchesCode(row));
    const relevantModels = [...new Set(errorCodeModelIds)].sort();
    if (relevantModels.length) {
      const perModel = relevantModels.map(id => variantRows.filter(row => row.official_model_id === id));
      const signature = (row: BoilerCandidate) => row.fault_class?.trim() && normalizePartText(row.candidate_name)
        ? `${normalizePartText(row.candidate_name)}|${row.fault_class}` : null;
      const sets = perModel.map(pool => new Set(pool.map(signature)));
      const first = sets[0];
      if (first.size && !first.has(null) && sets.every(set => set.size === first.size &&
          [...first].every(value => set.has(value)))) {
        const groups = new Map<string, BoilerCandidate[]>();
        for (const row of perModel.flat()) {
          const key = signature(row)!;
          groups.set(key, [...(groups.get(key) ?? []), row]);
        }
        const candidates = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, members]) => {
          const ordered = [...members].sort((a, b) => a.id.localeCompare(b.id));
          // A real, stable DB id keeps snapshot FK compatibility. It is only a
          // representative: effects use every source id and pricing is blocked.
          return { ...ordered[0], sourceCandidateIds: [...new Set(ordered.flatMap(row=>row.sourceCandidateIds??[row.id]))],
            sourceCandidateGroups:ordered.map(row=>row.sourceCandidateIds??[row.id]),
            sourceEvidence:ordered.flatMap(candidateSourceEvidence) };
        });
        return { candidates, mode: 'family_code_consensus', requiresExactModel: false };
      }
      return { candidates: [], mode: 'symptom', requiresExactModel: true };
    }
    if (variantRows.length) return { candidates: [], mode: 'symptom', requiresExactModel: true };
  }
  return { candidates: scoped.filter(row => row.error_code === null), mode: 'symptom', requiresExactModel: false };
}

export function consensusQuestionEffects(candidates: BoilerCandidate[], effects: BoilerQuestionEffect[]): BoilerQuestionEffect[] {
  return candidates.flatMap(candidate => {
    const members = candidate.sourceCandidateIds ?? [candidate.id];
    const related = effects.filter(effect => members.includes(effect.candidate_id));
    const pairs = new Map(related.map(effect => [JSON.stringify([effect.question_id, effect.answer_key]), effect]));
    return [...pairs.values()].map(pair => {
      const perMember = (candidate.sourceCandidateGroups??members.map(id=>[id])).map(ids => {
        const values = [...new Set(related.filter(effect => ids.includes(effect.candidate_id) &&
          effect.question_id === pair.question_id && effect.answer_key === pair.answer_key).map(effect => effect.effect))];
        return values.length === 1 ? values[0] : 'neutral';
      });
      const effect = pair.answer_key !== 'unknown' && perMember.every(value => value === perMember[0])
        ? perMember[0] : 'neutral';
      return { question_id: pair.question_id, candidate_id: candidate.id, answer_key: pair.answer_key, effect,
        sourceEffects:related.filter(e=>e.question_id===pair.question_id&&e.answer_key===pair.answer_key) };
    });
  });
}

export function normalizeProbabilities(weights: number[]): number[] {
  if (!weights.length || weights.some(weight => !Number.isFinite(weight) || weight < 0)) throw Error('Invalid candidate weight');
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return [];
  // Largest remainder keeps the exact sum at 100.00 without changing rank.
  const raw = weights.map(weight => weight / total * 10000);
  const units = raw.map(value => Math.floor(value));
  const remainder = 10000 - units.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, fraction: value - units[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < remainder; i++) units[order[i].index]++;
  return units.map(value => value / 100);
}

export function calculateBoilerWeights(candidates: BoilerCandidate[], answers: BoilerAnswer[], effects: BoilerQuestionEffect[]): BoilerAssessment[] {
  if (!candidates.length) return [];
  const usedGroups = new Set<string>();
  const factors = new Map<string, number>(candidates.map(candidate => [candidate.id, 1]));
  for (const answer of answers) {
    const group = answer.evidenceGroup || answer.questionId;
    if (usedGroups.has(group)) continue;
    usedGroups.add(group);
    if (answer.answerKey === 'unknown') continue;
    for (const candidate of candidates) {
      const effect = effects.find(item => item.question_id === answer.questionId &&
        item.candidate_id === candidate.id && item.answer_key === answer.answerKey)?.effect ?? 'neutral';
      factors.set(candidate.id, factors.get(candidate.id)! * BOILER_EFFECT_FACTOR[effect]);
    }
  }
  const normalized = normalizeProbabilities(candidates.map(candidate => factors.get(candidate.id)!));
  if (!normalized.length) return [];
  const ranks = normalized.map((probability, index) => ({ probability, index }))
    .sort((a, b) => b.probability - a.probability || a.index - b.index);
  const rankByIndex = new Map(ranks.map((item, rank) => [item.index, rank + 1]));
  return candidates.map((candidate, index) => ({ candidateId: candidate.id, candidateName: candidate.candidate_name,
    probability: normalized[index], rank: rankByIndex.get(index)!,
    ...(candidate.sourceCandidateIds ? { sourceCandidateIds: candidate.sourceCandidateIds,
      sourceCandidateGroups:candidate.sourceCandidateGroups,sourceEvidence:candidate.sourceEvidence } : {}) }));
}

// A singleton's relative 100% comes from pool size, not diagnostic confirmation.
// Multiple-candidate pools still need observed effects to move a leader above 75%.
export function hasPricingEvidence(candidates: BoilerCandidate[], answers: BoilerAnswer[],
  questions: BoilerQuestion[], effects: BoilerQuestionEffect[]): boolean {
  if (candidates.length !== 1) return true;
  const candidateId = candidates[0].id;
  return answers.some(answer => {
    if (answer.answerKey === 'unknown') return false;
    const question = questions.find(item => item.id === answer.questionId);
    return !!question && question.is_active && question.customer_observable && !question.is_safety_question &&
      effects.some(effect => effect.question_id === question.id && effect.candidate_id === candidateId &&
        effect.answer_key === answer.answerKey && effect.effect === 'support');
  });
}

export function eligibleQuestions(questions: BoilerQuestion[], effects: BoilerQuestionEffect[],
  candidateIds: string[], askedIds: string[], usedGroups: string[], safetyOnly = false) {
  const asked = new Set(askedIds), groups = new Set(usedGroups);
  return questions.filter(question => question.is_active && question.customer_observable &&
    !asked.has(question.id) && !groups.has(question.evidence_group || question.question_key) &&
    (safetyOnly ? question.is_safety_question : !question.is_safety_question) &&
    (safetyOnly || new Set(effects.filter(effect => effect.question_id === question.id &&
      candidateIds.includes(effect.candidate_id) && effect.answer_key !== 'unknown' && effect.effect !== 'neutral')
      .map(effect => effect.candidate_id)).size > 0))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function determineBoilerResult(assessments: BoilerAssessment[], questionCount: number,
  firstThresholdAt: number | null, usefulQuestionAvailable: boolean, pricingAvailable: boolean,
  pricingEvidenceReady: boolean): BoilerResultState {
  if (!assessments.length) return 'uncertain_price';
  const top = Math.max(...assessments.map(item => item.probability));
  if (top >= PRICE_CANDIDATE_THRESHOLD && pricingEvidenceReady) {
    const remaining = firstThresholdAt === null ? Math.min(2, MAX_BOILER_QUESTIONS - questionCount)
      : Math.min(2, MAX_BOILER_QUESTIONS - firstThresholdAt) - (questionCount - firstThresholdAt);
    if (remaining > 0 && usefulQuestionAvailable) return 'verification';
    return pricingAvailable ? 'priced_candidate' : 'pricing_missing';
  }
  return questionCount >= MAX_BOILER_QUESTIONS || !usefulQuestionAvailable ? 'uncertain_price' : 'diagnosing';
}
