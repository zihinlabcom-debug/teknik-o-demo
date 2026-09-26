import { createClient } from '@supabase/supabase-js';
import { canonicalManufacturer, normalizedModel } from './verified-knowledge';
import type { BoilerCandidate, BoilerQuestion, BoilerQuestionEffect, BoilerAssessment } from './boiler-probability';

export interface BoilerDevice {
  familyId: string; familyName: string; officialModelId: string | null;
  officialModelName: string | null;
}
export interface BoilerPrice {
  id: string; candidate_id: string; operation_name: string; operation_description: string | null;
  pricing_mode: string; currency: string; labor_price_min: number | null; labor_price_max: number | null;
  part_price_min: number | null; part_price_max: number | null; service_fee: number | null;
  part_name: string | null; valid_from: string | null; valid_until: string | null;
}
export interface BoilerRepository {
  resolveDevice(brand: string, model: string): Promise<BoilerDevice | 'ambiguous' | null>;
  getCandidates(familyId: string): Promise<BoilerCandidate[]>;
  getQuestions(): Promise<BoilerQuestion[]>;
  getEffects(candidateIds: string[]): Promise<BoilerQuestionEffect[]>;
  getPricing(candidateId: string): Promise<BoilerPrice | null>;
  createSession(input: { initialMessage: string | null; brand: string; familyId: string | null;
    officialModelId: string | null; errorCode: string | null }): Promise<string>;
  recordQuestionAsked(sessionId: string, questionId: string, askedAt: string): Promise<void>;
  recordAnswer(input: { sessionId: string; questionId: string; rawAnswer: string;
    answerKey: string; numericAnswer: number | null; askedAt: string | null; source: 'customer' | 'ai_extracted' }): Promise<void>;
  recordCandidates(sessionId: string, assessments: BoilerAssessment[]): Promise<void>;
  updateSession(sessionId: string, input: { status: 'diagnosing' | 'completed' | 'escalated';
    questionCompletionPercent: number | null; confidenceBasis: Record<string, unknown> | null;
    completedAt: string | null; brand: string; familyId: string | null;
    officialModelId: string | null; errorCode: string | null }): Promise<void>;
}

const fail = (error: { message: string } | null) => { if (error) throw new Error(`Boiler data access failed: ${error.message}`); };
const redactPII = (value: string) => value
  .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[e-posta]')
  .replace(/(?:\+90|0)?\s*5\d{2}[\s()-]*\d{3}[\s()-]*\d{2}[\s()-]*\d{2}/g, '[telefon]')
  .slice(0, 1000);

