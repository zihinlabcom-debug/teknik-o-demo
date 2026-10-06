import type {ResearchIdentity,ResearchResult} from './technical-research';
import {canonicalManufacturer,normalizedModel} from './verified-knowledge';
import {normalizeFaultCode} from './error-record';
export function toResearchContext(identity:ResearchIdentity,result:ResearchResult) {
 const k=result.status==='verified'?result.knowledge:undefined,e=k?.evidence,v=result.verification;
 return {device:{manufacturer:canonicalManufacturer(identity.brand),model:identity.model,normalizedModel:normalizedModel(identity.model),
   modelScope:v?.modelScope??e?.modelScope??'unknown',coveredModels:v?.coveredModels??e?.coveredModels??[],familyEvidence:e?.modelEvidence??null},
  fault:{errorCode:normalizeFaultCode(identity.code),originalErrorCode:e?.codeEvidence??identity.code,
   meaning:v?.descriptionVerified?k?.meaning??result.description??null:null,descriptionVerified:v?.descriptionVerified===true},
  manufacturerKnowledge:{causes:(e?.candidates??[]).map(c=>({label:c.name,evidence:{text:c.basis,start:c.start??null,end:c.end??null},part:c.part})),
   sources:k?[{...k.source,documentIdentity:e?.documentHash??null}]:result.source?[result.source]:[],
   errorRecord:e?.record?{normalizedCode:e.record.normalizedCode,originalCode:e.record.originalCode,text:e.record.text,start:e.record.start,end:e.record.end,page:e.record.page}:null,verificationVersion:e?.labelPolicy??null},
  researchStatus:result.status==='not_found'&&v?.sourceVerified?'partial':result.status,origin:result.origin??'live_research',knowledgeStorage:result.knowledgeStorage??null};
}
