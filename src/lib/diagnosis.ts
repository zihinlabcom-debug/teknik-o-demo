import { getResearchedKnowledge, verifiedKnowledgeRepository, researchKey, normalizeCode, type TechnicalKnowledge } from './technical-research';
import {toVerifiedKnowledge} from './verified-knowledge';
import {toResearchContext} from './research-context';
import { containsErrorCode } from './manufacturer-document';
import { QUESTIONS, MIN_CONFIDENT_INFORMATION, RejectedDiagnosticQuestion, canonicalTopic, extractCustomerObservations, inferObservedTopics, isUsableDiagnosticAnswer, advanceDiagnosis, decodeMemory, encodeMemory, type AIDiagnosticAssessment, type AIQuestion, type CustomerEvidence, type QuestionId } from './diagnostic-state';
import {matchVerifiedModel} from './model-name-match';
import OpenAI from 'openai';
import { getPartPrice } from './part-pricing';
import { normalizePartText } from './parts-catalog';
import { calculateOMF } from './omf-engine';
import { lookupDiagnosticKnowledge } from './diagnostic-knowledge';

export interface DiagnosisMessage { role: 'user' | 'assistant'; content: string }
export function normalizeHistory(value: unknown): DiagnosisMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-40).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const role = item.role ?? item.sender;
    if (!['user', 'assistant', 'ai', 'model'].includes(role)) return [];
    const content = item.content ?? item.text ?? (Array.isArray(item.parts)
      ? item.parts.map((part: { text?: unknown } | null) => typeof part?.text === 'string' ? part.text : '').join(' ') : '');
    if (typeof content !== 'string' || !content.trim()) return [];
    return [{ role: role === 'user' ? 'user' as const : 'assistant' as const, content: content.slice(0, 6000) }];
  });
}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
function hasEvidence(value: string, userText: string) {
  const normalized = normalizePartText(value);
  return normalized.length > 0 && ` ${normalizePartText(userText)} `.includes(` ${normalized} `);
}
export const DIAGNOSIS_PROMPT = `Sen Teknik-O teşhis motorusun. Üreticinin kapalı aday havuzunu ve müşterinin bütün kabul edilmiş gözlemlerini kullan.
Her aday için bütün müşteri geçmişini birlikte değerlendir: destek, çelişki veya nötr. Sonra göreli ağırlıkları baştan ver; önceki yüzdelere mekanik artış/azalış uygulama.
Üretici listesinde yer alıyor diye hiçbir adaya zorunlu asgari pay verme. Güçlü çelişki varsa ağırlık 0 olabilir. Yalnız sıralamak için 4/3/2/1 gibi kaba basamaklar kullanma; dağılımı yapay olarak eşitleme. Kanıt küçük bir aday grubunu belirgin biçimde destekliyorsa ağırlığı orada yoğunlaştır, fakat kanıtsız kesinlik uydurma.
candidateIndex alanını kullan, üretici adayının adını değiştirme veya yeni aday ekleme. Her aday için kanıta bağlı kısa gerekçe ver ve ağırlıkların toplamını 100 yap.
Yüzdeler kesin teşhis ya da ölçülmüş gerçek dünya olasılıkları değildir. Müşterinin söylemediği bir gözlemi kanıt sayma.
Yalnız müşterinin cevabı kalan makul adayların göreli dağılımını anlamlı biçimde değiştirebilecekse TEK soru sor. En yüksek bilgi kazancı sağlayan, araçsız gözlemlenebilir soruyu seç. Genel geçmiş sorusunu ancak adayları gerçekten ayırıyorsa sor. askedTopics veya müşteri kanıtında cevaplanmış konuyu başka sözlerle yeniden sorma; özellikle başlangıç zamanı, ateşleme sesi, alev, gaz erişimi, bakım, reset ve başka hata kodları konularını tekrar yoklama.
Gaz giriş basıncı/manometre, multimetre, süreklilik, voltaj/direnç, yanma analizi, cihaz sökme veya gaz/elektrik bağlantısına müdahale gibi teknisyen ölçümü ya da riskli işlem isteme.
Yeterli ayrım varsa canConclude=true de. Altı geçerli müşteri gözleminden önce normal sonuç verilemez; bu kural sırf soru sayısını doldurmak için zayıf soru sorman anlamına gelmez. Müşterinin cevaplayabileceği anlamlı ayırıcı soru kalmadıysa ve kalan ayrım teknisyen ölçümü gerektiriyorsa requiresTechnicianMeasurement=true, nextQuestion=null ve technicianBoundaryReason alanında bunu açıkça gerekçelendir. Yararlı soru varsa bu sınırı isteme; diğer durumlarda technicianBoundaryReason=null de.
Context içinde repair varsa önceki nextQuestion reddedilmiştir. rejectReason, askedTopics, customerEvidence ve üretici adaylarını dikkate al; aynı veya eşdeğer soruyu tekrarlama. Yalnız güvenli ve ayırıcı yeni bir müşteri sorusu üret veya gerekçeli teknisyen sınırı seç. İlk candidateAssessments dağılımını değiştirme.
Bilgi puanı tanısal ağırlık değildir; bitiş için sunucu tarafından ayrıca denetlenir.`;

