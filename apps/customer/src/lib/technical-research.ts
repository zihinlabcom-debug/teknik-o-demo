import {DOMAINS,approvedHost} from './manufacturer-registry';
export {approvedHost} from './manufacturer-registry';
import OpenAI from 'openai';
import { normalizePartText } from './parts-catalog';
import { QUESTIONS, type QuestionId } from './diagnostic-state';
import { readManufacturerDocument } from './manufacturer-document';
import { validateManufacturerEvidence, type ManufacturerEvidence } from './manufacturer-evidence';
import {runManufacturerResearch,type ResearchVerification} from './manufacturer-research-engine';
import {InMemoryVerifiedKnowledgeRepository,toVerifiedKnowledge,verifiedKnowledgeResult,canonicalManufacturer,normalizedModel,type VerifiedKnowledgeRepository} from './verified-knowledge';

export interface TechnicalKnowledge {
  code: string; meaning: string; causes: string[]; parts: string[]; questions: string[]; questionIds: QuestionId[];
  evidence?: ManufacturerEvidence;
  page: number | null;
  source: { title: string; url: string; revision: string; reviewedAt: string };
}
export type ResearchResult = ({ status: 'verified'; knowledge: TechnicalKnowledge } |
  { status: 'not_found' | 'ambiguous' | 'unavailable' | 'description_only' | 'partial'; message: string }) & {
   verification?:ResearchVerification;source?:{url:string;title:string};description?:string|null;
   origin?:'verified_knowledge'|'live_research'|'cache';knowledgeStorage?:'process_memory'|'durable'|'write_failed';
  };
export interface ResearchIdentity { brand: string; model: string; code: string }
const reportProperties = {
  status:{type:'string',enum:['verified','ambiguous','not_found']},
  ...Object.fromEntries(['brand','model','code','meaning','title','revision','modelEvidence','codeEvidence'].map(key=>[key,{type:'string'}])),
  modelScope:{type:'string',enum:['exact','family','ambiguous']},
  coveredModels:{type:'array',items:{type:'string'}},
  errorRecord:{type:'string'},descriptionEvidence:{type:'string'},
  modelMatch:{type:'boolean'},codeMatch:{type:'boolean'},officialManufacturer:{type:'boolean'},
  page:{type:['integer','null']},
  candidates:{type:'array',items:{type:'object',additionalProperties:false,
    properties:{name:{type:'string'},basis:{type:'string'},part:{type:'string'}},required:['name','basis','part']}},
  questionIds:{type:'array',items:{type:'string',enum:Object.keys(QUESTIONS)}},
};
export function normalizeCode(code: string) { return code.toUpperCase().replace(/[.\s-]/g,''); }
export function researchKey({brand,model,code}:ResearchIdentity) {
  return [canonicalManufacturer(brand),normalizedModel(model),normalizeCode(code)].join('|');
}
function normalizedUrl(value: string) { const u=new URL(value); u.hash=''; return u.href; }
export function validateResearch(identity: ResearchIdentity, raw: unknown, searchedUrls: string[], proof?: {text:string;review:unknown}): ResearchResult {
  const unavailable: ResearchResult={status:'not_found',message:'Bu marka, model ve hata kodu için üretici bilgisi doğrulanamadı.'};
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) return unavailable;
  const data=raw as Record<string,unknown>;
  if(!proof || !validateManufacturerEvidence(identity,data,proof.text) || !validReview(proof.review,Array.isArray(data.candidates)?data.candidates.length:0)) return unavailable;
  const allowedKeys=new Set([...Object.keys(reportProperties),'url']);
  if(Object.keys(data).some(key=>!allowedKeys.has(key)) ||
    ['brand','model','code','meaning','title','revision','modelEvidence','codeEvidence','url'].some(key=>typeof data[key]!=='string') ||
    ['modelMatch','codeMatch','officialManufacturer'].some(key=>typeof data[key]!=='boolean') ||
    !(data.page===null || (typeof data.page==='number' && Number.isInteger(data.page) && data.page>0)) ||
    !Array.isArray(data.candidates) || !Array.isArray(data.questionIds) ||
    data.questionIds.some(id=>typeof id!=='string' || !Object.hasOwn(QUESTIONS,id))) return unavailable;
  if(data.status==='ambiguous') return {status:'ambiguous',message:'Cihaz etiketindeki tam model ve varsa model ekini paylaşır mısınız?'};
  if(data.status!=='verified' || normalizePartText(String(data.brand??''))!==normalizePartText(identity.brand) ||
    normalizePartText(String(data.model??''))!==normalizePartText(identity.model) || normalizeCode(String(data.code??''))!==normalizeCode(identity.code)) return unavailable;
  if(data.modelMatch!==true || data.codeMatch!==true || data.officialManufacturer!==true) return unavailable;
  const url=String(data.url??'');
  if(!approvedHost(url,identity.brand)) return unavailable;
  let visited=false;
  try {visited=searchedUrls.some(v=>{try{return normalizedUrl(v)===normalizedUrl(url);}catch{return false;}});}catch{}
  if(!visited || typeof data.meaning!=='string' || !data.meaning.trim() || typeof data.modelEvidence!=='string' || !data.modelEvidence.trim() || typeof data.codeEvidence!=='string' || !data.codeEvidence.trim()) return unavailable;
  if(!Array.isArray(data.candidates) || data.candidates.length>25) return unavailable;
  if(!data.candidates.length) return {status:'description_only',message:'Üretici hata açıklaması doğrulandı; ayrı nedenler belirtilmediğinden aday havuzu oluşturulmadı.'};
  const candidates=data.candidates.filter((c): c is {name:string;basis:string;part:string} => !!c && typeof c==='object' &&
    Object.keys(c).every(key=>['name','basis','part'].includes(key)) && typeof c.name==='string' && c.name.trim().length>0 && typeof c.basis==='string' && c.basis.trim().length>0 && typeof c.part==='string');
  if(candidates.length!==data.candidates.length) return unavailable;
  const questionIds=Array.isArray(data.questionIds) ? [...new Set(data.questionIds.filter((id): id is QuestionId=>typeof id==='string' && Object.hasOwn(QUESTIONS,id) && !['brand','model','code'].includes(id)))] : [];
  if(!questionIds.length) return unavailable;
  return {status:'verified',knowledge:{evidence:{version:2,modelScope:data.modelScope as 'exact'|'family',coveredModels:data.coveredModels as string[],modelEvidence:data.modelEvidence as string,errorRecord:data.errorRecord as string,codeEvidence:data.codeEvidence as string,descriptionEvidence:data.descriptionEvidence as string,candidates},code:normalizeCode(identity.code),meaning:data.meaning,
    causes:[...new Set(candidates.map(c=>c.name.trim()))],parts:[...new Set(candidates.map(c=>c.part).filter(Boolean))],
    questions:questionIds.map(id=>QUESTIONS[id]),questionIds,
    page:typeof data.page==='number' && Number.isInteger(data.page) && data.page>0 ? data.page : null,
    source:{url,title:String(data.title??'Üretici teknik belgesi'),revision:String(data.revision??''),reviewedAt:new Date().toISOString()}}};
}

