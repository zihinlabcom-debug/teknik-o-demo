// Offline dry-run against an immutable GET-only technical snapshot. No network.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {deduplicateSourceCandidates} from '../src/lib/boiler-candidate-dedup.ts';
import {calculateBoilerWeights,consensusQuestionEffects,selectCandidatePool} from '../src/lib/boiler-probability.ts';
import {normalizeBoilerErrorCode} from '../src/lib/boiler-error-code.ts';
import {buildBoilerGroups} from '../src/lib/boiler-groups.ts';
import {decodeBoilerState,diagnoseBoiler} from '../src/lib/boiler-diagnosis.ts';
import {withCopaRepository} from '../tests/helpers/copa-stage3-runtime.mjs';
import {generalAI,signedGeneral} from '../tests/helpers/stage3-general-runtime.mjs';
const dir='test-results/stage3-blocker-fixes';mkdirSync(dir,{recursive:true});
const snapshot=JSON.parse(readFileSync('test-results/stage3-closure-audit/live-catalog.json','utf8'));
const inventory=JSON.parse(readFileSync('test-results/stage3-closure-audit/inventory.json','utf8'));
const t=snapshot.tables,rawById=new Map(t.official_error_codes_raw.map(r=>[r.id,r]));
const rows=t.boiler_fault_candidates.filter(c=>c.is_active&&c.verification_status==='verified').map(c=>({...c,sourceRecord:rawById.get(c.official_error_record_id)}));
const byRaw=new Map(),byCandidate=new Map();
for(const c of rows)byRaw.set(c.official_error_record_id,[...(byRaw.get(c.official_error_record_id)??[]),c]);
for(const e of t.boiler_question_effects)byCandidate.set(e.candidate_id,[...(byCandidate.get(e.candidate_id)??[]),e]);
const merged=deduplicateSourceCandidates(rows),changed=merged.filter(c=>c.sourceCandidateIds?.length>1);
assert.deepEqual(new Set(merged.flatMap(c=>c.sourceCandidateIds??[c.id])),new Set(rows.map(c=>c.id)));
let checkedPools=0,checkedEffects=0;const poolChanges=[];
for(const p of inventory.pools.filter(p=>p.candidateCount)){
 const physical=p.rawIds.flatMap(id=>byRaw.get(id)??[]),logical=deduplicateSourceCandidates(physical);
 const effects=physical.flatMap(c=>byCandidate.get(c.id)??[]);
 const remapped=consensusQuestionEffects(logical,effects);
 assert.deepEqual(new Set(remapped.flatMap(e=>e.sourceEffects.map(s=>s.id))),new Set(effects.map(e=>e.id)));
 const assessments=calculateBoilerWeights(logical,[],remapped),groups=buildBoilerGroups(logical,assessments,p.fuel);
 assert.equal(assessments.reduce((s,c)=>s+Math.round(c.probability*100),0),10000);
 assert.equal(groups.reduce((s,g)=>s+Math.round(g.probability*100),0),10000);
 assert.equal(groups.flatMap(g=>g.candidateIds).length,logical.length);
 if(logical.length!==physical.length)poolChanges.push({brand:p.brand,model:p.model,code:p.code,before:physical.length,after:logical.length,
  beforeGroups:p.groups,afterGroups:groups,sourcePoints:logical.filter(c=>c.sourceCandidateIds).map(c=>({id:c.id,name:c.candidate_name,ids:c.sourceCandidateIds,evidence:c.sourceEvidence}))});
 checkedPools++;checkedEffects+=effects.length;
}
const familyCases=[['Vaillant','ecoTEC intro VUW 24/28 AS/1-1','F78'],['Vaillant','ecoTEC intro VUW 24/28 AS/1-1','F83'],['Ariston','microGENUS II / HE 24/28/31/32 MFFI','A99']];
const beforeAfter=familyCases.map(([brand,model,code])=>{
 const p=inventory.pools.find(p=>p.brand===brand&&p.model===model&&normalizeBoilerErrorCode(p.code)===code);
 const physical=p.rawIds.flatMap(id=>byRaw.get(id)??[]),logical=deduplicateSourceCandidates(physical);
 return {brand,model,code,before:calculateBoilerWeights(physical,[],[]),after:calculateBoilerWeights(logical,[],[]),
  beforeGroups:p.groups,afterGroups:buildBoilerGroups(logical,calculateBoilerWeights(logical,[],[]),p.fuel)};
});
const data=JSON.parse(readFileSync('tests/fixtures/stage3-blockers.json','utf8')),runtime=[];
await signedGeneral(()=>withCopaRepository(async repo=>{
 for(const [brand,model,errorCode] of [['Ariston','CLAS ONE / CLAS ONE SYSTEM','1P1'],['E.C.A.','Citius Premix','F47'],['E.C.A.','Citius Premix','C47']]){
  const result=await diagnoseBoiler(`${brand} ${model} ${errorCode} hatası`,[],null,repo,generalAI({brand,model,errorCode:'Hatası'}));
  const state=decodeBoilerState(result.stateToken);
  // Frozen 3f08a94 parser + strict lookup predicate, replayed on the same scope.
  const baselineParserAccepted=/^(?:[A-Za-z]{1,3}[.\s-]?\d{1,3}|\d{1,3}[A-Za-z]{1,2}|\d(?:[. -]?\d){0,3}|[A-Za-z]{2})$/.test(errorCode);
  const scoped=rows.filter(c=>c.family_id===state.familyId&&(c.official_model_id===state.officialModelId||c.official_model_id===null));
  const baselineExactPool=scoped.filter(c=>c.error_code&&normalizeBoilerErrorCode(c.error_code)===normalizeBoilerErrorCode(errorCode));
  const baselineCandidates=baselineParserAccepted?(baselineExactPool.length||scoped.filter(c=>c.error_code===null).length):0;
  runtime.push({brand,model,errorCode,baselineParserAccepted,baselineExactCatalogCandidates:baselineExactPool.length,baselineCandidates,
    detectedCode:state.errorCode,candidates:result.candidateProbabilities,state:result.resultState,modelId:state.officialModelId});
 }
 const ai=generalAI({brand:'Demirdokum',model:'nitromix',errorCode:'F76'});
 ai.classifyAnswer=async()=> 'no';ai.chooseQuestion=async({questions})=>(questions.find(q=>q.question_key==='display_temperature_rise')??questions[0])?.id??null;
 const first=await diagnoseBoiler('Demirdokum nitromix F76',[],null,repo,ai);
 const second=await diagnoseBoiler('Hayır',[],first.stateToken,repo,ai),third=await diagnoseBoiler('Hayır',[],second.stateToken,repo,ai);
 const story='bir süre çalıştıktan sonra veriyordu, reset atınca düzeliyordu ama sonra tekrar ediyordu; en son sürekli vermeye başladı';
 const fourth=await diagnoseBoiler(story,[],third.stateToken,repo,ai);
 for(const [kind,message,prior] of [['reset_recurrence','hemen tekrar geliyor',fourth],
  ['first_cold_start','Cihaz tamamen soğukken ilk çalıştırmada, hiç ısı vermeden başlar başlamaz hata veriyor.',third],
  ['ambiguous','başlar başlamaz',third],['after_running','bir süre çalışıyor sonra veriyor',fourth]]){
  const result=await diagnoseBoiler(message,[],prior.stateToken,repo,ai),state=decodeBoilerState(result.stateToken);
  runtime.push({kind,brand:state.brand,model:state.model,errorCode:state.errorCode,timeline:state.timeline,questionCount:state.totalAskedQuestions,
   candidates:result.candidateProbabilities,state:result.resultState,aiText:result.aiText});
 }
 // Raw family consensus ids still include alias ids without treating aliases as variants.
 const d=await repo.resolveDevice('Demirdokum','nitromix'),all=await repo.getCandidates(d.familyId);
 assert.equal(selectCandidatePool(all,d.familyId,null,'F76',await repo.getErrorCodeModelIds(d.familyId,'F76')).candidates.length,3);
},{data}));
const report={mode:'Offline dry-run, original live technical snapshot; no live OpenAI/DB calls',snapshotAt:snapshot.capturedAt,
 physicalBefore:rows.length,logicalAfter:merged.length,aliasRowsNotDoubleCounted:rows.length-merged.length,
 logicalPointsWithAliases:changed.length,allPhysicalSourceIdsPreserved:true,allEffectIdsPreserved:true,
 checkedPools,checkedEffects,unchangedPools:checkedPools-poolChanges.length,changedPools:poolChanges.length,
 beforeAfter,runtime,poolChanges,liveDatabaseWrites:0,liveOpenAICalls:0,migrationRequired:false};
writeFileSync(dir+'/dry-run.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,beforeAfter:beforeAfter.map(r=>({brand:r.brand,code:r.code,before:r.before.map(c=>[c.candidateName,c.probability]),after:r.after.map(c=>[c.candidateName,c.probability])})),runtime:runtime.map(r=>({code:r.errorCode,kind:r.kind,candidates:r.candidates,state:r.state})),poolChanges:undefined},null,2));
