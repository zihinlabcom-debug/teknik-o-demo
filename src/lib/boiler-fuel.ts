import { normalizePartText } from './parts-catalog';
import type { BoilerCandidate, BoilerQuestion } from './boiler-probability';

export type BoilerFuelType = 'gas' | 'electric';

// Combustion observations cannot be evidence for a non-combustion device.
const combustionTerms = /\b(?:gaz|gas|brulor|burner|iyonizasyon|ionization|alev|flame|yanma|combustion|baca|flue|atesleme|ignition)\w*/;
const gasTopics = new Set(['safety_gas_smell', 'household_gas_availability', 'gas_other_appliance', 'ignition_attempt_sequence']);

export function questionAllowedForFuel(question: BoilerQuestion, fuel: BoilerFuelType) {
  return fuel === 'gas' || (!gasTopics.has(question.question_key) &&
    !gasTopics.has(question.evidence_group ?? '') &&
    !combustionTerms.test(normalizePartText(`${question.question_key.replaceAll('_', ' ')} ${question.evidence_group ?? ''} ${question.question_text}`)));
}

export function candidateAllowedForFuel(candidate: BoilerCandidate, fuel: BoilerFuelType) {
  return fuel === 'gas' || (!['gas_supply', 'ignition', 'combustion_air'].includes(candidate.fault_class ?? '') &&
    !combustionTerms.test(normalizePartText(candidate.candidate_name)));
}
