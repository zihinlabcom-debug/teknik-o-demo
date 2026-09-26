import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {diagnose} from '../src/lib/diagnosis.ts';
import {decodeMemory} from '../src/lib/diagnostic-state.ts';

const archive=JSON.parse(readFileSync('test-results/verified-knowledge-v5/revalidation.json','utf8'));
const fixture=archive.results.find(item=>item.identity.brand==='Vaillant' && item.identity.model==='ecoTEC intro' && item.identity.code==='F.28');
if(fixture?.result.status!=='verified') throw new Error('Archived verified manufacturer fixture is missing');
const turns=[
  'kombim arızalı',
  'Vaillant',
  'ecoTEC intro',
  'F.28',
  'Hayır, bildiğim bir gaz kesintisi yok ve sayaçta da uyarı görünmüyor.',
  'Evet, birkaç kez tıkırtı geliyor ama ateşlemiyor.',
  'Hayır, herhangi bir bakım yapılmadı ve gaz kesintisi de olmadı. Kendiliğinden başladı.',
];
let history=[],stateToken;
const results=[];
const proposals=[];
for(const customer of turns){
  process.stderr.write(`Running turn ${results.length+1}: ${customer}\n`);
  let result;
  try { result=await diagnose(customer,history,stateToken,{knowledge:{identity:fixture.identity,value:fixture.result.knowledge},onProposal:proposal=>proposals.push(proposal)}); }
  catch(error) {
    mkdirSync('test-results/diagnosis-v6',{recursive:true});
    writeFileSync('test-results/diagnosis-v6/vaillant-conversation.partial.json',JSON.stringify({results,error:String(error),failedCustomer:customer},null,2));
    throw error;
  }
  stateToken=result.stateToken;
  const state=decodeMemory(stateToken);
  results.push({turn:results.length+1,customer,informationScore:result.informationProgress,
    evidence:result.diagnosticEvidence,topCandidates:state.candidates.slice().sort((a,b)=>b.probability-a.probability).slice(0,5).map(({name,probability,supports,contradicts})=>({name,probability,supports,contradicts})),
    candidateCount:state.candidates.length,candidateTotal:state.candidates.reduce((sum,candidate)=>sum+candidate.probability,0),
    nextQuestionOrStop:result.aiText,stopReason:result.stopReason,questionRationale:result.questionRationale,
    assessmentComplete:result.assessmentComplete,researchStatus:result.researchStatus,manufacturerSource:result.technicalSource?.url});
  history.push({role:'user',content:customer},{role:'assistant',content:result.aiText});
  process.stderr.write(`Turn ${results.length}: score ${result.informationProgress}, reply ${result.aiText}\n`);
}
assert.deepEqual(results.map(result=>result.informationScore),[0,0,0,0,10,20,30]);
assert(results[6].evidence.some(item=>item.quote.includes('tıkırtı geliyor ama ateşlemiyor')));
assert.equal(results[6].assessmentComplete,false);
assert.match(results[6].nextQuestionOrStop,/\?/);
assert.equal(results[6].candidateCount,fixture.result.knowledge.causes.length);
assert(results.slice(3).every(result=>result.candidateTotal===100 && result.manufacturerSource===fixture.result.knowledge.source.url));
mkdirSync('test-results/diagnosis-v6',{recursive:true});
writeFileSync('test-results/diagnosis-v6/vaillant-conversation.json',JSON.stringify(results,null,2));
writeFileSync('test-results/diagnosis-v6/vaillant-model-proposals.json',JSON.stringify(proposals,null,2));
process.stdout.write(JSON.stringify(results,null,2));