const reviewProperties={
  modelScopeSupported:{type:'boolean'},faultRecordSupported:{type:'boolean'},
  candidates:{type:'array',items:{type:'object',additionalProperties:false,
    properties:{index:{type:'integer'},supported:{type:'boolean'},reason:{type:'string'}},required:['index','supported','reason']}},
  reason:{type:'string'},
};
function validReview(raw:unknown,count:number) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) return false;
  const r=raw as Record<string,unknown>;
  return Object.keys(r).length===4 && r.modelScopeSupported===true && r.faultRecordSupported===true && typeof r.reason==='string' &&
    Array.isArray(r.candidates) && r.candidates.length===count && r.candidates.every((c,i)=>c && typeof c==='object' &&
      Object.keys(c).length===3 && c.index===i && c.supported===true && typeof c.reason==='string');
}
export async function researchManufacturer(identity:ResearchIdentity,audit?: (raw:unknown,urls:string[])=>void,dependencies:{client?:Pick<OpenAI,'responses'|'chat'>;readDocument?:typeof readManufacturerDocument}={}):Promise<ResearchResult> {
 return runManufacturerResearch(identity,DOMAINS[normalizePartText(identity.brand).replace(/ /g,'')]??[],url=>approvedHost(url,identity.brand),audit,dependencies);
}

export function createTechnicalResearchService(research=researchManufacturer, now=Date.now, repository:VerifiedKnowledgeRepository=new InMemoryVerifiedKnowledgeRepository()) {
  const cache=new Map<string,{expires:number;result:ResearchResult}>();
  const pending=new Map<string,Promise<ResearchResult>>();
  const fromRepository=async(identity:ResearchIdentity)=>{
    const stored=await repository.findVerified(identity);
    return stored?{...verifiedKnowledgeResult(stored),knowledgeStorage:repository.durability}:null;
  };
  const lookup=async(identity:ResearchIdentity):Promise<ResearchResult>=>{
    if(!identity.brand.trim() || !identity.model.trim() || !identity.code.trim()) return {status:'not_found',message:'Marka, tam model ve hata kodu gerekli.'};
    // Authoritative verified knowledge is checked before both positive/negative cache.
    let known:ResearchResult|null;
    try {known=await fromRepository(identity);}catch{return {status:'unavailable',message:'Doğrulanmış bilgi deposuna şu anda ulaşılamıyor.'};}
    if(known)return known;
    const key=researchKey(identity),cached=cache.get(key);
    if(cached && cached.expires>now()) return {...structuredClone(cached.result),origin:'cache'};
    const running=pending.get(key); if(running) return running;
    const task=(async()=>{
      let result:ResearchResult;
      try {result={...await research(identity),origin:'live_research'};} catch {result={status:'unavailable',origin:'live_research',message:'Üretici kaynaklarına şu anda ulaşılamadı. Yeniden deneyebilirsiniz.'};}
      // A concurrent successful writer wins over a later outage or negative result.
      const learned=await fromRepository(identity).catch(()=>null);if(learned)return learned;
      const verified=toVerifiedKnowledge(identity,result);
      if(result.status==='verified'&&!verified)result={status:'partial',origin:'live_research',message:'Kaynağın aday kanıtları bilgi deposunun doğrulama şartlarını karşılamadı.'};
      if(verified){
        try{await repository.saveVerified(verified);result={...result,knowledgeStorage:repository.durability};}
        catch{result={...result,knowledgeStorage:'write_failed'};}
      }
      if(cache.size>=200) cache.delete(cache.keys().next().value!);
      cache.set(key,{result:structuredClone(result),expires:now()+(result.status==='verified'?86400000:30000)});
      return result;
    })();
    pending.set(key,task);
    try{return await task;}finally{pending.delete(key);}
  };
  return Object.assign(lookup,{clearCache:()=>cache.clear()});
}
// Explicitly process-scoped until a durable repository adapter is configured.
export const verifiedKnowledgeRepository=new InMemoryVerifiedKnowledgeRepository();
export const getResearchedKnowledge=createTechnicalResearchService(researchManufacturer,Date.now,verifiedKnowledgeRepository);
