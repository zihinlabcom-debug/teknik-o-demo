import { createHmac, timingSafeEqual } from 'node:crypto';
import { normalizePartText } from './parts-catalog';
import type { TechnicalKnowledge } from './technical-research';

export const QUESTIONS = {
  brand: 'Cihazınızın markası nedir?', model: 'Cihazınızın etikette yazan tam modeli nedir?',
  code: 'Ekranda hangi hata kodu görünüyor? Kod yoksa bunu yazabilirsiniz.',
  screen: 'Cihazınızın ekranı açık mı?', power: 'Evde diğer elektrikli cihazlar çalışıyor mu?',
  noise: 'Cihazınızdan olağan dışı ses geliyor mu?',
  overheating: 'Peteklerde ya da musluktan akan sıcak suda normalden fazla ısınma fark ettiniz mi?',
  pressure: 'Ekranda görünen basınç değeri kaç bar?',
  leak: 'Kombinin altında veya petek çevresinde su damlaması var mı?',
  onset: 'Sorun ilk ne zaman başladı?', recurrence: 'Sorun sürekli mi oluyor, yoksa arada düzeliyor mu?',
  affected: 'Sorun sıcak suda mı, peteklerde mi, yoksa ikisinde de mi?',
  trigger: 'Sorun sıcak suyu kullanırken mi, petekler ısınırken mi ortaya çıkıyor?',
  gasSupply: 'Bildiğiniz bir doğal gaz kesintisi veya sayaç uyarısı var mı?',
  ignitionSound: 'Hata çıkmadan önce cihazdan ateşleme tıkırtısı duymuş muydunuz?',
  recentWork: 'Sorun, bakım veya gaz kesintisinden hemen sonra mı başladı?',
  flame: 'Hata çıkmadan önce ekranda alev simgesi görmüş müydünüz?',
} as const;
export type QuestionId = keyof typeof QUESTIONS;
export interface Candidate { name: string; probability: number; supports: string[]; contradicts: string[] }
export interface DiagnosticMemory {
  candidates: Candidate[]; information: number; asked: QuestionId[];
  evidence: { quote: string; question: string }[]; finished: boolean;
  poolKey?: string;
  technicalKnowledge?: TechnicalKnowledge;
}
export const emptyMemory = (): DiagnosticMemory => ({candidates:[],information:0,asked:[],evidence:[],finished:false});
const validId = (v: unknown): v is QuestionId => typeof v === 'string' && Object.hasOwn(QUESTIONS,v);
const quotes = (v: unknown, message: string): string[] => Array.isArray(v) ? [...new Set(v.filter((q): q is string =>
  typeof q === 'string' && q.trim().length > 0 && message.includes(q)))].slice(0,10) : [];

export function normalizeProbabilities(candidates: Candidate[]): Candidate[] {
  if (!candidates.length) return [];
  const total = candidates.reduce((sum,c)=>sum+c.probability,0);
  const exact = candidates.map(c=>total > 0 ? c.probability / total * 100 : 100 / candidates.length);
  const integers = exact.map(Math.floor);
  const order = exact.map((n,i)=>({i,remainder:n-integers[i]})).sort((a,b)=>b.remainder-a.remainder);
  const remaining=100-integers.reduce((a,b)=>a+b,0);
  for(let i=0;i<remaining;i++) integers[order[i].i]++;
  return candidates.map((c,i)=>({...c,probability:integers[i]}));
}

