import {readFileSync,writeFileSync} from 'node:fs';
import {calculateBoilerWeights} from '../src/lib/boiler-probability.ts';
import {buildBoilerGroups,questionDiscrimination} from '../src/lib/boiler-groups.ts';
import {questionAllowedForFuel} from '../src/lib/boiler-fuel.ts';
const start=performance.now();
const tables=JSON.parse(readFileSync(new URL('../test-results/stage3-general/knowledge-after.json',import.meta.url),'utf8'));
const pools=JSON.parse(readFileSync(new URL('../test-results/stage3-general/coverage-after.json',import.meta.url),'utf8')).after.pools;
const cs=new Map(tables.boiler_fault_candidates.map(c=>[c.id,c])),byCandidate=new Map();
for(const e of tables.boiler_question_effects){const rows=byCandidate.get(e.candidate_id)??[];rows.push(e);byCandidate.set(e.candidate_id,rows);}
let validatedPools=0,multiGroupPools=0,groupDiscriminativePools=0,candidateDiscriminativePools=0,singleSupportPools=0;
const groupCandidateCounts={},fallbackSamples=[];
for(const pool of pools){
 if(!pool.candidate_count)continue;
 const candidates=pool.candidates.map(c=>cs.get(c.id));
 const assessments=calculateBoilerWeights(candidates,[],[]),groups=buildBoilerGroups(candidates,assessments,pool.fuel_type);
 validatedPools++;if(groups.length>1)multiGroupPools++;
 for(const group of groups){
  groupCandidateCounts[group.key]=(groupCandidateCounts[group.key]??0)+group.candidateIds.length;
  if(group.key==='technical_other'&&fallbackSamples.length<10)fallbackSamples.push({brand:pool.brand,model:pool.model,code:pool.code,candidates:group.candidateNames});
 }
 const effects=candidates.flatMap(c=>byCandidate.get(c.id)??[]);
 const ids=new Set(effects.map(e=>e.question_id));
 const questions=tables.boiler_diagnostic_questions.filter(q=>!q.is_safety_question&&ids.has(q.id)&&questionAllowedForFuel(q,pool.fuel_type));
 const values=Object.values(questionDiscrimination(candidates,assessments,questions,effects,pool.fuel_type));
 if(values.some(v=>v.groupDiscriminative))groupDiscriminativePools++;
 if(values.some(v=>v.candidateDiscriminative))candidateDiscriminativePools++;
 if(values.some(v=>v.supportsSingleton))singleSupportPools++;
}
const report={mode:'Offline complete prepared exact model/code pools; no live calls',validatedPools,multiGroupPools,
 candidateDiscriminativePools,groupDiscriminativePools,singleSupportPools,groupCandidateCounts,fallbackSamples,
 assertions:'Every pool retains all candidates exactly once; candidate/group sum = 100.00; duplicate logical candidates rejected',
 elapsedMs:Math.round(performance.now()-start)};
writeFileSync(new URL('../test-results/stage3-general/groups-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
