import {readFile,writeFile} from 'node:fs/promises';
import {readManufacturerDocument,sourceContains} from '../src/lib/manufacturer-document.ts';
import {validateManufacturerEvidence,modelScopeMatches} from '../src/lib/manufacturer-evidence.ts';
const results=JSON.parse(await readFile('test-results/technical-research-live.json','utf8'));
for(const row of results) {
 const r=row.events?.find(e=>e.raw?.errorRecord)?.raw;if(!r)continue;
 const doc=await readManufacturerDocument(r.url,u=>new URL(u).hostname===new URL(r.url).hostname);
 await writeFile('test-results/'+row.identity.brand.toLowerCase()+'-evidence-document.txt',doc.text);
 console.log(JSON.stringify({brand:row.identity.brand,valid:validateManufacturerEvidence(row.identity,r,doc.text),scope:modelScopeMatches(row.identity.model,r,doc.text),model:sourceContains(doc.text,r.modelEvidence),record:sourceContains(doc.text,r.errorRecord),code:sourceContains(r.errorRecord,r.codeEvidence),candidates:r.candidates.map(c=>({name:c.name,present:sourceContains(r.errorRecord,c.basis)})),cover:doc.text.slice(0,500)}));
}
