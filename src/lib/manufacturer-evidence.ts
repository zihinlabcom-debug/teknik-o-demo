import { sourceContains, containsErrorCode } from './manufacturer-document';

function normalized(value:string) {
  return value.normalize('NFKC').toUpperCase().replace(/İ/g,'I').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
}
type Evidence = {
  modelScope: 'exact'|'family'|'ambiguous'; modelEvidence:string; coveredModels:string[];
  codeEvidence:string; descriptionEvidence:string; errorRecord:string;
  candidates:Array<{name:string;basis:string;part:string}>;
};
// Check complete declared model names, not arbitrary substrings of longer variants.
export function modelScopeMatches(model:string, report:Pick<Evidence,'modelScope'|'modelEvidence'|'coveredModels'>, text:string) {
  if(!model.trim() || !Array.isArray(report.coveredModels) || !report.coveredModels.length ||
    !sourceContains(text,report.modelEvidence) || report.coveredModels.some(m=>typeof m!=='string'||!sourceContains(text,m))) return false;
  const wanted=normalized(model), covered=report.coveredModels.map(normalized);
  if(report.modelScope==='family') {
    const prefixes=covered.every(m=>m===wanted || m.startsWith(wanted+' ') || m.startsWith(wanted+'-'));
    // Covers often associate a marketing family with separate product identifiers.
    // Keep that complete cover quotation for the independent scope audit.
    const explicitCover=report.modelEvidence.split(/\r?\n/).some(line=>normalized(line)===wanted) &&
      report.coveredModels.every(m=>sourceContains(report.modelEvidence,m));
    return prefixes || explicitCover;
  }
  if(report.modelScope!=='exact' || !covered.includes(wanted)) return false;
  // A quote truncated before a variant suffix does not establish exact scope.
  return text.split(/\r?\n/).some(line=> {
    const value=normalized(line);
    return value===wanted || value.endsWith(': '+wanted);
  });
}

export function validateManufacturerEvidence(identity:{model:string;code:string}, raw:unknown, text:string):boolean {
  if(!raw || typeof raw!=='object') return false;
  const r=raw as Evidence;
  if(typeof r.modelEvidence!=='string' || typeof r.codeEvidence!=='string' || typeof r.descriptionEvidence!=='string' ||
    typeof r.errorRecord!=='string' || !Array.isArray(r.candidates) || !modelScopeMatches(identity.model,r,text)) return false;
  if(!r.descriptionEvidence.trim() || r.errorRecord.length>12000 || !sourceContains(text,r.errorRecord) ||
    !sourceContains(r.errorRecord,r.codeEvidence) || !sourceContains(r.codeEvidence,r.descriptionEvidence) ||
    !containsErrorCode(r.codeEvidence,identity.code)) return false;
  const chars=identity.code.replace(/[.\s-]/g,'').split('');
  if(!chars.length || chars.some(c=>!/[a-z0-9]/i.test(c))) return false;
  const start=new RegExp('^\\s*'+chars.join('[.\\s-]*')+'(?=$|[^a-z0-9])','i');
  if(!start.test(r.errorRecord) || !start.test(r.codeEvidence)) return false;
  const bases=new Set<string>();
  for(const c of r.candidates) {
    if(!c || typeof c.name!=='string' || !c.name.trim() || typeof c.basis!=='string' || typeof c.part!=='string' ||
      !sourceContains(r.errorRecord,c.basis) || sourceContains(r.codeEvidence,c.basis) ||
      normalized(c.basis)===normalized(r.descriptionEvidence) || bases.has(normalized(c.basis))) return false;
    bases.add(normalized(c.basis));
  }
  return true;
}

export interface ManufacturerEvidence {
  version:2|3;
  labelPolicy?:'manufacturer-source-extractive-v1';
  descriptionVerified?:boolean;
  record?:import('./error-record').ErrorRecord; documentHash?:string;
  modelScope:'exact'|'family'; coveredModels:string[]; modelEvidence:string;
  errorRecord:string; codeEvidence:string; descriptionEvidence:string;
  candidates:Array<{name:string;basis:string;part:string;start?:number;end?:number}>;
}
