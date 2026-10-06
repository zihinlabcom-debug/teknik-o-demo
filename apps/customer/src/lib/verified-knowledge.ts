import {normalizePartText} from './parts-catalog';
import {normalizeFaultCode} from './error-record';
import {extractModelScopes} from './model-scope';
import {isSourceFaithfulLabel} from './manufacturer-label';
import type {ResearchIdentity,ResearchResult,TechnicalKnowledge} from './technical-research';
import {approvedHost} from './manufacturer-registry';

export const VERIFICATION_VERSION='manufacturer-source-extractive-v1';
export const canonicalManufacturer=(name:string)=>normalizePartText(name).replace(/ /g,'');
export const normalizedModel=(model:string)=>normalizePartText(model.normalize('NFKC').replace(/[‐‑–—]/g,'-'));
export interface VerifiedKnowledge {
 manufacturer:string; normalizedModel:string; modelScope:'exact'|'family'; coveredModels:string[];
 normalizedErrorCode:string; originalErrorCode:string; documentIdentity:string;
 verificationVersion:typeof VERIFICATION_VERSION; verifiedAt:string; knowledge:TechnicalKnowledge;
}
export interface VerifiedKnowledgeRepository {
 readonly durability:'process_memory'|'durable';
 findVerified(identity:ResearchIdentity):Promise<VerifiedKnowledge|null>;
 saveVerified(record:VerifiedKnowledge):Promise<void>;
}
function key(record:VerifiedKnowledge){return [record.manufacturer,record.normalizedModel,record.normalizedErrorCode].join('|');}
export function validVerifiedKnowledge(record:VerifiedKnowledge):boolean {
 try {
  const k=record.knowledge,e=k.evidence,r=e?.record;
  if(record.verificationVersion!==VERIFICATION_VERSION||e?.labelPolicy!==VERIFICATION_VERSION||!r||!e||
   !approvedHost(k.source.url,record.manufacturer)||!Number.isFinite(Date.parse(record.verifiedAt))||
   !record.manufacturer||!record.normalizedModel||!record.normalizedErrorCode||
   record.manufacturer!==canonicalManufacturer(record.manufacturer)||
   record.normalizedModel!==normalizedModel(record.normalizedModel)||
   !/^[a-f0-9]{64}$/.test(record.documentIdentity)||e.documentHash!==record.documentIdentity||
   record.normalizedErrorCode!==normalizeFaultCode(k.code)||r.normalizedCode!==record.normalizedErrorCode||
   normalizeFaultCode(record.originalErrorCode)!==record.normalizedErrorCode||record.originalErrorCode!==r.originalCode||
   e.codeEvidence!==r.originalCode||e.errorRecord!==r.text||r.end-r.start!==r.text.length||
   e.modelScope!==record.modelScope||!['exact','family'].includes(record.modelScope)||
   JSON.stringify(record.coveredModels)!==JSON.stringify(e.coveredModels)||!e.coveredModels.length||
   typeof e.descriptionVerified!=='boolean'||e.descriptionEvidence!==r.description.text||
   k.meaning!==(e.descriptionVerified?r.description.text:'')||!k.causes.length||k.causes.length!==e.candidates.length)return false;
  const scopes=extractModelScopes(e.modelEvidence,record.normalizedModel,record.manufacturer);
  if(!e.coveredModels.every(c=>scopes.some(s=>(s.kind===record.modelScope||record.modelScope==='family')&&s.coveredModels.some(m=>normalizedModel(c)===normalizedModel(m)))))return false;
  const seen=new Set<string>();
  return e.candidates.every((c,i)=>{
   const start=c.start,end=c.end;
   if(typeof start!=='number'||typeof end!=='number'||!Number.isInteger(start)||!Number.isInteger(end)||start<r.description.end||end>r.end||end<=start||
    r.text.slice(start-r.start,end-r.start)!==c.basis||
    !r.causeSpans.some(s=>s.start===c.start)||!r.causeSpans.some(s=>s.end===c.end)||
    k.causes[i]!==c.name||!isSourceFaithfulLabel(c.name,c.basis)||(c.part&&!isSourceFaithfulLabel(c.part,c.basis)))return false;
   const id=c.start+':'+c.end;if(seen.has(id))return false;seen.add(id);return true;
  })&&k.parts.every(p=>e.candidates.some(c=>c.part===p));
 }catch{return false;}
}
export function toVerifiedKnowledge(identity:ResearchIdentity,result:ResearchResult):VerifiedKnowledge|null {
 const v=result.verification;if(result.status!=='verified'||!v?.sourceVerified||!v.modelVerified||!v.errorCodeVerified||!v.manufacturerCausesVerified)return null;
 const k=result.knowledge,e=k.evidence;if(!e?.record)return null;
 const record:VerifiedKnowledge={manufacturer:canonicalManufacturer(identity.brand),normalizedModel:normalizedModel(identity.model),
  modelScope:e.modelScope,coveredModels:[...e.coveredModels],normalizedErrorCode:normalizeFaultCode(identity.code),
  originalErrorCode:e.record.originalCode,documentIdentity:e.documentHash??'',verificationVersion:VERIFICATION_VERSION,
  verifiedAt:k.source.reviewedAt,knowledge:structuredClone(k)};
 return v.manufacturerCandidateCount===k.causes.length&&validVerifiedKnowledge(record)?record:null;
}
export function verifiedKnowledgeResult(record:VerifiedKnowledge):ResearchResult {
 const k=structuredClone(record.knowledge),e=k.evidence!;
 return {status:'verified',knowledge:k,description:e.descriptionVerified?k.meaning:null,origin:'verified_knowledge',
  verification:{sourceVerified:true,modelVerified:true,modelScope:record.modelScope,coveredModels:[...record.coveredModels],
   errorCodeVerified:true,descriptionVerified:e.descriptionVerified===true,manufacturerCausesVerified:true,manufacturerCandidateCount:k.causes.length}};
}
export class InMemoryVerifiedKnowledgeRepository implements VerifiedKnowledgeRepository {
 readonly durability='process_memory' as const;
 private records=new Map<string,VerifiedKnowledge>();
 async listVerifiedModels(brand:string,code:string) {
  const manufacturer=canonicalManufacturer(brand),errorCode=normalizeFaultCode(code);
  const names=new Map<string,string>();
  for(const record of this.records.values()){
   if(record.manufacturer!==manufacturer||record.normalizedErrorCode!==errorCode||!validVerifiedKnowledge(record))continue;
   for(const model of [...record.coveredModels,record.normalizedModel]){
    const normalized=normalizedModel(model);
    if(!names.has(normalized))names.set(normalized,model);
   }
  }
  return [...names.values()];
 }
 async findVerified(identity:ResearchIdentity) {
  const manufacturer=canonicalManufacturer(identity.brand),model=normalizedModel(identity.model),code=normalizeFaultCode(identity.code);
  const matches=[...this.records.values()].filter(r=>r.manufacturer===manufacturer&&r.normalizedErrorCode===code&&validVerifiedKnowledge(r)&&
   (r.normalizedModel===model||(r.modelScope==='family'&&r.coveredModels.some(m=>normalizedModel(m)===model))));
  matches.sort((a,b)=>Number(b.modelScope==='exact')-Number(a.modelScope==='exact'));
  return matches[0]?structuredClone(matches[0]):null;
 }
 async saveVerified(record:VerifiedKnowledge) {
  if(!validVerifiedKnowledge(record))throw new Error('Invalid manufacturer verified knowledge');
  // No TTL/eviction and no implicit downgrade/replacement by a later attempt.
  if(!this.records.has(key(record)))this.records.set(key(record),structuredClone(record));
 }
}