export async function buildDiagnosisResult(parsed: Record<string, unknown>, history: DiagnosisMessage[], message: string, priceLookup = getPartPrice, researchedKnowledge?: TechnicalKnowledge | null) {
  const evidence = [...history.filter(item => item.role === 'user').map(item => item.content), message].join(' ');
  const brand = text(parsed.brand), model = text(parsed.model), part = text(parsed.catalogKey);
  const identityKnown = hasEvidence(brand, evidence) && hasEvidence(model, evidence);
  const code = text(parsed.errorCode);
  const knowledge = identityKnown ? researchedKnowledge ?? lookupDiagnosticKnowledge(brand, model, code) : null;
  const observations = Array.isArray(parsed.supportingEvidence) ? [...new Set(parsed.supportingEvidence.filter((v): v is string => typeof v === 'string' && v.length >= 5 && hasEvidence(v, evidence)))] : [];
  const observedSummary = observations.join('; ');
  const alternatives = Array.isArray(parsed.unresolvedAlternatives) ? parsed.unresolvedAlternatives.filter((v): v is string => typeof v === 'string') : [];
  const safetyStop = parsed.safetyStop === true;
  const confidence = typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(100, parsed.confidence)) : 0;
  const diagnosticInformationScore = typeof parsed.diagnosticInformationScore === 'number' ? parsed.diagnosticInformationScore : MIN_CONFIDENT_INFORMATION;
  const sufficientBasis = parsed.isReadyForPrice === true && confidence >= 75 && diagnosticInformationScore >= MIN_CONFIDENT_INFORMATION &&
    observations.length >= 2 && text(parsed.mostLikelyReason).length > 0 &&
    (!code || Boolean(knowledge)) && (!knowledge || knowledge.parts.includes(part));
  const needsOnsite = !safetyStop && !sufficientBasis &&
    (parsed.stopReason === 'technician_measurement_required' || parsed.stopReason === 'uncertain' ||
      (parsed.diagnosticInformationScore === undefined && (parsed.needsOnsite === true || history.filter(item => item.role === 'assistant').length >= 10)));
  const ready = !safetyStop && sufficientBasis;
  const priceResult = ready && identityKnown ? await priceLookup(brand, model, part) : null;
  const source = priceResult?.status === 'available' ? priceResult.source : null;
  const omf = source ? calculateOMF({ basePartPrice: source.price, fixedLabor: 2000 }) : null;
  const priceMessage = priceResult && priceResult.status !== 'available' ? priceResult.message : null;
  const rawText = text(parsed.aiText);
  // During questioning show only the question, never the preceding diagnosis explanation.
  const question = rawText.match(/[^.!?]+\?/g)?.at(-1)?.trim() ?? '';
  const safeText = /(?:\bTL\b|₺|\bTRY\b|lira|%\s*\d|termik|sensör|soket|eşanjör|F[.\s]?\d{2,3})/i.test(question) ? '' : question;
  let aiText = safeText || 'Ekranda bir hata kodu görünüyor mu?';
  if (needsOnsite) aiText = `${observedSummary ? `Aktardığınız gözlemler: ${observedSummary}. ` : ''}En olası arızaya dayalı teklif için henüz yeterli dayanak oluşmadı. Ek teknik denemeler yapmanıza gerek yok; yerinde kontrolle parça ve fiyatın netleştirilmesi gerekiyor.`;
  if (priceMessage) aiText = priceMessage;
  if (source) aiText = `Gözlemlerinize göre en olası arıza için ${source.title} esas alınarak teklifiniz hesaplandı. Teklife %20 risk payı ve hizmet bedeli dahildir; garanti 90 gündür.`;
  if (safetyStop) aiText = 'Güvenliğiniz için teşhisi durduruyorum. Cihazı denemeyin, elektrik düğmelerine ve fişlere dokunmayın. Güvenli alana çıkın ve dışarıdan acil destek alın.';
  return { aiText, confidence, identifiedPart: { brand, model, part }, isReadyForPrice: Boolean(source),
    basePartPrice: source?.price ?? 0, riskSum: omf?.breakdown.risk ?? 0,
    faultTitle: source?.title ?? 'Ön teşhis', estimatedPrice: omf ? `${omf.breakdown.total.toLocaleString('tr-TR')} ₺` : null,
    deterministicOMF: omf, priceSource: source,
    assessment: { sufficientBasis, mostLikelyReason: text(parsed.mostLikelyReason), supportingEvidence: observations, unresolvedAlternatives: alternatives },
    diagnosticStatus: safetyStop ? 'safety_stop' : needsOnsite ? 'needs_onsite' : source ? 'quoted' : 'diagnosing',
    technicalSource: knowledge ? { ...knowledge.source, page: knowledge.page } : null,
    pricingStatus: priceResult?.status ?? (identityKnown ? 'diagnosing' : 'missing_identity'),
    options: source || needsOnsite || safetyStop ? [] : priceMessage ? ['Fiyatı tekrar kontrol et'] : Array.isArray(parsed.options)
      ? parsed.options.filter((v): v is string => typeof v === 'string' && !/(?:\bTL\b|₺|\bTRY\b|lira|onay|randevu)/i.test(v)).slice(0, 3) : [],
  };
}

