import {createHmac,timingSafeEqual} from 'node:crypto';
import {normalizePartText} from './parts-catalog';
import type {TechnicalKnowledge} from './technical-research';

export const QUESTIONS={
  brand:'Cihazınızın markası nedir?',model:'Cihazınızın etikette yazan tam modeli nedir?',
  code:'Ekranda hangi hata kodu görünüyor? Kod yoksa bunu yazabilirsiniz.',
  screen:'Cihazınızın ekranı açık mı?',power:'Evde diğer elektrikli cihazlar çalışıyor mu?',
  noise:'Cihazınızdan olağan dışı ses geliyor mu?',
  overheating:'Peteklerde ya da musluktan akan sıcak suda normalden fazla ısınma fark ettiniz mi?',
  pressure:'Ekranda görünen basınç değeri kaç bar?',
  leak:'Kombinin altında veya petek çevresinde su damlaması var mı?',
  onset:'Sorun ilk ne zaman başladı?',recurrence:'Sorun sürekli mi oluyor, yoksa arada düzeliyor mu?',
  affected:'Sorun sıcak suda mı, peteklerde mi, yoksa ikisinde de mi?',
  trigger:'Sorun sıcak suyu kullanırken mi, petekler ısınırken mi ortaya çıkıyor?',
  gasSupply:'Bildiğiniz bir doğal gaz kesintisi veya sayaç uyarısı var mı?',
  ignitionSound:'Hata çıkmadan önce cihazdan ateşleme tıkırtısı duymuş muydunuz?',
  flameFormation:'Ateşleme denemesinde ekranda alev simgesi beliriyor mu?',
  recentWork:'Sorun, bakım veya gaz kesintisinden hemen sonra mı başladı?',
  flame:'Hata çıkmadan önce ekranda alev simgesi görmüş müydünüz?',
  stoveGas:'Ocakta gaz yanıyor mu?',resetOutcome:'Daha önce resetlediyseniz ardından ne oldu?',
  otherErrorCodes:'Ekranda bu koddan başka bir hata kodu göründü mü?',
} as const;
export type QuestionId=keyof typeof QUESTIONS;
export interface Candidate {name:string;probability:number;reason?:string}
export interface CustomerObservation {topic:QuestionId;value:string;evidence:string}
export interface CustomerEvidence {quote:string;topic:string;observations?:CustomerObservation[]}
export interface CandidateAssessment {candidateIndex:number;weight:number;reason:string}
export interface AIQuestion {topic:QuestionId;text:string;whyThisQuestion:string}
export interface AIDiagnosticAssessment {
  candidateAssessments:CandidateAssessment[];
  nextQuestion:AIQuestion|null;
  canConclude:boolean;
  requiresTechnicianMeasurement:boolean;
  technicianBoundaryReason?:string|null;
}
export const MIN_CONFIDENT_INFORMATION=60;
export interface DiagnosticMemory {
  candidates:Candidate[];
  information:number;
  asked:string[];
  evidence:CustomerEvidence[];
  finished:boolean;
  stopReason?:'concluded'|'technician_measurement_required'|'safety';
  nextQuestionRationale?:string;
  poolKey?:string;
  technicalKnowledge?:TechnicalKnowledge;
}
export const emptyMemory=():DiagnosticMemory=>({candidates:[],information:0,asked:[],evidence:[],finished:false});