export function advanceDiagnosis(previous: DiagnosticMemory, proposal: Record<string,unknown>, message: string, answered: QuestionId[] = [], allowedCandidates?: readonly string[]) {
  const lastQuestion = previous.asked.at(-1) ?? 'initial';
  const unknown = /^(bilmiyorum|emin degilim|goremiyorum|hatirlamiyorum|tamam|tesekkurler|devam|fiyat nedir)$/.test(normalizePartText(message));
  const directAnswer = lastQuestion !== 'initial' && /^(evet|hayir)\b/.test(normalizePartText(message));
  const freshEvidence = (directAnswer ? [...new Set([...quotes(proposal.newEvidence,message),message])] : quotes(proposal.newEvidence,message)).filter(quote=>
    !previous.evidence.some(e=>e.quote===quote &&
      (!/^(evet|hayir|var|yok)$/.test(normalizePartText(quote)) || e.question===lastQuestion)));
  const informative = !unknown && proposal.informative === true && freshEvidence.length > 0;
  const validAnswer = !unknown && freshEvidence.length > 0 && (informative || directAnswer);
  let candidates = previous.candidates.filter(c=>!allowedCandidates || allowedCandidates.includes(c.name)).map(c=>({...c}));
  if(informative && Array.isArray(proposal.candidates)) {
    const updates: Candidate[] = [];
    for(const item of proposal.candidates) {
      if(!item || typeof item !== 'object' || typeof item.name !== 'string' || !item.name.trim() ||
        typeof item.probability !== 'number' || !Number.isFinite(item.probability) || item.probability < 0 || item.probability > 100) continue;
      const supports=quotes(item.supports,message), contradicts=quotes(item.contradicts,message);
      const old = candidates.find(c=>c.name===item.name.trim());
      if(allowedCandidates && !allowedCandidates.includes(item.name.trim())) continue;
      // No weight change or new candidate without a customer quote supporting the update.
      if(!supports.length && !contradicts.length) continue;
      if(updates.some(c=>c.name===item.name.trim())) continue;
      updates.push({name:item.name.trim(),probability:item.probability,
        supports:[...new Set([...(old?.supports ?? []),...supports])],
        contradicts:[...new Set([...(old?.contradicts ?? []),...contradicts])]});
    }
    if(updates.length) candidates = normalizeProbabilities([...candidates.filter(c=>!updates.some(u=>u.name===c.name)),...updates]);
  }
  const information = Math.min(80,previous.information+(validAnswer?10:0));
  const suggested = Array.isArray(proposal.nextQuestions) ? proposal.nextQuestions.filter(validId) : [];
  const nextQuestion = suggested.find(id=>!previous.asked.includes(id) && !answered.includes(id));
  const finished = previous.finished || information >= 80 || proposal.finish === true || !nextQuestion;
  const memory: DiagnosticMemory = {candidates,information,finished,
    ...(previous.poolKey ? {poolKey:previous.poolKey} : {}),
    asked: nextQuestion && !finished ? [...previous.asked,nextQuestion] : previous.asked,
    evidence: validAnswer ? [...previous.evidence,...freshEvidence.map(quote=>({quote,question:lastQuestion}))] : previous.evidence};
  return {memory,question:!finished && nextQuestion ? QUESTIONS[nextQuestion] : null,informative};
}

// Signed state travels with each chat: no model may rewrite the previous distribution.
function signature(body: string) {
  const key=process.env.OPENAI_API_KEY;
  if(!key) throw new Error('Missing signing key');
  return createHmac('sha256',key).update('tekniko-diagnosis-v1:'+body).digest();
}
export function encodeMemory(memory: DiagnosticMemory) {
  const body=Buffer.from(JSON.stringify({memory,expires:Date.now()+24*60*60*1000})).toString('base64url');
  return body+'.'+signature(body).toString('base64url');
}
export function decodeMemory(token: unknown): DiagnosticMemory {
  if(!token) return emptyMemory();
  if(typeof token!=='string' || token.length>100000) throw new Error('Invalid diagnostic state');
  const [body,mac]=token.split('.');
  const received=Buffer.from(mac??'','base64url'), expected=signature(body);
  if(received.length!==expected.length || !timingSafeEqual(received,expected)) throw new Error('Invalid diagnostic signature');
  const value=JSON.parse(Buffer.from(body,'base64url').toString());
  if(value.expires<Date.now()) throw new Error('Diagnostic state expired');
  return value.memory;
}