export interface DiagnosisContext {
  brand:string;model:string;errorCode:string;
  manufacturerCandidates:{candidateIndex:number;label:string}[];
  customerEvidence:CustomerEvidence[];
  askedTopics:string[];
  repair?:{rejectedQuestion:AIQuestion|null;rejectReason:string};
}
export interface DiagnosisAIProvider {
  extractIdentity(conversation:DiagnosisMessage[]):Promise<{brand:string;model:string;errorCode:string}>;
  assess(context:DiagnosisContext):Promise<AIDiagnosticAssessment>;
}
function openAIProvider(apiKey:string):DiagnosisAIProvider {
  const client=new OpenAI({apiKey,timeout:30000,maxRetries:1});
  return {
    async extractIdentity(conversation) {
      const response=await client.chat.completions.create({model:'gpt-4o-mini',temperature:0,response_format:{type:'json_object'},
        messages:[{role:'system',content:`Sohbetten yalnızca müşterinin söylediği marka, tam model ve hata kodunu çıkar. Modeli müşterinin yazdığı biçimde aynen kopyala; yazımı kendin düzeltme. Asistan örneklerini cihaz kimliği sayma. Son müşteri düzeltmesini izle. Hata kodu EA, 6A, F.28 veya 501 biçiminde olabilir. JSON: {"brand":"","model":"","errorCode":""}. Eksik alanı uydurma.`},...conversation]});
      return JSON.parse(response.choices[0]?.message?.content||'{}');
    },
    async assess(context) {
      const candidateIndexes=context.manufacturerCandidates.map(item=>item.candidateIndex);
      const topics=(Object.keys(QUESTIONS) as QuestionId[]).filter(topic=>!['brand','model','code'].includes(topic) &&
        !context.askedTopics.some(asked=>canonicalTopic(asked)===canonicalTopic(topic)));
      const response=await client.chat.completions.create({model:'gpt-4o',temperature:0,
        response_format:{type:'json_schema',json_schema:{name:'diagnostic_assessment',strict:true,
          schema:{type:'object',additionalProperties:false,properties:{
            candidateAssessments:{type:'array',items:{type:'object',additionalProperties:false,properties:{
              candidateIndex:{type:'integer',enum:candidateIndexes},weight:{type:'number'},reason:{type:'string'}
            },required:['candidateIndex','weight','reason']}},
            nextQuestion:topics.length?{anyOf:[{type:'object',additionalProperties:false,properties:{
              topic:{type:'string',enum:topics},text:{type:'string'},whyThisQuestion:{type:'string'}
            },required:['topic','text','whyThisQuestion']},{type:'null'}]}:{type:'null'},
            canConclude:{type:'boolean'},requiresTechnicianMeasurement:{type:'boolean'},
            technicianBoundaryReason:{anyOf:[{type:'string'},{type:'null'}]}
          },required:['candidateAssessments','nextQuestion','canConclude','requiresTechnicianMeasurement','technicianBoundaryReason']}}},
        messages:[{role:'system',content:DIAGNOSIS_PROMPT},{role:'user',content:JSON.stringify(context)}]});
      return JSON.parse(response.choices[0]?.message?.content||'{}');
    },
  };
}