const unknownAnswer=(value:string)=>/^(bilmiyorum|emin degilim|fark etmedim|kontrol etmedim|goremiyorum|hatirlamiyorum|tamam|tesekkurler|devam|fiyat nedir)[.!? ]*$/.test(normalizePartText(value));
export function isUsableDiagnosticAnswer(previous:DiagnosticMemory,message:string,contextOnly=false) {
  const normalized=normalizePartText(message);
  return !contextOnly && normalized.length>1 && !unknownAnswer(message) &&
    !previous.evidence.some(item=>normalizePartText(item.quote)===normalized);
}
export function inferObservedTopics(message:string):QuestionId[] {
  const value=normalizePartText(message),topics:QuestionId[]=[];
  if(/(?:gaz kesintisi|sayacta?.*uyari|gaz vanasi|gazli cihaz|gaz geliyor|gaz gelmiyor)/.test(value))topics.push('gasSupply');
  if(/(?:tikirti|tiklama|tikliyor|cakma sesi|atesleme sesi|atesleme tikirtisi)/.test(value))topics.push('ignitionSound');
  if(/(?:alev olus|alev alm|alev yok|alev gor|alev simgesi|ateslemiyor|cihaz yanmiyor|kombi yanmiyor)/.test(value))topics.push('flameFormation');
  if(/(?:bakim|onarim|servis geld|parca degis)/.test(value))topics.push('recentWork');
  if(/(?:ocakta gaz|ocak yaniyor|ocak yanmiyor|diger gazli cihaz)/.test(value))topics.push('stoveGas');
  if(/(?:reset|sifirla)/.test(value))topics.push('resetOutcome');
  if(/(?:baska hata kodu|diger hata kodu|farkli hata kodu)/.test(value))topics.push('otherErrorCodes');
  if(/(?:ne zaman basla|ilk ne zaman|ne zamandir|gun once|hafta once|ay once|kendiliginden basla|aniden basla|sonra basla|sonra ortaya cik)/.test(value))topics.push('onset');
  return [...new Set([...topics,...extractCustomerObservations(message).map(item=>item.topic)])];
}
export function extractCustomerObservations(message:string):CustomerObservation[] {
  if(unknownAnswer(message))return [];
  const clauses=message.split(/\b(?:ama|fakat|ancak)\b|[,;.!?]/giu).map(part=>part.trim()).filter(Boolean);
  const all=normalizePartText(message),observations:CustomerObservation[]=[];
  for(const evidence of clauses){
    const value=normalizePartText(evidence);
    if(/(?:bilmiyorum|emin degilim|fark etmedim|hatirlamiyorum|\bmi\b|\bmu\b)/.test(value))continue;
    const add=(topic:QuestionId,result:string)=>observations.push({topic,value:result,evidence});
    if(/(?:tiklama|tikliyor|tikirti|cakma sesi|atesleme sesi)/.test(value))
      add('ignitionSound',/(?:yok|gelmiyor|duymuyorum|duymadim)/.test(value)?'absent':'present');
    if(/(?:alev almiyor|alev olusmuyor|alev yok|alev simgesi yok|ateslemiyor)/.test(value)||
      (/yanmiyor/.test(value)&&!/ocak/.test(value)&&/(?:kombi|cihaz)/.test(all)))add('flameFormation','absent');
    else if(/(?:alev aliyor|alev olusuyor|alev simgesi (?:var|beliriyor))/.test(value))add('flameFormation','present');
    if(/(?:gaz vanasi acik|gaz var|gaz geliyor|gaz kesintisi yok)/.test(value))add('gasSupply','present');
    else if(/(?:gaz vanasi kapali|gaz yok|gaz gelmiyor|gaz kesintisi var)/.test(value))add('gasSupply','absent');
    if(/(?:ocak|diger gazli cihaz)/.test(value)&&/(?:calisiyor|yaniyor|calismiyor|yanmiyor)/.test(value))
      add('stoveGas',/(?:calismiyor|yanmiyor)/.test(value)?'absent':'present');
    if(/(?:reset|sifirla)/.test(value)){
      if(/(?:yine ayni|hala ayni|duzelmedi|ise yaramadi|tekrar)/.test(value))add('resetOutcome','unchanged');
      else if(/(?:duzeldi|calisti)/.test(value))add('resetOutcome','resolved');
    }
    if(/(?:bakim|onarim|servis|parca degis)/.test(value)){
      if(/(?:yok|yapilmadi|gelmedi|degismedi)/.test(value))add('recentWork','absent');
      else if(/(?:yapildi|geldi|degisti)/.test(value))add('recentWork','present');
    }
    if(/(?:baska hata kodu|diger hata kodu|farkli hata kodu)/.test(value))
      add('otherErrorCodes',/(?:yok|gorusmedi|cikmadi)/.test(value)?'absent':'present');
    if(/(?:asiri isinma|fazla isinma)/.test(value))add('overheating',/(?:yok|olmadi)/.test(value)?'absent':'present');
    if(/(?:gun once|hafta once|ay once|kendiliginden basla|aniden basla)/.test(value))add('onset','reported');
  }
  return observations;
}
export function inferQuestionTopic(question:string):QuestionId|undefined {
  const value=normalizePartText(question);
  if(/(?:ne zaman basla|ilk ne zaman|ne zamandir|ne zaman ortaya cik)/.test(value))return 'onset';
  if(/(?:tikirti|tiklama|atesleme sesi)/.test(value))return 'ignitionSound';
  if(/(?:alev olus|alev al|alev gor|alev simgesi)/.test(value))return 'flameFormation';
  if(/(?:gaz vanasi|gazli cihaz|gaz kesintisi|gaz var mi|gaz geliyor mu)/.test(value))return 'gasSupply';
  if(/(?:bakim|onarim|servis geld|parca degis)/.test(value))return 'recentWork';
  if(/(?:reset|sifirla)/.test(value))return 'resetOutcome';
  if(/(?:baska hata kodu|diger hata kodu|farkli hata kodu)/.test(value))return 'otherErrorCodes';
  return undefined;
}
export const canonicalTopic=(topic:string)=>topic==='flame'?'flameFormation':topic;
const unsafeQuestion=(value:string)=>/(?:multimetre|voltaj|volt\b|direnc|ohm|bobin|pin\b|kartin|kapagi|kapak ac|sok|sokun|yanma odasi|gaz valfi|elektrik baglantisi|gaz baglantisi|\bolc|gaz (?:giris )?basinc|manometre|continuity|sureklilik test|yanma analizi|combustion analysis)/.test(normalizePartText(value));
export class RejectedDiagnosticQuestion extends Error {}

