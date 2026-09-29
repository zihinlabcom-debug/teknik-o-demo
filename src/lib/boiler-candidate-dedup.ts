import {normalizePartText} from './parts-catalog';
import {normalizeBoilerErrorCode} from './boiler-error-code';
import type {BoilerCandidate,BoilerSourceEvidence} from './boiler-probability';
const label = (c:BoilerCandidate) => normalizePartText(c.candidate_name);
const genericSensor = (c:BoilerCandidate) => label(c)==='sensor sorunu';
const genericTemperature = (c:BoilerCandidate) => ['sicaklik sensoru sorunu','sicaklik probu sorunu'].includes(label(c));
const genericElectronic = (c:BoilerCandidate) => label(c)==='elektronik kontrol sistemi sorunu';
const temperaturePoint = (c:BoilerCandidate) => /sicaklik sensor|sicaklik prob|\bntc\b/.test(label(c));
const boardPoint = (c:BoilerCandidate) => label(c)==='elektronik kart kontrol unitesi sorunu';
const support = (c:BoilerCandidate) => [...(c.evidence_note??'').matchAll(/(?:description|action) support:\s*"([^"]+)"/g)].map(m=>m[1]);
const markers = (c:BoilerCandidate) => [...new Set(normalizePartText(support(c).join(' ')).match(/\b(?:[a-z]\d+|ntc\d+|x\d+|gidis|donus|boyler)\b/g)??[])].sort().join('|');
export function candidateSourceEvidence(c:BoilerCandidate):BoilerSourceEvidence[] {
  if(c.sourceEvidence)return c.sourceEvidence;
  if(c.official_error_record_id==null||!c.evidence_note||!c.evidence_url)return [];
  return [{candidateId:c.id,candidateName:c.candidate_name,official_error_record_id:c.official_error_record_id,
    evidence_note:c.evidence_note,evidence_url:c.evidence_url,evidence_source_type:c.evidence_source_type}];
}
function scope(c:BoilerCandidate) {
  if(c.official_error_record_id==null||!c.sourceRecord||!c.evidence_note?.trim()||!c.evidence_url?.trim())return null;
  if(String(c.sourceRecord.id)!==String(c.official_error_record_id)||c.sourceRecord.source_url!==c.evidence_url)return null;
  const source=normalizePartText((c.sourceRecord.official_description??'')+' '+(c.sourceRecord.official_action??''));
  const phrases=support(c);
  if(!phrases.length||phrases.some(p=>!source.includes(normalizePartText(p))))return null;
  return JSON.stringify([c.family_id,c.official_model_id,c.error_code?normalizeBoilerErrorCode(c.error_code):null,c.official_error_record_id,c.evidence_url,c.fault_class,source]);
}
// Inspect old+new rows together. Labels/fault_class alone never justify a merge.
export function deduplicateSourceCandidates(rows:BoilerCandidate[]):BoilerCandidate[] {
  const result=rows.map(c=>({...c}));
  const scopes=new Map(result.map(c=>[c.id,scope(c)])),byScope=new Map<string,BoilerCandidate[]>();
  const active=new Set(result.map(c=>c.id));
  for(const c of result){const key=scopes.get(c.id);if(key)byScope.set(key,[...(byScope.get(key)??[]),c]);}
  for(const parent of [...result]) {
    const parentScope=scopes.get(parent.id);if(!parentScope||!active.has(parent.id))continue;
    let children=(byScope.get(parentScope)??[]).filter(c=>c.id!==parent.id&&active.has(c.id));
    if(genericSensor(parent))children=children.filter(c=>!genericSensor(c));
    else if(genericTemperature(parent))children=children.filter(c=>temperaturePoint(c)&&!genericTemperature(c)&&!genericSensor(c));
    else if(genericElectronic(parent))children=children.length===1?children.filter(boardPoint):[];
    else continue;
    children=children.filter(c=>!markers(parent)||!markers(c)||markers(parent)===markers(c));
    if(children.length!==1)continue;
    const child=children[0];
    if(markers(parent)&&markers(child)&&markers(parent)!==markers(child))continue;
    const source=normalizePartText((parent.sourceRecord?.official_description??'')+' '+(parent.sourceRecord?.official_action??''));
    if(genericSensor(parent)||genericTemperature(parent)){
      const locations=new Set([...source.matchAll(/\b(gidis|donus|boyler|kullanim suyu|baca gazi|dis sicaklik|su basinc|hava basinc|diferansiyel basinc).{0,22}(?:sensor|ntc|prob)/g)].map(m=>m[1]));
      const identifiers=new Set(source.match(/\b(?:s\d+|ntc\d+|x\d+)\b/g)??[]);
      const parentIds=new Set(normalizePartText(support(parent).join(' ')).match(/\b(?:s\d+|ntc\d+|x\d+)\b/g)??[]);
      const childIds=new Set(normalizePartText(support(child).join(' ')).match(/\b(?:s\d+|ntc\d+|x\d+)\b/g)??[]);
      const sameNamedPoint=parentIds.size===1&&childIds.size===1&&[...parentIds][0]===[...childIds][0];
      const sourceClauses=((parent.sourceRecord?.official_description??'')+'\n'+(parent.sourceRecord?.official_action??'')).split(/[,;.!?\n]/).map(normalizePartText);
      const differentSensorTypes=sourceClauses.some(clause=>/\bbasinc\w*\s+(?:sensor|prob)/.test(clause))&&
        sourceClauses.some(clause=>/\bntc\b|\bsicaklik\w*\s+(?:sensor|prob)/.test(clause));
      if((locations.size>1||identifiers.size>1||differentSensorTypes)&&!sameNamedPoint)continue;
    }
    if(genericSensor(parent)&&!/(?:sensor|prob|ntc)/.test(source))continue;
    if(genericElectronic(parent)&&(!/elektronik/.test(source)||!/(?:kart|pcb|kontrol unite)/.test(source)))continue;
    const ids=[...new Set([...(child.sourceCandidateIds??[child.id]),...(parent.sourceCandidateIds??[parent.id])])].sort();
    child.sourceCandidateIds=ids;child.sourceCandidateGroups=[ids];
    child.sourceEvidence=[...new Map([...candidateSourceEvidence(child),...candidateSourceEvidence(parent)].map(e=>[e.candidateId,e])).values()];
    active.delete(parent.id);
    result.splice(result.indexOf(parent),1);
  }
  return result;
}