export async function diagnose(message:string,history:DiagnosisMessage[],stateToken?:unknown,
  options:{provider?:DiagnosisAIProvider;knowledge?:{identity:{brand:string;model:string;code:string};value:TechnicalKnowledge}}={}) {
  let previous=decodeMemory(stateToken);
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)throw Error('OPENAI_API_KEY is missing');
  const provider=options.provider??openAIProvider(apiKey);
  const conversation=[...history,{role:'user' as const,content:message}];
  const state=await provider.extractIdentity(conversation);
  if(!state || typeof state!=='object' || Array.isArray(state))throw Error('Invalid identity');
  const customerText=conversation.filter(item=>item.role==='user').map(item=>item.content).join(' ');
  if(previous.evidence.some(item=>!customerText.includes(item.quote)))throw Error('Diagnostic state does not match conversation');
  const brand=hasEvidence(text(state.brand),customerText)?text(state.brand):'';
  const code=containsErrorCode(customerText,text(state.errorCode))?text(state.errorCode):'';
  const suffix=text(state.model).split(/\s+/).at(-1)??'';
  const rawModel=code && normalizeCode(suffix)===normalizeCode(code)?text(state.model).slice(0,-suffix.length).trim():text(state.model);
  let model=hasEvidence(rawModel,customerText)?rawModel:'';
  let ambiguousModel=false;
  if(brand&&model&&code){
    const matched=matchVerifiedModel(model,await verifiedKnowledgeRepository.listVerifiedModels(brand,code));
    if(matched.status==='ambiguous'){ambiguousModel=true;model='';}
    else if(matched.model)model=matched.model;
  }
  const identity={brand,model,code};
  const contextOnly=!previous.poolKey || ['brand','model','code'].includes(previous.asked.at(-1)??'');
  const key=researchKey(identity);
  if(previous.poolKey && previous.poolKey!==key)previous={...previous,candidates:[],information:0,asked:[],evidence:[],finished:false,stopReason:undefined,technicalKnowledge:undefined};
  if(brand && model && code)previous.poolKey=key;
  const spontaneous=extractCustomerObservations(message);
  if(contextOnly && spontaneous.length && !previous.evidence.some(item=>item.quote===message)){
    previous.evidence=[...previous.evidence,{quote:message,topic:'volunteered',observations:spontaneous}];
    previous.information=Math.min(100,previous.information+10);
  }

  const respond=async(reply:string,knowledge:TechnicalKnowledge|null,researchStatus:string,researchVerification?:import('./manufacturer-research-engine').ResearchVerification,
    researchContext?:ReturnType<typeof toResearchContext>|null,complete=false)=>{
    const result=await buildDiagnosisResult({brand,model,errorCode:code,aiText:reply,isReadyForPrice:false,confidence:0,
      supportingEvidence:previous.evidence.map(item=>item.quote),diagnosticInformationScore:previous.information},history,message,getPartPrice,knowledge);
    return {...result,aiText:reply,diagnosticStatus:previous.stopReason==='safety'?'safety_stop':result.diagnosticStatus,
      options:[],informationProgress:previous.information,assessmentComplete:complete,
      candidateProbabilities:complete?previous.candidates:[],stateToken:encodeMemory(previous),researchStatus,researchVerification,researchContext,
      diagnosticEvidence:previous.evidence,stopReason:previous.stopReason,questionRationale:previous.nextQuestionRationale};
  };
  if(/(?:gaz kokusu var|gaz kokuyor|gaz kacagi var|duman cikiyor)/.test(normalizePartText(message))){
    previous.finished=true;previous.stopReason='safety';
    return respond('Güvenliğiniz için teşhisi durduruyorum. Cihazı denemeyin, güvenli alana çıkın ve dışarıdan acil destek alın.',null,'not_needed',undefined,null,true);
  }
  if(ambiguousModel)return respond('Birden fazla doğrulanmış model adı benziyor. Cihaz etiketindeki tam model adını paylaşır mısınız?',null,'ambiguous');
  if(brand && model && !code && /(?:hata kodu yok|kod yok|hata gostermiyor)/.test(normalizePartText(customerText)))
    return respond('Hata kodu görünmediği için doğrulanmış üretici aday havuzu oluşturulamıyor. Yerinde kontrol gerekebilir.',null,'not_found');
  const missing=!brand?'brand':!model?'model':!code?'code':null;
  if(missing){
    if(!previous.asked.includes(missing))previous.asked.push(missing);
    return respond(QUESTIONS[missing],null,'not_needed');
  }

  let knowledge=options.knowledge && researchKey(identity)===researchKey(options.knowledge.identity)
    ?options.knowledge.value:lookupDiagnosticKnowledge(brand,model,code);
  const sessionKnowledge=previous.technicalKnowledge,sessionEvidence=sessionKnowledge?.evidence;
  if(!knowledge && sessionKnowledge && sessionEvidence){
    const restored=toVerifiedKnowledge(identity,{status:'verified',knowledge:sessionKnowledge,verification:{
      sourceVerified:true,modelVerified:true,modelScope:sessionEvidence.modelScope,coveredModels:sessionEvidence.coveredModels,
      errorCodeVerified:true,descriptionVerified:sessionEvidence.descriptionVerified===true,
      manufacturerCausesVerified:true,manufacturerCandidateCount:sessionKnowledge.causes.length}});
    if(restored)await verifiedKnowledgeRepository.saveVerified(restored);
    else previous={...previous,candidates:[],information:0,asked:[],evidence:[],finished:false,stopReason:undefined,technicalKnowledge:undefined};
  }
  let researchStatus=knowledge?'verified':'not_needed';
  let researchVerification:import('./manufacturer-research-engine').ResearchVerification|undefined=
    knowledge?.evidence?.version===3?{sourceVerified:true,modelVerified:true,modelScope:knowledge.evidence.modelScope,
      coveredModels:knowledge.evidence.coveredModels,errorCodeVerified:true,descriptionVerified:knowledge.evidence.descriptionVerified===true,
      manufacturerCausesVerified:knowledge.causes.length>0,manufacturerCandidateCount:knowledge.causes.length}:undefined;
  let researchContext:ReturnType<typeof toResearchContext>|null=null;
  if(!knowledge){
    const research=await getResearchedKnowledge(identity);
    researchStatus=research.status;researchVerification=research.verification;
    researchContext=toResearchContext(identity,research);
    if(research.status==='verified')knowledge=research.knowledge;
    else return respond(research.message,null,researchStatus,researchVerification,researchContext);
  }
  if(!knowledge || !knowledge.causes.length)return respond('Bu hata için doğrulanmış üretici nedenleri bulunamadı.',knowledge??null,researchStatus,researchVerification,researchContext);
  if(!previous.candidates.length)previous.candidates=knowledge.causes.map(name=>({name,probability:0}));

  const usable=isUsableDiagnosticAnswer(previous,message,contextOnly);
  const proposedEvidence=usable?[...previous.evidence,{quote:message,topic:previous.asked.at(-1)??'volunteered',
    observations:extractCustomerObservations(message)}]:previous.evidence;
  const answeredTopics=[...new Set([...previous.asked.filter(topic=>!['brand','model','code'].includes(topic)),
    ...inferObservedTopics(customerText),...previous.evidence.flatMap(item=>(item.observations??[]).map(observation=>observation.topic))])];
  const context:DiagnosisContext={brand,model,errorCode:code,
    manufacturerCandidates:knowledge.causes.map((label,candidateIndex)=>({candidateIndex,label})),
    customerEvidence:proposedEvidence,askedTopics:answeredTopics};
  const assessment=await provider.assess(context);
  let step:ReturnType<typeof advanceDiagnosis>;
  try{step=advanceDiagnosis(previous,assessment,message,contextOnly,answeredTopics);}
  catch(error){
    if(!(error instanceof RejectedDiagnosticQuestion))throw error;
    const logRejection=(question:AIQuestion|null,reason:string)=>{
      if(process.env.NODE_ENV!=='production')console.warn('Rejected AI nextQuestion',{topic:question?.topic,text:question?.text,reason});
    };
    logRejection(assessment.nextQuestion,error.message);
    let repairedQuestion:AIQuestion|null=null;
    try{
      const repaired=await provider.assess({...context,repair:{rejectedQuestion:assessment.nextQuestion,rejectReason:error.message}});
      repairedQuestion=repaired.nextQuestion;
      step=advanceDiagnosis(previous,{...repaired,candidateAssessments:assessment.candidateAssessments},message,contextOnly,answeredTopics);
    }catch(repairError){
      if(repairError instanceof RejectedDiagnosticQuestion)logRejection(repairedQuestion,repairError.message);
      step=advanceDiagnosis(previous,{...assessment,nextQuestion:null,canConclude:false,
        requiresTechnicianMeasurement:true,
        technicianBoundaryReason:'Güvenli ve tekrar etmeyen yararlı bir müşteri sorusu üretilemedi; kalan ayrım yerinde teknik kontrol gerektiriyor.'},
      message,contextOnly,answeredTopics);
    }
  }
  step.memory.technicalKnowledge=knowledge;
  previous=step.memory;
  const evidence=previous.evidence.map(item=>item.quote);
  const top=[...previous.candidates].sort((a,b)=>b.probability-a.probability)[0];
  const reply=previous.stopReason==='technician_measurement_required'
    ?'Aktardığınız gözlemlerle kalan olasılıkları ayırmak için yerinde teknisyen kontrolü gerekiyor.'
    :previous.stopReason==='concluded'
      ?'Değerlendirme tamamlandı. Olası arızaların göreli ağırlıklarını aşağıda görebilirsiniz.'
      :step.question!;
  const result=await buildDiagnosisResult({brand,model,errorCode:code,aiText:reply,isReadyForPrice:false,confidence:0,
    mostLikelyReason:top?.name??'',supportingEvidence:evidence,diagnosticInformationScore:previous.information,
    stopReason:previous.stopReason},history,message,getPartPrice,knowledge);
  return {...result,aiText:reply,options:[],diagnosticStatus:previous.stopReason==='concluded'?'concluded':result.diagnosticStatus,
    researchStatus,researchVerification,researchContext,informationProgress:previous.information,
    assessmentComplete:previous.finished,candidateProbabilities:previous.finished?previous.candidates:[],
    diagnosticEvidence:previous.evidence,stopReason:previous.stopReason,questionRationale:previous.nextQuestionRationale,
    evidenceUpdate:{informative:usable,accepted:usable},stateToken:encodeMemory(previous)};
}