// The AI supplies every weight. This function only validates and stores its full distribution.
export function advanceDiagnosis(previous:DiagnosticMemory,assessment:AIDiagnosticAssessment,message:string,
  contextOnly=false,answeredTopics:string[]=[]) {
  const usable=isUsableDiagnosticAnswer(previous,message,contextOnly);
  const information=Math.min(100,previous.information+(usable?10:0));
  const evidence=usable?[...previous.evidence,{quote:message,topic:previous.asked.at(-1)??'volunteered',
    observations:extractCustomerObservations(message)}]:previous.evidence;
  const pool=previous.candidates;
  if(!Array.isArray(assessment.candidateAssessments) || assessment.candidateAssessments.length!==pool.length)throw Error('Incomplete AI candidate assessment');
  const byIndex=new Map<number,CandidateAssessment>();
  for(const item of assessment.candidateAssessments){
    if(!item || !Number.isInteger(item.candidateIndex) || item.candidateIndex<0 || item.candidateIndex>=pool.length ||
      byIndex.has(item.candidateIndex) || typeof item.weight!=='number' || !Number.isFinite(item.weight) || item.weight<0 ||
      typeof item.reason!=='string' || !item.reason.trim())throw Error('Invalid AI candidate assessment');
    byIndex.set(item.candidateIndex,item);
  }
  const sum=[...byIndex.values()].reduce((total,item)=>total+item.weight,0);
  if(!Number.isFinite(sum) || sum<=0)throw Error('AI candidate weights must have a positive finite total');
  const normalizedWeights=pool.map((_,index)=>sum===100?byIndex.get(index)!.weight:byIndex.get(index)!.weight/sum*100);
  if(sum!==100){
    const correctionIndex=normalizedWeights.indexOf(Math.max(...normalizedWeights));
    normalizedWeights[correctionIndex]+=100-normalizedWeights.reduce((total,weight)=>total+weight,0);
  }
  // A repeated or unknown reply provides no new evidence, so retain the prior distribution.
  const candidates=(usable || pool.every(candidate=>candidate.probability===0)) ? pool.map((candidate,index)=>({name:candidate.name,
    probability:normalizedWeights[index],reason:byIndex.get(index)!.reason})) : pool;
  let question:string|null=null;
  let topic:string|undefined;
  const proposed=assessment.nextQuestion;
  const boundaryReason=assessment.technicianBoundaryReason?.trim();
  if(assessment.requiresTechnicianMeasurement && (proposed!==null || !boundaryReason || assessment.canConclude))
    throw new RejectedDiagnosticQuestion('Technician boundary requires no useful customer question and a reason');
  if(proposed!==null){
    if(!proposed || typeof proposed!=='object' || typeof proposed.topic!=='string' || !Object.hasOwn(QUESTIONS,proposed.topic) ||
      ['brand','model','code'].includes(proposed.topic) || typeof proposed.text!=='string' || !proposed.text.trim().endsWith('?') ||
      typeof proposed.whyThisQuestion!=='string' || !proposed.whyThisQuestion.trim() || unsafeQuestion(proposed.text))
      throw new RejectedDiagnosticQuestion('Unsafe or invalid AI question');
    const semanticTopic=inferQuestionTopic(proposed.text);
    const knownTopics=new Set([...previous.asked,...answeredTopics,...evidence.flatMap(item=>[
      ...inferObservedTopics(item.quote),...(item.observations??[]).map(observation=>observation.topic)])].map(canonicalTopic));
    if(knownTopics.has(canonicalTopic(proposed.topic)) || (semanticTopic && knownTopics.has(canonicalTopic(semanticTopic))))
      throw new RejectedDiagnosticQuestion('Repeated diagnostic topic');
    topic=semanticTopic??proposed.topic;question=proposed.text.trim();
  }
  const stopReason=assessment.requiresTechnicianMeasurement===true && !question?'technician_measurement_required':
    assessment.canConclude===true && information>=MIN_CONFIDENT_INFORMATION?'concluded':undefined;
  const finished=previous.finished || Boolean(stopReason);
  if(!finished && !question)throw new RejectedDiagnosticQuestion('AI provided neither a safe next question nor a justified stop');
  const memory:DiagnosticMemory={...previous,candidates,information,evidence,finished,
    asked:question && !finished?[...previous.asked,topic!]:previous.asked,
    ...(stopReason?{stopReason}:{}),
    ...(question && !finished?{nextQuestionRationale:proposed!.whyThisQuestion}:{}),
  };
  return {memory,question:finished?null:question,informative:usable};
}

// Signed state travels with the chat; the browser cannot replace the manufacturer pool or evidence.
function signature(body:string){
  const key=process.env.OPENAI_API_KEY;
  if(!key)throw Error('Missing signing key');
  return createHmac('sha256',key).update('tekniko-diagnosis-v1:'+body).digest();
}
export function encodeMemory(memory:DiagnosticMemory){
  const body=Buffer.from(JSON.stringify({memory,expires:Date.now()+24*60*60*1000})).toString('base64url');
  return body+'.'+signature(body).toString('base64url');
}
export function decodeMemory(token:unknown):DiagnosticMemory{
  if(!token)return emptyMemory();
  if(typeof token!=='string'||token.length>100000)throw Error('Invalid diagnostic state');
  const [body,mac]=token.split('.');
  const received=Buffer.from(mac??'','base64url'),expected=signature(body);
  if(received.length!==expected.length||!timingSafeEqual(received,expected))throw Error('Invalid diagnostic signature');
  const value=JSON.parse(Buffer.from(body,'base64url').toString());
  if(value.expires<Date.now())throw Error('Diagnostic state expired');
  return value.memory;
}
