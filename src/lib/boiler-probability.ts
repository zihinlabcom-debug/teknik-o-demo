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
}
export interface BoilerQuestion {
  id: string; question_key: string; question_text: string; evidence_group: string | null;
  customer_observable: boolean; is_safety_question: boolean; is_active: boolean; priority: number | null;
}
export interface BoilerQuestionEffect {
  question_id: string; candidate_id: string; answer_key: string; effect: BoilerEffect;
}
export interface BoilerAnswer {
  questionId: string; answerKey: string; evidenceGroup: string; askedAt?: string | null;
}
export interface BoilerAssessment {
  candidateId: string; candidateName: string; probability: number; rank: number;
}

export function verifiedCandidates(rows: BoilerCandidate[]) {
  return rows.filter(row => row.verification_status === 'verified' && row.is_active);
}

export function selectCandidatePool(rows: BoilerCandidate[], familyId: string, modelId: string | null, errorCode: string | null) {
  const scoped = verifiedCandidates(rows).filter(row => row.family_id === familyId &&
    (row.official_model_id === null || row.official_model_id === modelId));
  const normalize = (value: string) => value.toUpperCase().replace(/[.\s-]/g, '');
  const byCode = errorCode ? scoped.filter(row => row.error_code && normalize(row.error_code) === normalize(errorCode)) : [];
  return { candidates: byCode.length ? byCode : scoped.filter(row => row.error_code === null),
    mode: byCode.length ? 'error_code' as const : 'symptom' as const };
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
    probability: normalized[index], rank: rankByIndex.get(index)! }));
}

export function eligibleQuestions(questions: BoilerQuestion[], effects: BoilerQuestionEffect[],
  candidateIds: string[], askedIds: string[], usedGroups: string[], safetyOnly = false) {
  const asked = new Set(askedIds), groups = new Set(usedGroups);
  return questions.filter(question => question.is_active && question.customer_observable &&
    !asked.has(question.id) && !groups.has(question.evidence_group || question.question_key) &&
    (safetyOnly ? question.is_safety_question : !question.is_safety_question) &&
    (safetyOnly || (() => {
      const rows = effects.filter(effect => effect.question_id === question.id && effect.answer_key !== 'unknown');
      const keys = [...new Set(rows.map(item => item.answer_key))];
      return keys.some(key => {
        const factors = candidateIds.map(id => BOILER_EFFECT_FACTOR[
          rows.find(item => item.candidate_id === id && item.answer_key === key)?.effect ?? 'neutral']);
        return candidateIds.length === 1 ? factors[0] !== 1 : new Set(factors).size > 1;
      });
    })()))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function determineBoilerResult(assessments: BoilerAssessment[], questionCount: number,
  firstThresholdAt: number | null, usefulQuestionAvailable: boolean, pricingAvailable: boolean): BoilerResultState {
  if (!assessments.length) return 'uncertain_price';
  const top = Math.max(...assessments.map(item => item.probability));
  if (top >= PRICE_CANDIDATE_THRESHOLD) {
    const remaining = firstThresholdAt === null ? Math.min(2, MAX_BOILER_QUESTIONS - questionCount)
      : Math.min(2, MAX_BOILER_QUESTIONS - firstThresholdAt) - (questionCount - firstThresholdAt);
    if (remaining > 0 && usefulQuestionAvailable) return 'verification';
    return pricingAvailable ? 'priced_candidate' : 'pricing_missing';
  }
  return questionCount >= MAX_BOILER_QUESTIONS || !usefulQuestionAvailable ? 'uncertain_price' : 'diagnosing';
}
