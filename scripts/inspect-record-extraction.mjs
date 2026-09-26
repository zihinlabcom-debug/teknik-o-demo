import {readFile} from 'node:fs/promises';import {extractErrorRecords} from '../src/lib/error-record.ts';import {extractModelScopes} from '../src/lib/model-scope.ts';
const r=JSON.parse(await readFile('test-results/multibrand-generalization-v2/results.json','utf8'));
for(const row of r.results){for(const d of row.documents.filter(d=>d.readable)){
 const t=await readFile('test-results/multibrand-generalization-v2/'+d.documentFile,'utf8');
 const records=extractErrorRecords(t,row.identity.code),scopes=extractModelScopes(t,row.identity.model);
 console.log(JSON.stringify({brand:row.identity.brand,file:d.documentFile,scopes:scopes.map(s=>({id:s.id,kind:s.kind,models:s.coveredModels})),records:records.map(r=>({id:r.id,description:r.description.text,length:r.text.length,spans:r.causeSpans.length}))}));
}}
