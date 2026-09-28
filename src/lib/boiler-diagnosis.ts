import { createHmac, timingSafeEqual } from 'node:crypto';
import { canAskBoilerQuestion, countAskedQuestions, countBoilerQuestionRequests } from './boiler-question-budget';
import { containsErrorCode } from './manufacturer-document-text';
import { normalizePartText } from './parts-catalog';
import { canonicalManufacturer } from './verified-knowledge';
import { DOMAINS } from './manufacturer-registry';
import { inferObservedTopics } from './diagnostic-state';
import { calculateBoilerWeights, consensusQuestionEffects, determineBoilerResult, eligibleQuestions, hasPricingEvidence, MAX_BOILER_QUESTIONS,
  PRICE_CANDIDATE_THRESHOLD, selectCandidatePool, type BoilerAnswer, type BoilerQuestion,
  type BoilerCandidateMode, type BoilerQuestionEffect, type BoilerResultState } from './boiler-probability';
import type { BoilerRepository, BoilerPrice } from './boiler-supabase';
import { candidateAllowedForFuel, questionAllowedForFuel, type BoilerFuelType } from './boiler-fuel';
import {suggestBrands,suggestModels,type BoilerIdentityCatalog} from './boiler-identity-suggestions';
import {reviewedBoilerEffects} from './boiler-effects';
import {extractBoilerTimeline,type BoilerTimeline} from './boiler-timeline';
import {buildBoilerGroups,questionDiscrimination,type BoilerGroupAssessment} from './boiler-groups';