export function createSupabaseBoilerRepository(url: string, serviceRoleKey: string): BoilerRepository {
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async resolveDevice(brand, model) {
      const familiesResult = await db.from('boiler_model_families').select('id,brand,family_name,normalized_name')
        .eq('is_active', true).limit(5001);
      fail(familiesResult.error);
      const allFamilies = familiesResult.data ?? [];
      if (allFamilies.length > 5000) throw Error('Boiler family catalog exceeds lookup limit');
      const families = allFamilies.filter(row => canonicalManufacturer(row.brand) === canonicalManufacturer(brand));
      if (!families.length) return null;
      const familyIds = families.map(row => row.id);
      const [modelsResult, aliasesResult] = await Promise.all([
        db.from('boiler_official_models').select('id,family_id,official_model_name,normalized_name')
          .in('family_id', familyIds).eq('is_active', true).limit(5001),
        db.from('boiler_model_aliases').select('family_id,official_model_id,normalized_alias')
          .in('family_id', familyIds).eq('is_verified', true).limit(5001),
      ]);
      fail(modelsResult.error); fail(aliasesResult.error);
      if ((modelsResult.data?.length ?? 0) > 5000 || (aliasesResult.data?.length ?? 0) > 5000)
        throw Error('Boiler model catalog exceeds lookup limit');
      const target = normalizedModel(model);
      const models = (modelsResult.data ?? []).filter(row => normalizedModel(row.normalized_name) === target);
      const aliases = (aliasesResult.data ?? []).filter(row => normalizedModel(row.normalized_alias) === target);
      const familyMatches = families.filter(row => normalizedModel(row.normalized_name) === target);
      const matches = [
        ...models.map(row => ({ familyId: row.family_id, modelId: row.id })),
        ...aliases.map(row => ({ familyId: row.family_id, modelId: row.official_model_id })),
        ...familyMatches.map(row => ({ familyId: row.id, modelId: null })),
      ];
      const distinct = [...new Map(matches.map(row => [`${row.familyId}|${row.modelId ?? ''}`, row])).values()];
      if (distinct.length > 1) return 'ambiguous';
      if (!distinct.length) return null;
      const match = distinct[0], family = families.find(row => row.id === match.familyId)!;
      const official = match.modelId ? (modelsResult.data ?? []).find(row => row.id === match.modelId) : null;
      if (match.modelId && !official) return null;
      return { familyId: family.id, familyName: family.family_name,
        officialModelId: official?.id ?? null, officialModelName: official?.official_model_name ?? null };
    },
    async getCandidates(familyId) {
      const result = await db.from('boiler_fault_candidates')
        .select('id,candidate_name,verification_status,is_active,family_id,official_model_id,error_code')
        .eq('family_id', familyId).eq('verification_status', 'verified').eq('is_active', true).limit(1000);
      fail(result.error);
      if ((result.data?.length ?? 0) >= 1000) throw Error('Boiler candidate catalog exceeds lookup limit');
      return result.data ?? [];
    },
    async getQuestions() {
      const result = await db.from('boiler_diagnostic_questions')
        .select('id,question_key,question_text,evidence_group,customer_observable,is_safety_question,is_active,priority')
        .eq('is_active', true).eq('customer_observable', true).limit(1000);
      fail(result.error);
      if ((result.data?.length ?? 0) >= 1000) throw Error('Boiler question catalog exceeds lookup limit');
      return result.data ?? [];
    },
    async getEffects(candidateIds) {
      if (!candidateIds.length) return [];
      const result = await db.from('boiler_question_effects')
        .select('question_id,candidate_id,answer_key,effect').in('candidate_id', candidateIds).limit(10000);
      fail(result.error);
      if ((result.data?.length ?? 0) >= 10000) throw Error('Boiler effect catalog exceeds lookup limit');
      return (result.data ?? []) as BoilerQuestionEffect[];
    },
    async getPricing(candidateId) {
      const today = new Date().toISOString().slice(0, 10);
      const result = await db.from('boiler_repair_pricing')
        .select('id,candidate_id,operation_name,operation_description,pricing_mode,currency,labor_price_min,labor_price_max,part_price_min,part_price_max,service_fee,part_name,valid_from,valid_until')
        .eq('candidate_id', candidateId).eq('is_active', true).order('valid_from', { ascending: false, nullsFirst: false }).limit(100);
      fail(result.error);
      const current = (result.data ?? []).filter(row => (!row.valid_from || row.valid_from <= today) &&
        (!row.valid_until || row.valid_until >= today));
      // Multiple active offers need an explicit scenario decision, not a random first row.
      return current.length === 1 ? current[0] : null;
    },
    async createSession(input) {
      const result = await db.from('boiler_diagnosis_sessions').insert({
        initial_message: input.initialMessage ? redactPII(input.initialMessage) : null,
        detected_brand: input.brand, family_id: input.familyId,
        official_model_id: input.officialModelId, error_code: input.errorCode,
        status: 'diagnosing',
      }).select('id').single();
      fail(result.error);
      if (!result.data?.id) throw Error('Boiler session ID was not returned');
      return result.data.id;
    },
    async recordQuestionAsked(sessionId, questionId, askedAt) {
      const result = await db.from('boiler_diagnosis_answers').insert({
        session_id: sessionId, question_id: questionId, asked_at: askedAt,
      });
      fail(result.error);
    },
    async recordAnswer(input) {
      const result = await db.from('boiler_diagnosis_answers').upsert({
        session_id: input.sessionId, question_id: input.questionId,
        raw_answer: redactPII(input.rawAnswer), answer_key: input.answerKey,
        numeric_answer: input.numericAnswer, answer_source: input.source,
        asked_at: input.askedAt, answered_at: new Date().toISOString(),
      }, { onConflict: 'session_id,question_id' });
      fail(result.error);
    },
    async recordCandidates(sessionId, assessments) {
      if (!assessments.length) return;
      const result = await db.from('boiler_diagnosis_candidates').upsert(assessments.map(item => ({
        session_id: sessionId, candidate_id: item.candidateId,
        status: item.rank === 1 ? 'leading' : item.probability === 0 ? 'eliminated' : 'active',
        probability_percent: item.probability,
        evidence_summary: { method: 'v1_effect_factors', calibrated: false }, rank: item.rank,
      })), { onConflict: 'session_id,candidate_id' });
      fail(result.error);
    },
    async updateSession(sessionId, input) {
      const result = await db.from('boiler_diagnosis_sessions').update({
        status: input.status, question_completion_percent: input.questionCompletionPercent,
        diagnosis_confidence_percent: null, confidence_basis: input.confidenceBasis,
        completed_at: input.completedAt, detected_brand: input.brand,
        family_id: input.familyId, official_model_id: input.officialModelId,
        error_code: input.errorCode,
      }).eq('id', sessionId);
      fail(result.error);
    },
  };
}

export function productionBoilerRepository(): BoilerRepository | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createSupabaseBoilerRepository(url, key) : null;
}
