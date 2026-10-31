export type FinanceDecisionInput={decision:'distribute'|'refund';complaintId:string;reportVersion:string|null;reason:string;evidenceIds:string[];idempotencyKey:string};
export type CaseQuestion={id:string;requestId:string;message:string;createdAt:string;closed:boolean;response:null|{text:string;createdAt:string}};
export type CaseNotice={id:string;requestId:string;kind:string;message:string;createdAt:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class CaseInputError extends Error { constructor(){super('Geçerli gerekçe, kayıt sürümü ve kanıt bağlantıları gerekli.');} }
export function parseFinanceDecision(value:Record<string,unknown>):FinanceDecisionInput{
 const keys=['decision','complaintId','reportVersion','reason','evidenceIds','idempotencyKey'];
 if(Object.keys(value).some(k=>!keys.includes(k))||!['distribute','refund'].includes(String(value.decision)))throw new CaseInputError();
 const {complaintId,reportVersion,reason,evidenceIds,idempotencyKey}=value;
 if(typeof complaintId!=='string'||!uuid.test(complaintId)||typeof reason!=='string'||reason.trim().length<20||reason.trim().length>2000||typeof idempotencyKey!=='string'||idempotencyKey.length<8||idempotencyKey.length>128)throw new CaseInputError();
 if(reportVersion!==null&&(typeof reportVersion!=='string'||!uuid.test(reportVersion))||value.decision==='distribute'&&reportVersion===null)throw new CaseInputError();
 if(!Array.isArray(evidenceIds)||evidenceIds.length<1||evidenceIds.length>5||evidenceIds.some(x=>typeof x!=='string'||!uuid.test(x))||new Set(evidenceIds).size!==evidenceIds.length)throw new CaseInputError();
 return {decision:value.decision as FinanceDecisionInput['decision'],complaintId,reportVersion:reportVersion as string|null,reason:reason.trim(),evidenceIds:[...evidenceIds] as string[],idempotencyKey};
}
