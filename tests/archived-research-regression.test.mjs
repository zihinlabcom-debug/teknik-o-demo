import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {extractErrorRecords} from '../src/lib/error-record.ts';import {extractModelScopes} from '../src/lib/model-scope.ts';
import {assessRecord} from '../src/lib/manufacturer-research-engine.ts';import {sourceContains} from '../src/lib/manufacturer-document.ts';
test('accepted archived Vaillant/Bosch/Demirdöküm/Warmhaus evidence survives server span extraction',async()=>{
 const vb=JSON.parse(await readFile('test-results/technical-research-live.json','utf8'));
 const multi=JSON.parse(await readFile('test-results/multibrand-generalization-v2/results.json','utf8'));
 const cases=vb.map(row=>({identity:row.identity,knowledge:row.knowledge,file:'test-results/'+row.identity.brand.toLowerCase()+'-evidence-document.txt'}));
 for(const row of multi.results.filter(r=>r.researchStatus==='verified'))cases.push({identity:row.identity,knowledge:row.result.knowledge,file:'test-results/multibrand-generalization-v2/'+row.documents.find(d=>d.finalUrl===row.sourceUrl).documentFile});
 for(const {identity,knowledge,file} of cases){
  const text=await readFile(file,'utf8'),records=extractErrorRecords(text,identity.code),scopes=extractModelScopes(text,identity.model,identity.brand);
  const record=records.find(r=>sourceContains(r.text,knowledge.evidence.candidates[0].basis));assert.ok(record,identity.brand+' record');assert.ok(scopes.length,identity.brand+' scope');
  const candidates=knowledge.evidence.candidates.map(c=>{
   let best;
   for(let a=0;a<record.causeSpans.length;a++)for(let b=a;b<record.causeSpans.length;b++){
    const start=record.causeSpans[a],end=record.causeSpans[b];
    if(sourceContains(text.slice(start.start,end.end),c.basis)&&(!best||end.end-start.start<best.size))best={startSpan:start.id,endSpan:end.id,size:end.end-start.start};
   }
   assert.ok(best,identity.brand+': '+c.name);// Revalidate archived source evidence under the extractive-label contract; old translated labels are not silently grandfathered.
   return {name:c.basis,part:'',startSpan:best.startSpan,endSpan:best.endSpan};
  });
  const result=assessRecord(identity,{url:knowledge.source.url,text},scopes,records,{scopeId:scopes[0].id,recordId:record.id,candidates,questionIds:knowledge.questionIds},
   {modelVerified:true,errorCodeVerified:true,descriptionVerified:true,reason:'Previously audited real manufacturer evidence fixture',candidates:candidates.map((_,index)=>({index,supported:true,reason:'Previously audited quotation'}))});
  assert.equal(result.status,'verified',identity.brand);assert.equal(result.knowledge.causes.length,knowledge.causes.length,identity.brand+' candidate preservation');
 }
});
