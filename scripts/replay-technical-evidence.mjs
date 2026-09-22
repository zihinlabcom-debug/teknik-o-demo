import {readFile,writeFile} from 'node:fs/promises';
import {validateResearch} from '../src/lib/technical-research.ts';
const rows=JSON.parse(await readFile('test-results/technical-research-live.json','utf8'));
const checks=[];
for(const row of rows){
 const report=row.events.findLast(e=>e.raw?.errorRecord)?.raw;
 const review=row.events.findLast(e=>e.raw?.stage==='entailment')?.raw.review;
 const text=await readFile('test-results/'+row.identity.brand.toLowerCase()+'-evidence-document.txt','utf8');
 const result=validateResearch(row.identity,report,[report.url],{text,review});
 checks.push({identity:row.identity,liveStatus:row.status,finalValidatorStatus:result.status,candidates:result.knowledge?.causes.length??0});
}
console.log(JSON.stringify(checks,null,2));
await writeFile('test-results/technical-research-final-validation.json',JSON.stringify(checks,null,2));
if(checks.some(c=>c.finalValidatorStatus!=='verified'))process.exitCode=1;
