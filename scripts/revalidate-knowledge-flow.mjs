// Offline replay of this task's downloaded documents after the generic scope fix.
// No new search, no source hints, no altered archived results or model answers.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {extractErrorRecords} from '../src/lib/error-record.ts';
import {extractModelScopes} from '../src/lib/model-scope.ts';
import {assessRecord} from '../src/lib/manufacturer-research-engine.ts';
import {InMemoryVerifiedKnowledgeRepository,toVerifiedKnowledge} from '../src/lib/verified-knowledge.ts';
import {createTechnicalResearchService} from '../src/lib/technical-research.ts';
import {toResearchContext} from '../src/lib/research-context.ts';
const folder='test-results/verified-knowledge-v5',run=JSON.parse(await readFile(folder+'/results.json','utf8'));
const output={method:'Offline revalidation of original downloaded documents and original semantic responses, using final scope extraction. This is NOT a second live test.',results:[]};
for(const row of run.results.filter(r=>r.first.status==='verified')){
 const source=row.first.knowledge.source.url,doc=row.documents.find(d=>d.finalUrl===source);
 const text=await readFile(folder+'/'+doc.file,'utf8');
 const records=extractErrorRecords(text,row.identity.code),scopes=extractModelScopes(text,row.identity.model,row.identity.brand);
 const selection=row.events.findLast(e=>e.raw.stage==='selection'&&e.urls.includes(source)).raw.selection;
 const review=row.events.findLast(e=>e.raw.stage==='entailment'&&e.urls.includes(source)).raw.review;
 const result=assessRecord(row.identity,{url:source,text},scopes,records,selection,review);
 assert.equal(result.status,'verified');assert.equal(result.knowledge.causes.length,row.first.knowledge.causes.length);
 const repository=new InMemoryVerifiedKnowledgeRepository(),record=toVerifiedKnowledge(row.identity,result);
 assert.ok(record);await repository.saveVerified(record);let calls=0;
 const lookup=createTechnicalResearchService(async()=>{calls++;throw Error('offline');},()=>Date.now()+3*86400000,repository);
 const second=await lookup(row.identity);assert.equal(second.status,'verified');assert.equal(calls,0);
 output.results.push({identity:row.identity,result,context:toResearchContext(row.identity,result),saved:await repository.findVerified(row.identity),secondStatus:second.status,offlineCalls:calls});
}
await writeFile(folder+'/revalidation.json',JSON.stringify(output,null,2));
console.log(JSON.stringify(output.results.map(r=>({identity:r.identity,scope:r.result.verification.modelScope,covered:r.result.verification.coveredModels,candidates:r.result.knowledge.causes.length,offlineCalls:r.offlineCalls}))));