export interface BoilerMessage { role: 'user' | 'assistant'; content: string }
export interface BoilerAI {
  extractIdentity(conversation: BoilerMessage[], pendingIdentity?: 'brand' | 'model' | 'code' | null): Promise<{ brand: string; model: string; errorCode: string }>;
  classifyAnswer(question: BoilerQuestion, message: string, allowedKeys: string[]): Promise<string>;
  extractObservedAnswers?(message: string, questions: { id: string; text: string; allowedKeys: string[] }[]):
    Promise<{ questionId: string; answerKey: string; quote: string }[]>;
  chooseQuestion(input: { brand: string; model: string; errorCode: string | null;
    candidates: { id: string; name: string; probability: number }[];
    questions: BoilerQuestion[]; effects: BoilerQuestionEffect[]; customerMessages: string[];
    groups?:BoilerGroupAssessment[];questionValue?:ReturnType<typeof questionDiscrimination> }): Promise<string | null>;
}
interface BoilerState {
  version: 1; sessionId: string; brand: string; model: string; errorCode: string | null;
  familyId: string | null; officialModelId: string | null;
  fuelType?: BoilerFuelType;
  codeAsked: boolean; pendingIdentity: 'brand' | 'model' | 'code' | null;
  answers: BoilerAnswer[]; askedQuestionIds: string[]; totalAskedQuestions: number;
  pendingQuestionId: string | null; pendingAskedAt: string | null;
  firstThresholdAt: number | null; finished: boolean; resultState: BoilerResultState;
  identityConfirmation?: {fields: ('brand'|'model')[]; text: string;
    choices: {brand: string; model: string}[]};
  timeline?:BoilerTimeline;
  timelineClarificationAsked?:boolean;
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
const mentionedManufacturer = (message: string) => {
  const words = [...message.matchAll(/[\p{L}\p{N}]+/gu)];
  const matches: { name: string; canonical: string }[] = [];
  for (let index = 0; index < words.length; index++) {
    for (const count of [1, 2]) {
      if (index + count > words.length) continue;
      const first = words[index], last = words[index + count - 1];
      const name = message.slice(first.index, last.index! + last[0].length);
      const canonical = canonicalManufacturer(name);
      if (Object.hasOwn(DOMAINS, canonical)) matches.push({ name, canonical });
    }
  }
  return new Set(matches.map(item => item.canonical)).size === 1 ? matches[0]?.name ?? '' : '';
};
const withoutTrailingCode = (value: string, errorCode: string | null) => {
  if (errorCode) {
    const chars = errorCode.toUpperCase().replace(/[.\s-]/g, '').split('');
    if (chars.length && chars.every(char => /[A-Z0-9]/.test(char)))
      value = value.replace(new RegExp(`\\s+${chars.join('[.\\s-]*')}\\s*$`, 'i'), '').trim();
  }
  return value;
};
const pendingModelAnswer = (message: string, errorCode: string | null) => {
  const value = withoutTrailingCode(message.trim().replace(/^(?:model(?:im|i|iniz)?\s*[:\-]?\s*)/iu, ''), errorCode);
  const normalized = normalizePartText(value);
  return value.length <= 80 && normalized && normalized.split(' ').length <= 5 &&
    !/\b(?:bilmiyorum|emin degilim|yok|kombim|bozuldu|ariza|hata)\b/.test(normalized) ? value : '';
};
const pendingCodeAnswer = (message: string) => {
  const value = message.trim();
  return /^(?:[A-Za-z]{1,3}[.\s-]?\d{1,3}|\d{1,3}[A-Za-z]{1,2}|\d(?:[. -]?\d){0,3}|[A-Za-z]{2})$/.test(value) &&
    !/^(?:su|ve|bu|da|de|mi|mu|ya|yok)$/.test(normalizePartText(value)) ? value : '';
};
const codeTokens = (message: string) => [...message.matchAll(
  /(?<![\p{L}\p{N}])(?:[A-Za-z]{1,3}[.\s-]?\d{1,3}|\d{1,3}[A-Za-z]{1,2}|\d(?:[. -]?\d){0,3}|[A-Za-z]{2})(?![\p{L}\p{N}])/gu,
)];
const outsideModel = (message: string, catalogModel: string) => {
  const text = ` ${normalizePartText(message)} `;
  const model = normalizePartText(catalogModel);
  return model ? text.split(` ${model} `).join(' ') : text;
};
const explicitCodeInMessage = (message: string, catalogModel = '') => {
  const outside = outsideModel(message, catalogModel);
  const candidates = codeTokens(message).flatMap(match => {
    const code = pendingCodeAnswer(match[0]);
    if (!code || !containsErrorCode(outside, code)) return [];
    const before = normalizePartText(message.slice(0, match.index));
    const after = normalizePartText(message.slice(match.index! + match[0].length));
    const rank = /(?:^| )(?:hata kodu|ariza kodu|kod|kodu)$/.test(before) ? 3 :
      /^(?:hata|hatasi|ariza|arizasi|kod|kodu)\b/.test(after) ? 2 :
      (/[A-Za-z]/.test(code) && /\d/.test(code)) ||
        (/^[A-Z]{2}$/.test(code) && !after) ? 1 : 0;
    return rank ? [{code, rank}] : [];
  });
  // Fault wording outranks unlabelled model tokens such as P24. In an
  // unlabelled identity, the fault code normally follows the model variant.
  return candidates.reduce((best, candidate) => !best || candidate.rank >= best.rank ? candidate : best,
      null as {code: string; rank: number} | null)?.code ?? '';
};
const safety = (message: string) => {
  const text = normalizePartText(message);
  const gasConcern = [...text.matchAll(/gaz kokusu|gaz kacagi/g)].some(match =>
    !/^\s*(?:yok|almiyorum|gelmiyor|hissetmiyorum)\b/.test(text.slice(match.index! + match[0].length)));
  return gasConcern ||
    /(?:yanik kokusu|duman cikiyor|ciddi su kacagi|elektrik carp|asiri isinma)/.test(text);
};
const safeQuestion = (value: string) => !/(?:multimetre|voltaj|direnc|ohm|gaz basinc|servis manometresi|baca gazi|yanma analizi|kart uzerinde|cihazi sok|kapagi ac|gaz valfi)/.test(normalizePartText(value));
const supportedKey = (question: BoilerQuestion, effects: BoilerQuestionEffect[]) => [...new Set([
  ...(Array.isArray(question.answer_options) ? question.answer_options.filter((key): key is string => typeof key === 'string') : []),
  ...effects.filter(item => item.question_id === question.id).map(item => item.answer_key), 'unknown',
])];

export async function diagnoseBoiler(message: string, history: BoilerMessage[], token: unknown,
  repository: BoilerRepository, ai: BoilerAI, options: { budgetFloor?: number; rebuildFromHistory?: boolean;
    identityFallback?: { brand: string; model: string; errorCode: string | null; codeAsked: boolean } } = {}) {
  let state = decodeBoilerState(token);
  let assessmentGroups:BoilerGroupAssessment[]=[];
  const confirmation=state?.identityConfirmation;
  let confirmationRejected=false,confirmationUnanswered=false;
  if(state&&confirmation){
    const answer=normalizePartText(message);
    const numbered=/^[1-4]$/.test(answer)?confirmation.choices[Number(answer)-1]:undefined;
    const named=confirmation.choices.filter(choice=>normalizePartText(choice.model)===answer||
      (confirmation.fields.length===1&&confirmation.fields[0]==='brand'&&canonicalManufacturer(choice.brand)===canonicalManufacturer(message)));
    const accepted=numbered??(named.length===1?named[0]:undefined)??
      (/^(?:evet|dogru|evet dogru|aynen)$/.test(answer)&&confirmation.choices.length===1?confirmation.choices[0]:undefined);
    if(accepted){
      state.brand=accepted.brand;state.model=accepted.model;state.pendingIdentity=null;delete state.identityConfirmation;
    }else if(/^(?:hayir|degil|bilmiyorum|emin degilim)$/.test(answer)){
      confirmationRejected=true;
      if(confirmation.fields.includes('brand'))state.brand='';
      if(confirmation.fields.includes('model'))state.model='';
      delete state.identityConfirmation;
    }else confirmationUnanswered=true;
  }
  const conversation = [...history, { role: 'user' as const, content: message }];
  const customerMessages = conversation.filter(item => item.role === 'user').map(item => item.content);
  const customerText = customerMessages.join(' ');
  const pendingIdentity = state?.pendingIdentity ?? null;
  const extracted = await ai.extractIdentity(conversation, pendingIdentity);
  const inText = (value: string) => value && ` ${normalizePartText(customerText)} `.includes(` ${normalizePartText(value)} `);
  const brandInText = (value: string) => {
    const canonical = canonicalManufacturer(value);
    if (!canonical) return false;
    return customerMessages.some(customerMessage => {
      const words = normalizePartText(customerMessage).split(' ');
      return words.some((word, index) => word === canonical ||
        (index + 1 < words.length && word + words[index + 1] === canonical));
    });
  };
  const mentionedBrand = pendingIdentity === 'brand' ? mentionedManufacturer(message) : '';
  const extractedBrand = brandInText(extracted.brand) ? extracted.brand.trim() : '';
  let brand = confirmationRejected&&confirmation?.fields.includes('brand')?'':state?.brand && !correction(message) ? state.brand :
    mentionedBrand || extractedBrand || state?.brand || options.identityFallback?.brand || '';
  const rawModel = extracted.model.trim();
  // A code-shaped suffix can be a real catalog model identifier. Confirm the
  // complete model without the message fallback before treating it as a code.
  const catalogDevice = brand && inText(rawModel) && codeTokens(rawModel).length
    ? await repository.resolveDevice(brand, rawModel) : null;
  const catalogModel = catalogDevice && catalogDevice !== 'ambiguous' &&
    (catalogDevice.officialModelId || normalizePartText(catalogDevice.familyName) === normalizePartText(rawModel))
    ? rawModel : '';
  const extractedCode = pendingCodeAnswer(extracted.errorCode) &&
    customerMessages.some(text => containsErrorCode(outsideModel(text, catalogModel), extracted.errorCode))
    ? extracted.errorCode.trim() : '';
  const explicitCode = explicitCodeInMessage(message, catalogModel) ||
    (pendingIdentity === 'code' ? pendingCodeAnswer(outsideModel(message, catalogModel)) : '');
  // Preserve equivalent AI formatting, but never let an invalid/different AI
  // value replace a code explicitly supplied by the customer.
  const sameCode = explicitCode && extractedCode &&
    explicitCode.toUpperCase().replace(/[.\s-]/g, '') === extractedCode.toUpperCase().replace(/[.\s-]/g, '');
  const errorCode = (sameCode ? extractedCode : explicitCode) || extractedCode ||
    pendingCodeAnswer(state?.errorCode ?? '') || pendingCodeAnswer(options.identityFallback?.errorCode ?? '') || null;
  const modelWithoutCode = catalogModel || withoutTrailingCode(rawModel, errorCode);
  const extractedModel = inText(modelWithoutCode) && canonicalManufacturer(modelWithoutCode) !== canonicalManufacturer(brand) &&
    normalizePartText(modelWithoutCode) !== normalizePartText(errorCode ?? '') ? modelWithoutCode : '';
  // A customer may answer a proposal with the actual label instead of yes/no.
  // Only a catalog-exact label in this message can replace the proposal.
  if (state && confirmationUnanswered && extractedModel &&
      ` ${normalizePartText(message)} `.includes(` ${normalizePartText(extractedModel)} `)) {
    const label = await repository.resolveDevice(brand, extractedModel);
    if (label && label !== 'ambiguous' &&
        normalizePartText(label.officialModelName || label.familyName) === normalizePartText(extractedModel)) {
      state.brand = label.brand || brand; state.model = extractedModel;
      state.pendingIdentity = null; delete state.identityConfirmation;
      confirmationUnanswered = false;
    }
  }
  const model = confirmationRejected&&confirmation?.fields.includes('model')?'':state?.model && !correction(message) && pendingIdentity !== 'model' ? state.model : extractedModel ||
    (pendingIdentity === 'model' ? pendingModelAnswer(message, errorCode) : '') || state?.model || options.identityFallback?.model || '';
  let budgetFloor = Math.max(0, Math.min(MAX_BOILER_QUESTIONS, options.budgetFloor ?? 0));
  const changedIdentity = state && ((state.brand && brand && canonicalManufacturer(state.brand) !== canonicalManufacturer(brand)) ||
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
  const newTimeline=extractBoilerTimeline(message);
  const oldTimeline=state.timeline;
  if(newTimeline.historical.length||newTimeline.current.quote){
    const formerCurrent=oldTimeline?.current;
    const previousTiming=formerCurrent?.timing&&formerCurrent.quote&&newTimeline.current.persistent&&!newTimeline.current.timing
      ? [{kind:formerCurrent.timing,quote:formerCurrent.quote}]:[];
    const historical=[...new Map([...(oldTimeline?.historical??[]),...previousTiming,...newTimeline.historical]
      .map(e=>[e.kind+'|'+e.quote,e])).values()];
    state.timeline={...newTimeline,historical,current:{...newTimeline.current,
      persistent:newTimeline.current.persistent||!!(oldTimeline?.needsClarification&&state.timelineClarificationAsked&&formerCurrent?.persistent&&newTimeline.current.timing)},
      needsClarification:newTimeline.needsClarification||
      historical.length>0&&newTimeline.current.persistent&&!newTimeline.current.timing&&!unknown(message)&&!ambiguousAnswer(message)};
  }
  const result = async (reply: string, resultState: BoilerResultState, options: {
    assessments?: ReturnType<typeof calculateBoilerWeights>; price?: BoilerPrice | null;
    familyId?: string | null; officialModelId?: string | null; mode?: BoilerCandidateMode | 'none';
  } = {}) => {
    const finished = ['priced_candidate','pricing_missing','uncertain_price','safety_stop'].includes(resultState);
    state!.finished = finished;
    state!.resultState = resultState;
    await repository.updateSession(state!.sessionId, {
      status: resultState === 'safety_stop' || resultState === 'uncertain_price' ? 'escalated' : finished ? 'completed' : 'diagnosing',
      questionCompletionPercent: Math.round(state!.totalAskedQuestions / MAX_BOILER_QUESTIONS * 10000) / 100,
      confidenceBasis: { method: 'v1_relative_effect_factors', calibrated: false,
        topRelativeWeight: options.assessments?.length ? Math.max(...options.assessments.map(item => item.probability)) : null,
        candidateMode: options.mode ?? 'none', resultState,technicalGroups:assessmentGroups },
      completedAt: finished ? new Date().toISOString() : null,
      brand: state!.brand, familyId: options.familyId ?? state!.familyId,
      officialModelId: options.officialModelId ?? state!.officialModelId, errorCode: state!.errorCode,
    });
    return {
      aiText: reply, stateToken: encodeBoilerState(state!), resultState,
      canRouteTechnician: finished, assessmentComplete: finished,
      candidateProbabilities: (options.assessments ?? []).map(item => ({ name: item.candidateName, probability: item.probability })),
      groupProbabilities:assessmentGroups,
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
  const ask = (text: string, options: Parameters<typeof result>[2] = {}, repeatedIdentity = false, requests?:number) => {
    if (repeatedIdentity) return result(text, 'diagnosing', options);
    const count=requests??countBoilerQuestionRequests(text);
    if (!canAskBoilerQuestion(state!.totalAskedQuestions, text)||state!.totalAskedQuestions+count>MAX_BOILER_QUESTIONS)
      return result('Toplam 12 soru sınırına ulaşıldı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
        'uncertain_price', options);
    state!.totalAskedQuestions += count;
    return result(text, 'diagnosing', options);
  };
  if (state.finished) return result('Bu teşhis oturumu tamamlandı. Usta yönlendirmesi isteyebilirsiniz.', state.resultState);
  if (safety(message)) return result('Güvenliğiniz için teşhisi durduruyorum. Cihazı denemeyin, güvenli alana çıkın ve dışarıdan acil destek alın.', 'safety_stop');
  if(confirmationUnanswered&&confirmation)return result(confirmation.text,'diagnosing');
  if(confirmationRejected){
    state.pendingIdentity=confirmation?.fields.includes('brand')?'brand':'model';
    return ask(state.pendingIdentity==='brand'?'Cihaz etiketindeki marka adını paylaşır mısınız?':'Cihaz etiketindeki tam model adını paylaşır mısınız?');
  }
  let catalog:BoilerIdentityCatalog|undefined;
  const identityCatalog=async()=>catalog??(catalog=await repository.getIdentityCatalog!());
  const confirmIdentity=(choices:{brand:string;model:string}[],fields:('brand'|'model')[])=>{
    // A family and its same-named official model are one label to confirm;
    // resolveDevice still decides the exact/family scope afterwards.
    choices=[...new Map(choices.map(choice=>[
      canonicalManufacturer(choice.brand)+'|'+normalizePartText(choice.model),choice])).values()];
    const labels=choices.map(c=>fields.includes('brand')?`${c.brand}${c.model?' '+c.model:''}`:c.model);
    const text=choices.length===1?`${labels[0]} cihazını mı kastediyorsunuz?`:
      `Cihazınız hangisi: ${labels.map((label,index)=>`${index+1}) ${label}`).join('; ')}? Etiketteki adı da yazabilirsiniz.`;
    state!.identityConfirmation={choices,fields,text};
    return ask(text,{},false,fields.length);
  };
  if (state.pendingIdentity && unknown(message)) {
    if (state.pendingIdentity !== 'code') return result('Marka veya model bilinmediği için fiyat belirsiz. Yerinde kontrol için usta yönlendirmesi isteyebilirsiniz.', 'uncertain_price');
    state.codeAsked = true;
  }
  state.pendingIdentity = null;
  const normalizedMessage = normalizePartText(message);
  if ((!brand && /(?:marka\w* bilmiyorum|marka\w* belli degil|marka\w* hatirlamiyorum|^bilmiyorum[.!? ]*$)/.test(normalizedMessage)) ||
      (!model && /(?:model\w* bilmiyorum|model\w* belli degil|model\w* hatirlamiyorum)/.test(normalizedMessage)))
    return result('Marka veya model bilinmediği için fiyat belirsiz. Yerinde kontrol için usta yönlendirmesi isteyebilirsiniz.', 'uncertain_price');
  if (repository.getIdentityCatalog&&(!brand||!Object.hasOwn(DOMAINS,canonicalManufacturer(brand)))) {
    const cat=await identityCatalog();
    const spans=brand?[brand]:[...message.matchAll(/[\p{L}]+(?:[.-][\p{L}]+)*/gu)].map(hit=>hit[0]);
    const proposals=spans.flatMap(span=>suggestBrands(cat,span));
    const closest=Math.min(...proposals.map(item=>item.distance));
    const brands=[...new Map(proposals.filter(item=>item.distance===closest).map(item=>[item.name,item])).values()].slice(0,4);
    if(brands.length===1&&brands[0].exact){brand=brands[0].name;state.brand=brand;}
    else if(brands.length){
      const models=brands.length===1&&model?suggestModels(cat,brands[0].name,model):[];
      const fields:('brand'|'model')[]=['brand'];
      if(models.length&&!models.every(m=>m.exact))fields.push('model');
      const choices=models.length?models.map(m=>({brand:brands[0].name,model:m.name})):
        brands.map(b=>({brand:b.name,model}));
      brand='';state.brand='';
      return confirmIdentity(choices,fields);
    }else {brand='';state.brand='';}
  }
  if (!brand) { state.pendingIdentity = 'brand'; return ask('Cihazınızın markası nedir?', {}, pendingIdentity === 'brand'); }
  if (!model) { state.pendingIdentity = 'model'; return ask('Cihazınızın etikette yazan modeli nedir?', {}, pendingIdentity === 'model'); }
  if (!errorCode && !state.codeAsked && !/(?:hata kodu yok|kod yok|hata gostermiyor)/.test(normalizePartText(customerText))) {
    state.pendingIdentity = 'code'; state.codeAsked = true;
    return ask('Ekranda hata kodu görünüyor mu? Yoksa “yok” yazabilirsiniz.', {}, pendingIdentity === 'code');
  }

  const device = await repository.resolveDevice(brand, model, message);
  if(!device&&repository.getIdentityCatalog){
    const suggestions=suggestModels(await identityCatalog(),brand,model);
    if(suggestions.length)return confirmIdentity(suggestions.map(m=>({brand:m.brand,model:m.name})),['model']);
    state.pendingIdentity='model';
    return ask('Cihaz etiketindeki tam model adını paylaşır mısınız?',{},pendingIdentity==='model');
  }
  if (device === 'ambiguous') {
    state.pendingIdentity = 'model';
    return ask('Cihaz etiketindeki tam model adını paylaşır mısınız?', {}, pendingIdentity === 'model');
  }
  if (!device) return result('Bu model için doğrulanmış teknik aday bulunamadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.', 'uncertain_price');
  if (device.brand && canonicalManufacturer(device.brand) === canonicalManufacturer(brand)) state.brand = device.brand;
  if (device.officialModelName) state.model = device.officialModelName;
  state.familyId = device.familyId; state.officialModelId = device.officialModelId;
  state.fuelType = device.fuelType ?? 'gas';
  const allCandidates = (await repository.getCandidates(device.familyId))
    .filter(candidate => candidateAllowedForFuel(candidate, state!.fuelType!));
  let selected = selectCandidatePool(allCandidates, device.familyId, device.officialModelId, errorCode);
  if (device.officialModelId === null && errorCode && selected.mode !== 'error_code' && repository.getErrorCodeModelIds) {
    const coveredModels = await repository.getErrorCodeModelIds(device.familyId, errorCode);
    selected = selectCandidatePool(allCandidates, device.familyId, null, errorCode, coveredModels);
  }
  if (selected.requiresExactModel) {
    state.pendingIdentity = 'model';
    return ask('Cihaz etiketindeki tam model adını paylaşır mısınız?', {}, pendingIdentity === 'model');
  }
  const candidates = selected.candidates;
  if (!candidates.length) return result('Bu cihaz için doğrulanmış kök neden havuzu bulunamadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    'uncertain_price', { familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const familyConsensus = selected.mode === 'family_code_consensus';
  const effectCandidateIds = [...new Set(candidates.flatMap(item => item.sourceCandidateIds ?? [item.id]))];
  const [catalogQuestions, storedEffects] = await Promise.all([repository.getQuestions(), repository.getEffects(effectCandidateIds)]);
  const questions = catalogQuestions.filter(question => questionAllowedForFuel(question, state!.fuelType!));
  const allowedQuestionIds = new Set(questions.map(question => question.id));
  // Retain historical answers/budget, but never process a combustion question
  // or its effects after the catalog identifies an electric device.
  if (catalogQuestions.some(question => question.id === state.pendingQuestionId &&
      !questionAllowedForFuel(question, state!.fuelType!))) {
    state.pendingQuestionId = null; state.pendingAskedAt = null;
  }
  const reviewedEffects=reviewedBoilerEffects(allCandidates,catalogQuestions,storedEffects);
  const fuelEffects = state.fuelType === 'gas' ? reviewedEffects :
    reviewedEffects.filter(effect => allowedQuestionIds.has(effect.question_id));
  const effects = familyConsensus ? consensusQuestionEffects(candidates, fuelEffects) : fuelEffects;
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
      if (keys.includes(answerKey)) {
        await saveAnswer(question, response, answerKey, askedAt, 'customer');
        if (question.is_safety_question && answerKey === 'yes')
          return result('Güvenliğiniz için teşhisi durduruyorum. Cihazı denemeyin, güvenli alana çıkın ve dışarıdan acil destek alın.', 'safety_stop');
      }
    }
  }

  if (state.pendingQuestionId) {
    const question = questions.find(item => item.id === state!.pendingQuestionId);
    if (!question) throw Error('Previously asked boiler question is no longer available');
    const keys = supportedKey(question, effects);
    const isTiming=question.question_key==='fault_timing_after_start';
    const answerKey = isTiming&&(newTimeline.needsClarification||newTimeline.current.persistent&&!newTimeline.current.timing)?'unknown':
      isTiming&&newTimeline.current.timing?newTimeline.current.timing:
      isTiming&&state.timelineClarificationAsked?'unknown':
      unknown(message) || ambiguousAnswer(message) || correction(message) ? 'unknown' :
      await ai.classifyAnswer(question, message, keys);
    if (!keys.includes(answerKey)) throw Error('AI supplied an unsupported boiler answer');
    await saveAnswer(question, message, answerKey, state.pendingAskedAt ?? new Date().toISOString(), 'customer');
    state.pendingQuestionId = null; state.pendingAskedAt = null;
    if (question.is_safety_question && answerKey === 'yes')
      return result('Güvenliğiniz için teşhisi durduruyorum. Cihazı denemeyin, güvenli alana çıkın ve dışarıdan acil destek alın.', 'safety_stop');
  }
  if (ai.extractObservedAnswers) {
    const extractable = questions.filter(question => question.is_active && question.customer_observable &&
      safeQuestion(question.question_text) &&
      effects.some(effect => effect.question_id === question.id && effect.answer_key !== 'unknown'))
      .slice(0, 50).map(question => ({ id: question.id, text: question.question_text,
        allowedKeys: supportedKey(question, effects) }));
    for (const sourceMessage of options.rebuildFromHistory && !changedIdentity ? customerMessages : [message]) {
      const sourceTimeline=extractBoilerTimeline(sourceMessage);
      const extractedAnswers = extractable.length ? await ai.extractObservedAnswers(sourceMessage, extractable) : [];
      if (!Array.isArray(extractedAnswers) || extractedAnswers.length > extractable.length) continue;
      for (const observed of extractedAnswers) {
        const allowed = extractable.find(item => item.id === observed.questionId);
        const question = questions.find(item => item.id === observed.questionId);
        if(question?.question_key==='fault_timing_after_start'&&
          (state.timelineClarificationAsked||sourceTimeline.historical.length||sourceTimeline.needsClarification||sourceTimeline.current.persistent&&!sourceTimeline.current.timing)&&
          (!sourceTimeline.current.timing||observed.answerKey!==sourceTimeline.current.timing))continue;
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
  const timingQuestion=questions.find(q=>q.question_key==='fault_timing_after_start');
  if(timingQuestion&&newTimeline.current.persistent&&!newTimeline.current.timing){
    const previous=state.answers.find(a=>a.evidenceGroup===(timingQuestion.evidence_group||timingQuestion.question_key));
    if(previous&&previous.answerKey!=='unknown')
      await saveAnswer(timingQuestion,newTimeline.current.quote||message,'unknown',previous.askedAt??null,'ai_extracted');
  }
  if(timingQuestion&&newTimeline.current.timing&&newTimeline.current.quote&&!unknown(message)&&!ambiguousAnswer(message)&&
      effects.some(e=>e.question_id===timingQuestion.id&&e.answer_key===newTimeline.current.timing)){
    const previous=state.answers.find(a=>a.evidenceGroup===(timingQuestion.evidence_group||timingQuestion.question_key));
    if(previous?.answerKey!==newTimeline.current.timing)
      await saveAnswer(timingQuestion,newTimeline.current.quote,newTimeline.current.timing,previous?.askedAt??null,'ai_extracted');
  }
  const assessments = calculateBoilerWeights(candidates, state.answers, effects);
  assessmentGroups=buildBoilerGroups(candidates,assessments,state.fuelType);
  await repository.recordCandidates(state.sessionId, assessments);
  if (!assessments.length) return result('Doğrulanmış adayların tamamı verilen yanıtlarla dışlandı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    'uncertain_price', { familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const top = [...assessments].sort((a, b) => b.probability - a.probability)[0];
  const pricingEvidenceReady = hasPricingEvidence(candidates, state.answers, questions, effects);
  if (!pricingEvidenceReady) state.firstThresholdAt = null;
  if (pricingEvidenceReady && top.probability >= PRICE_CANDIDATE_THRESHOLD && state.firstThresholdAt === null)
    state.firstThresholdAt = state.totalAskedQuestions;
  const usedGroups = state.answers.map(item => item.evidenceGroup);
  const observedTopics = new Set<string>(customerMessages.flatMap(inferObservedTopics));
  const available = (safetyOnly: boolean) => eligibleQuestions(questions, effects,candidates.map(item => item.id),
    state!.askedQuestionIds, usedGroups, safetyOnly).filter(question => safeQuestion(question.question_text) &&
      !observedTopics.has(question.question_key) && canAskBoilerQuestion(state!.totalAskedQuestions, question.question_text));
  const safetyQuestions = available(true);
  const diagnosticOptions=available(false);
  const questionValue=questionDiscrimination(candidates,assessments,diagnosticOptions,effects,state.fuelType);
  const diagnosticQuestions=diagnosticOptions.filter(q=>{
    const value=questionValue[q.id];
    return value.candidateDiscriminative||value.groupDiscriminative||value.supportsSingleton;
  });
  const canAsk = state.totalAskedQuestions < MAX_BOILER_QUESTIONS;
  const clarifyTiming=canAsk&&!safetyQuestions.length&&!!state.timeline?.needsClarification&&!state.timelineClarificationAsked&&
    !!timingQuestion&&effects.some(e=>e.question_id===timingQuestion.id&&e.effect!=='neutral')&&safeQuestion(timingQuestion.question_text);
  const nextOptions = canAsk ? (safetyQuestions.length ? safetyQuestions : clarifyTiming&&timingQuestion?[timingQuestion]:diagnosticQuestions) : [];
  const price = !familyConsensus && pricingEvidenceReady && top.probability >= PRICE_CANDIDATE_THRESHOLD ?
    await repository.getPricing(top.candidateId) : null;
  let resultState = determineBoilerResult(assessments, state.totalAskedQuestions,
    state.firstThresholdAt, nextOptions.length > 0, price !== null, pricingEvidenceReady);
  if (familyConsensus && (resultState === 'priced_candidate' || resultState === 'pricing_missing'))
    resultState = 'uncertain_price';
  if (resultState === 'priced_candidate') return result(`En güçlü doğrulanmış aday ${top.candidateName}. Fiyat bilgisi hazır; usta yönlendirmesi isteyebilirsiniz.`,
    resultState,{ assessments, price, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  if (resultState === 'pricing_missing') return result(`En güçlü doğrulanmış aday ${top.candidateName}; ancak güncel fiyat kaydı yok. Fiyat belirsiz, usta yönlendirmesi isteyebilirsiniz.`,
    resultState,{ assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  if (resultState === 'uncertain_price') return result(familyConsensus && pricingEvidenceReady && top.probability >= PRICE_CANDIDATE_THRESHOLD
    ? 'Ortak aile adayları değerlendirildi; tam model bilinmeden güvenli fiyat verilemiyor. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.'
    : 'Olası arızalar güvenilir biçimde yeterince ayrılamadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    resultState,{ assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  if (!nextOptions.length) return result('Müşterinin güvenle yanıtlayabileceği ayırt edici soru kalmadı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    'uncertain_price',{ assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const selectedQuestionId = clarifyTiming?timingQuestion!.id:await ai.chooseQuestion({ brand, model, errorCode, candidates: assessments.map(item => ({
    id: item.candidateId, name: item.candidateName, probability: item.probability })),
    questions: nextOptions, effects, customerMessages,groups:assessmentGroups,questionValue });
  const question = nextOptions.find(item => item.id === selectedQuestionId);
  if (!question) return result('Güvenli ve ayırt edici bir müşteri sorusu seçilemedi. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
    'uncertain_price',{ assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const questionText=clarifyTiming?'Şu anda resetten sonra bir süre çalışıyor mu, yoksa hata hemen tekrar mı geliyor?':question.question_text;
  const questionCost=clarifyTiming?1:countBoilerQuestionRequests(questionText);
  if (state.totalAskedQuestions+questionCost>MAX_BOILER_QUESTIONS)
    return result('Toplam 12 soru sınırına ulaşıldı. Fiyat belirsiz; usta yönlendirmesi isteyebilirsiniz.',
      'uncertain_price', { assessments, familyId: device.familyId, officialModelId: device.officialModelId, mode: selected.mode });
  const askedAt = new Date().toISOString();
  await repository.recordQuestionAsked(state.sessionId, question.id, askedAt);
  state.totalAskedQuestions += questionCost;
  if(clarifyTiming)state.timelineClarificationAsked=true;
  state.askedQuestionIds.push(question.id); state.pendingQuestionId = question.id;
  state.pendingAskedAt = askedAt;
  return result(questionText, resultState, { assessments, familyId: device.familyId,
    officialModelId: device.officialModelId, mode: selected.mode });
}
