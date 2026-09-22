import { researchManufacturer, researchKey } from '../src/lib/technical-research.ts';
import { diagnose } from '../src/lib/diagnosis.ts';
import { decodeMemory, encodeMemory, emptyMemory } from '../src/lib/diagnostic-state.ts';
import { writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
if(process.argv.includes('--chat')) {
  const records=JSON.parse(await readFile('test-results/technical-research-live.json','utf8'));
  for(const record of records) {
    if(process.argv.includes('--bosch') && record.identity.brand!=='Bosch') continue;
    assert.equal(record.status,'verified');
    const memory={...emptyMemory(),poolKey:researchKey(record.identity),technicalKnowledge:record.knowledge};
    const firstMessage=`Marka: ${record.identity.brand}. Model: ${record.identity.model}. Hata kodu: ${record.identity.code}.`;
    const first=await diagnose(firstMessage,[],encodeMemory(memory));
    const before=decodeMemory(first.stateToken);
    console.log(JSON.stringify({identity:record.identity,reply:first.aiText,status:first.researchStatus,progress:first.informationProgress,finished:first.assessmentComplete,poolKey:before.poolKey}));
    assert.ok(first.aiText.endsWith('?'));
    assert.equal(first.informationProgress,10);
    assert.equal(before.candidates.reduce((s,c)=>s+c.probability,0),100);
    assert.ok(before.candidates.every(c=>record.knowledge.causes.includes(c.name)));
    const history=[{role:'user',content:firstMessage},{role:'assistant',content:first.aiText}];
    const unknown=await diagnose('bilmiyorum',history,first.stateToken);
    const after=decodeMemory(unknown.stateToken);
    assert.deepEqual(after.candidates,before.candidates);
    assert.equal(after.information,before.information);
    assert.notEqual(unknown.aiText,first.aiText);
    console.log(JSON.stringify({identity:record.identity,question:first.aiText,afterUnknown:unknown.aiText,information:after.information,candidateCount:after.candidates.length,total:100}));
  }
  process.exit(0);
}
const identities=[{brand:'Vaillant',model:'ecoTEC intro',code:'F.28'}, {brand:'Bosch',model:'Condens 2500 W',code:'EA'}];
const results=[];
for(const identity of identities) {
 const events=[];
 try {const result=await researchManufacturer(identity,(raw,urls)=>{events.push({raw,urls});console.log(JSON.stringify({audit:identity,raw,urls}));});results.push({identity,...result,events});}
 catch(error){results.push({identity,status:'error',message:error.message,events});}
 await writeFile('test-results/technical-research-live.json',JSON.stringify(results,null,2));
}
if(results.some(r=>r.status!=='verified')) process.exitCode=1;
