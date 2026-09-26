import { createHmac, timingSafeEqual } from 'node:crypto';
import { canAskBoilerQuestion, countAskedQuestions, countBoilerQuestionRequests } from './boiler-question-budget';
import { containsErrorCode } from './manufacturer-document';
import { normalizePartText } from './parts-catalog';
import { inferObservedTopics } from './diagnostic-state';
import { calculateBoilerWeights, determineBoilerResult, eligibleQuestions, MAX_BOILER_QUESTIONS,
  PRICE_CANDIDATE_THRESHOLD, selectCandidatePool, type BoilerAnswer, type BoilerQuestion,
  type BoilerQuestionEffect, type BoilerResultState } from './boiler-probability';
import type { BoilerRepository, BoilerPrice } from './boiler-supabase';

export interface BoilerMessage { role: 'user' | 'assistant'; content: string }
export interface BoilerAI {
  extractIdentity(conversation: BoilerMessage[]): Promise<{ brand: string; model: string; errorCode: string }>;
  classifyAnswer(question: BoilerQuestion, message: string, allowedKeys: string[]): Promise<string>;
  extractObservedAnswers?(message: string, questions: { id: string; text: string; allowedKeys: string[] }[]):
    Promise<{ questionId: string; answerKey: string; quote: string }[]>;
  chooseQuestion(input: { brand: string; model: string; errorCode: string | null;
    candidates: { id: string; name: string; probability: number }[];
    questions: BoilerQuestion[]; effects: BoilerQuestionEffect[]; customerMessages: string[] }): Promise<string | null>;
}
interface BoilerState {
  version: 1; sessionId: string; brand: string; model: string; errorCode: string | null;
  familyId: string | null; officialModelId: string | null;
  codeAsked: boolean; pendingIdentity: 'brand' | 'model' | 'code' | null;
  answers: BoilerAnswer[]; askedQuestionIds: string[]; totalAskedQuestions: number;
  pendingQuestionId: string | null; pendingAskedAt: string | null;
  firstThresholdAt: number | null; finished: boolean; resultState: BoilerResultState;
}
const secret = () => process.env.DIAGNOSIS_STATE_SECRET || process.env.OPENAI_API_KEY;
export function encodeBoilerState(state: BoilerState) {
  const key = secret(); if (!key) throw Error('Missing diagnosis state secret');
  const body = Buffer.from(JSON.stringify({ state, expires: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const mac = createHmac('sha256', key).update('boiler-v1:' + body).digest('base64url');
  return `boiler.${body}.${mac}`;
}
export function decodeBoilerState(token: unknown): BoilerState | null {
  if (!token) return null;
  if (typeof token !== 'string' || token.length > 100000 || !token.startsWith('boiler.')) return null;
  const key = secret(); if (!key) throw Error('Missing diagnosis state secret');
  const [, body, mac] = token.split('.');
  if (!body || !mac) throw Error('Invalid boiler state');
  const expected = createHmac('sha256', key).update('boiler-v1:' + body).digest();
  const received = Buffer.from(mac, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw Error('Invalid boiler state signature');
  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (parsed.expires < Date.now() || parsed.state?.version !== 1 || !Array.isArray(parsed.state?.answers) ||
      !Array.isArray(parsed.state?.askedQuestionIds)) throw Error('Expired or invalid boiler state');
  return parsed.state;
}
const unknown = (message: string) => /^(bilmiyorum|emin degilim|goremiyorum|hata kodu yok|kod yok|hatirlamiyorum)[.!? ]*$/.test(normalizePartText(message));
const ambiguousAnswer = (message: string) => /\b(?:belki|galiba|sanirim|emin degilim|tam emin degilim|olabilir)\b/.test(normalizePartText(message));
const correction = (message: string) => /^(?:aslinda|duzeltiyorum|yanlis soyledim)\b/.test(normalizePartText(message));
const safety = (message: string) => /(?:gaz kokusu (?:var|geliyor)|gaz kacagi var|gaz kokuyor|yanik kokusu (?:var|geliyor)|duman cikiyor|ciddi su kacagi var|elektrik carpti|asiri isinma (?:var|oluyor))/.test(normalizePartText(message));
const safeQuestion = (value: string) => !/(?:multimetre|voltaj|direnc|ohm|gaz basinc|servis manometresi|baca gazi|yanma analizi|kart uzerinde|cihazi sok|kapagi ac|gaz valfi|gaz vanasini|gaz baglantisi|elektrik baglantisi|fi[sş]i cek)/.test(normalizePartText(value));
const supportedKey = (question: BoilerQuestion, effects: BoilerQuestionEffect[]) => [...new Set([
  ...effects.filter(item => item.question_id === question.id).map(item => item.answer_key), 'unknown',
])];

export async function diagnoseBoiler(message: string, history: BoilerMessage[], token: unknown,
  repository: BoilerRepository, ai: BoilerAI, options: { budgetFloor?: number; rebuildFromHistory?: boolean;
    identityFallback?: { brand: string; model: string; errorCode: string | null; codeAsked: boolean } } = {}) {
  let state = decodeBoilerState(token);
  const conversation = [...history, { role: 'user' as const, content: message }];
  const customerMessages = conversation.filter(item => item.role === 'user').map(item => item.content);
  const customerText = customerMessages.join(' ');
  const extracted = await ai.extractIdentity(conversation);
  const inText = (value: string) => value && ` ${normalizePartText(customerText)} `.includes(` ${normalizePartText(value)} `);
  const brand = inText(extracted.brand) ? extracted.brand.trim() : state?.brand ?? options.identityFallback?.brand ?? '';
  const model = inText(extracted.model) ? extracted.model.trim() : state?.model ?? options.identityFallback?.model ?? '';
  const errorCode = containsErrorCode(customerText, extracted.errorCode) ? extracted.errorCode.trim() :
    state?.errorCode ?? options.identityFallback?.errorCode ?? null;
  let budgetFloor = Math.max(0, Math.min(MAX_BOILER_QUESTIONS, options.budgetFloor ?? 0));
  const changedIdentity = state && ((state.brand && brand && normalizePartText(state.brand) !== normalizePartText(brand)) ||
    (state.model && model && normalizePartText(state.model) !== normalizePartText(model)) ||
    (state.errorCode && errorCode && state.errorCode.toUpperCase().replace(/[.\s-]/g, '') !==
      errorCode.toUpperCase().replace(/[.\s-]/g, '')));
  if (changedIdentity && state) {
    budgetFloor = Math.max(budgetFloor, state.totalAskedQuestions ?? state.askedQuestionIds.length);
    await repository.updateSession(state.sessionId, { status: 'escalated',
      questionCompletionPercent: Math.round(budgetFloor / MAX_BOILER_QUESTIONS * 10000) / 100,
      confidenceBasis: { reason: 'device_identity_changed', calibrated: false },
      completedAt: new Date().toISOString(), brand: state.brand,
      familyId: state.familyId ?? null, officialModelId: state.officialModelId ?? null, errorCode: state.errorCode });
    state = null;
  }
  if (!state) {
    const sessionId = await repository.createSession({ initialMessage: message, brand,
      familyId: null, officialModelId: null, errorCode });
    state = { version: 1, sessionId, brand, model, errorCode, familyId: null, officialModelId: null,
      codeAsked: options.identityFallback?.codeAsked ?? false,
      pendingIdentity: null, answers: [], askedQuestionIds: [], totalAskedQuestions: Math.max(budgetFloor, countAskedQuestions(history)), pendingQuestionId: null,
      pendingAskedAt: null, firstThresholdAt: null, finished: false, resultState: 'diagnosing' };
  }
  if (!Number.isInteger(state.totalAskedQuestions) || state.totalAskedQuestions < state.askedQuestionIds.length ||
      state.totalAskedQuestions > MAX_BOILER_QUESTIONS)
    state.totalAskedQuestions = Math.max(budgetFloor, state.askedQuestionIds.length, countAskedQuestions(history));
  state.brand = brand; state.model = model; state.errorCode = errorCode;
  const result = async (reply: string, resultState: BoilerResultState, options: {
    assessments?: ReturnType<typeof calculateBoilerWeights>; price?: BoilerPrice | null;
    familyId?: string | null; officialModelId?: string | null; mode?: 'error_code' | 'symptom' | 'none';
  } = {}) => {
    const finished = ['priced_candidate','pricing_missing','uncertain_price','safety_stop'].includes(resultState);
    state!.finished = finished;
    state!.resultState = resultState;
    await repository.updateSession(state!.sessionId, {
      status: resultState === 'safety_stop' || resultState === 'uncertain_price' ? 'escalated' : finished ? 'completed' : 'diagnosing',
      questionCompletionPercent: Math.round(state!.totalAskedQuestions / MAX_BOILER_QUESTIONS * 10000) / 100,
      confidenceBasis: { method: 'v1_relative_effect_factors', calibrated: false,
        topRelativeWeight: options.assessments?.length ? Math.max(...options.assessments.map(item => item.probability)) : null,
        candidateMode: options.mode ?? 'none', resultState },
      completedAt: finished ? new Date().toISOString() : null,
      brand: state!.brand, familyId: options.familyId ?? state!.familyId,
      officialModelId: options.officialModelId ?? state!.officialModelId, errorCode: state!.errorCode,
    });
    return {
      aiText: reply, stateToken: encodeBoilerState(state!), resultState,
      canRouteTechnician: finished, assessmentComplete: finished,
      candidateProbabilities: (options.assessments ?? []).map(item => ({ name: item.candidateName, probability: item.probability })),
      informationProgress: Math.round(state!.totalAskedQuestions / MAX_BOILER_QUESTIONS * 100),
      researchStatus: options.assessments?.length ? 'verified' : 'not_found',
      diagnosticStatus: resultState === 'safety_stop' ? 'safety_stop' : finished ? 'needs_onsite' : 'diagnosing',
      pricingStatus: resultState === 'pricing_missing' ? 'pricing_missing' : resultState === 'priced_candidate' ? 'available' : resultState,
      pricingData: options.price ?? null, estimatedPrice: null, isReadyForPrice: false,
      priceSource: null, deterministicOMF: null, confidence: 0, technicalSource: null,
      faultTitle: null, basePartPrice: 0, diagnosticEvidence: state!.answers,
      stopReason: finished ? resultState : null, options: [],
    };
  };
  const ask = (text: string, options: Parameters<typeof result>[2] = {}) => {
    if (!canAskBoilerQuestion(state!.totalAskedQuestions, text))
      return result('Toplam 12 soru sınırına ulaşıldı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
        'uncertain_price', options);
    state!.totalAskedQuestions += countBoilerQuestionRequests(text);
    return result(text, 'diagnosing', options);
  };
  if (state.finished) return result('Bu teşhis oturumu tamamlandı. Usta yönlendirmesi isteyebilirsiniz.', state.resultState);
  if (safety(message)) return result('Güvenliğiniz için teşhisi durduruyorum. Cihazı denemeyin, güvenli alana çıkın ve dışarıdan acil destek alın.', 'safety_stop');
  if (state.pendingIdentity && unknown(message)) {
    if (state.pendingIdentity !== 'code') return result('Marka veya model bilinmediği için fiyat belirsiz. Yerinde kontrol için usta yönlendirmesi isteyebilirsiniz.', 'uncertain_price');
    state.codeAsked = true;
  }
  state.pendingIdentity = null;
  const normalizedMessage = normalizePartText(message);
  if ((!brand && /(?:marka\w* bilmiyorum|marka\w* belli degil|marka\w* hatirlamiyorum|^bilmiyorum[.!? ]*$)/.test(normalizedMessage)) ||
      (!model && /(?:model\w* bilmiyorum|model\w* belli degil|model\w* hatirlamiyorum)/.test(normalizedMessage)))
    return result('Marka veya model bilinmediği için fiyat belirsiz. Yerinde kontrol için usta yönlendirmesi isteyebilirsiniz.', 'uncertain_price');
  if (!brand) { state.pendingIdentity = 'brand'; return ask('Cihazınızın markası nedir?'); }
  if (!model) { state.pendingIdentity = 'model'; return ask('Cihazınızın etikette yazan modeli nedir?'); }
  if (!errorCode && !state.codeAsked && !/(?:hata kodu yok|kod yok|hata gostermiyor)/.test(normalizePartText(customerText))) {
    state.pendingIdentity = 'code'; state.codeAsked = true;
    return ask('Ekranda hata kodu görünüyor mu? Yoksa “yok” yazabilirsiniz.');
  }

  const device = await repository.resolveDevice(brand, model);
  if (device === 'ambiguous') return ask('Cihaz etiketindeki tam model adını paylaşır mısınız?');
  if (!device) return result('Bu model için doğrulanmış teknik aday bulunamadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.', 'uncertain_price');
  state.familyId = device.familyId; state.officialModelId = device.officialModelId;
  const allCandidates = await repository.getCandidates(device.familyId);
  const selected = selectCandidatePool(allCandidates, device.familyId, device.officialModelId, errorCode);
  const candidates = selected.candidates;
  if (!candidates.length) return result('Bu cihaz için doğrulanmış kök neden havuzu bulunamadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    'uncertain_price', { familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const [questions, effects] = await Promise.all([repository.getQuestions(), repository.getEffects(candidates.map(item => item.id))]);
  const saveAnswer = async (question: BoilerQuestion, rawAnswer: string, answerKey: string,
    askedAt: string | null, source: 'customer' | 'ai_extracted') => {
    const group = question.evidence_group || question.question_key;
    const previous = state!.answers.find(item => item.evidenceGroup === group);
    if (previous?.questionId !== question.id && previous)
      await repository.deleteAnswer(state!.sessionId, previous.questionId);
    state!.answers = state!.answers.filter(item => item.evidenceGroup !== group);
    const effectiveAskedAt = askedAt ?? (previous?.questionId === question.id ? previous.askedAt ?? null : null);
    state!.answers.push({ questionId: question.id, answerKey, evidenceGroup: group, askedAt: effectiveAskedAt });
    const numericAnswer = Number(rawAnswer.replace(',', '.'));
    await repository.recordAnswer({ sessionId: state!.sessionId, questionId: question.id, rawAnswer,
      answerKey, numericAnswer: Number.isFinite(numericAnswer) && /^\s*\d+(?:[,.]\d+)?\s*$/.test(rawAnswer) ? numericAnswer : null,
      askedAt: effectiveAskedAt, source });
  };

  if (options.rebuildFromHistory) {
    for (let index = 0; index < history.length; index++) {
      const entry = history[index];
      if (entry.role !== 'assistant') continue;
      const question = questions.find(item => item.question_text === entry.content);
      if (!question || state.askedQuestionIds.includes(question.id)) continue;
      const askedAt = new Date().toISOString();
      await repository.recordQuestionAsked(state.sessionId, question.id, askedAt);
      state.askedQuestionIds.push(question.id);
      const response = conversation.slice(index + 1).find(item => item.role === 'user')?.content;
      if (!response) continue;
      const keys = supportedKey(question, effects);
      const answerKey = unknown(response) || ambiguousAnswer(response) || correction(response) ? 'unknown' :
        await ai.classifyAnswer(question, response, keys);
      if (keys.includes(answerKey)) await saveAnswer(question, response, answerKey, askedAt, 'customer');
    }
  }

  if (state.pendingQuestionId) {
    const question = questions.find(item => item.id === state!.pendingQuestionId);
    if (!question) throw Error('Previously asked boiler question is no longer available');
    const keys = supportedKey(question, effects);
    const answerKey = unknown(message) || ambiguousAnswer(message) || correction(message) ? 'unknown' :
      await ai.classifyAnswer(question, message, keys);
    if (!keys.includes(answerKey)) throw Error('AI supplied an unsupported boiler answer');
    await saveAnswer(question, message, answerKey, state.pendingAskedAt ?? new Date().toISOString(), 'customer');
    state.pendingQuestionId = null; state.pendingAskedAt = null;
  }
  if (ai.extractObservedAnswers) {
    const extractable = questions.filter(question => question.is_active && question.customer_observable &&
      safeQuestion(question.question_text) &&
      effects.some(effect => effect.question_id === question.id && effect.answer_key !== 'unknown'))
      .slice(0, 50).map(question => ({ id: question.id, text: question.question_text,
        allowedKeys: supportedKey(question, effects) }));
    for (const sourceMessage of options.rebuildFromHistory && !changedIdentity ? customerMessages : [message]) {
      const extractedAnswers = extractable.length ? await ai.extractObservedAnswers(sourceMessage, extractable) : [];
      if (!Array.isArray(extractedAnswers) || extractedAnswers.length > extractable.length) continue;
      for (const observed of extractedAnswers) {
        const allowed = extractable.find(item => item.id === observed.questionId);
        const question = questions.find(item => item.id === observed.questionId);
        if (!allowed || !question || !allowed.allowedKeys.includes(observed.answerKey) ||
            observed.answerKey === 'unknown' || typeof observed.quote !== 'string' ||
            observed.quote.trim().length < 3 || !sourceMessage.includes(observed.quote) ||
            /^(?:evet|hayır|hayir|bilmiyorum|emin değilim)$/i.test(observed.quote.trim())) continue;
        const group = question.evidence_group || question.question_key;
        if (state.answers.some(item => item.evidenceGroup === group && item.answerKey === observed.answerKey)) continue;
        await saveAnswer(question, observed.quote, observed.answerKey, null, 'ai_extracted');
      }
    }
  }
  const assessments = calculateBoilerWeights(candidates, state.answers, effects);
  await repository.recordCandidates(state.sessionId, assessments);
  if (!assessments.length) return result('Doğrulanmış adayların tamamı verilen yanıtlarla dışlandı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    'uncertain_price', { familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const top = [...assessments].sort((a, b) => b.probability - a.probability)[0];
  if (top.probability >= PRICE_CANDIDATE_THRESHOLD && state.firstThresholdAt === null)
    state.firstThresholdAt = state.totalAskedQuestions;
  const usedGroups = state.answers.map(item => item.evidenceGroup);
  const observedTopics = new Set<string>(customerMessages.flatMap(inferObservedTopics));
  const available = (safetyOnly: boolean) => eligibleQuestions(questions, effects,candidates.map(item => item.id),
    state!.askedQuestionIds, usedGroups, safetyOnly).filter(question => safeQuestion(question.question_text) &&
      !observedTopics.has(question.question_key) && canAskBoilerQuestion(state!.totalAskedQuestions, question.question_text));
  const safetyQuestions = available(true);
  const diagnosticQuestions = available(false);
  const canAsk = state.totalAskedQuestions < MAX_BOILER_QUESTIONS;
  const nextOptions = canAsk ? (safetyQuestions.length ? safetyQuestions : diagnosticQuestions) : [];
  const price = top.probability >= PRICE_CANDIDATE_THRESHOLD ? await repository.getPricing(top.candidateId) : null;
  const resultState = determineBoilerResult(assessments, state.totalAskedQuestions,
    state.firstThresholdAt, nextOptions.length > 0, price !== null);
  if (resultState === 'priced_candidate') return result(`En güçlü doğrulanmış aday ${top.candidateName}. Fiyat bilgisi hazır; usta yönlendirmesi isteyebilirsiniz.`,
    resultState,{ assessments, price, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  if (resultState === 'pricing_missing') return result(`En güçlü doğrulanmış aday ${top.candidateName}; ancak güncel fiyat kaydı yok. Fiyat belirsiz, usta yönlendirmesi isteyebilirsiniz.`,
    resultState,{ assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  if (resultState === 'uncertain_price') return result('Olası arızalar güvenilir biçimde yeterince ayrılamadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    resultState,{ assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  if (!nextOptions.length) return result('Müşterinin güvenle yanıtlayabileceği ayırt edici soru kalmadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    'uncertain_price',{ assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const selectedQuestionId = await ai.chooseQuestion({ brand, model, errorCode, candidates: assessments.map(item => ({
    id: item.candidateId, name: item.candidateName, probability: item.probability })),
    questions: nextOptions, effects, customerMessages });
  const question = nextOptions.find(item => item.id === selectedQuestionId);
  if (!question) return result('Güvenli ve ayırt edici bir müşteri sorusu seçilemedi. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    'uncertain_price',{ assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  if (!canAskBoilerQuestion(state.totalAskedQuestions, question.question_text))
    return result('Toplam 12 soru sınırına ulaşıldı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
      'uncertain_price', { assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const askedAt = new Date().toISOString();
  await repository.recordQuestionAsked(state.sessionId, question.id, askedAt);
  state.totalAskedQuestions += countBoilerQuestionRequests(question.question_text);
  state.askedQuestionIds.push(question.id); state.pendingQuestionId = question.id;
  state.pendingAskedAt = askedAt;
  return result(question.question_text, resultState, { assessments, familyId: device.familyId,
    officialModelId: device.officialModelId, mode: selected.mode });
}
