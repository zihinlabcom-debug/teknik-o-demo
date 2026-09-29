// Offline source/effect audit over the preserved technical snapshot.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {classifyServiceCategory} from '../src/lib/service-categories.ts';
import {diagnoseBoiler,decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {selectCandidatePool,consensusQuestionEffects,calculateBoilerWeights,eligibleQuestions} from '../src/lib/boiler-probability.ts';
import {reviewedBoilerEffects,reviewedBoilerQuestions} from '../src/lib/boiler-effects.ts';
import {questionDiscrimination,boilerTechnicalGroup} from '../src/lib/boiler-groups.ts';
import {withCopaRepository} from '../tests/helpers/copa-stage3-runtime.mjs';
import {generalAI,signedGeneral} from '../tests/helpers/stage3-general-runtime.mjs';
const phase=process.argv[2]??'baseline',dir='test-results/free-text-relevance';mkdirSync(dir,{recursive:true});
const snapshot=JSON.parse(readFileSync('test-results/stage3-closure-audit/live-catalog.json','utf8')),t=snapshot.tables;
const data={families:t.boiler_model_families,models:t.boiler_official_models,aliases:t.boiler_model_aliases,raw:t.official_error_codes_raw,
 candidates:t.boiler_fault_candidates,questions:t.boiler_diagnostic_questions,effects:t.boiler_question_effects};
const report={phase,snapshotAt:snapshot.capturedAt,classification:[],cases:[],network:'memory-only Supabase transport; fake AI; no live writes/calls'};
for(const message of ['Ariston CLAS ONE 1P1 hatası veriyor','Demirdöküm nitromiX F76 hatası veriyor','Bosch Condens 2500 EA hatası veriyor',
 'Vaillant ecoTEC intro F28','3+1 evi boyatmak istiyorum','evimi taşıyacağım','koltuklarımı yıkatacağım','halılarımı yıkatacağım','Yardım istiyorum'])
 report.classification.push({message,category:classifyServiceCategory(message)});
await signedGeneral(()=>withCopaRepository(async repo=>{
 for(const identity of [{brand:'Ariston',model:'CLAS ONE / CLAS ONE SYSTEM',errorCode:'1P1'},
   {brand:'DemirDöküm',model:'nitromiX',errorCode:'F76'}]){
  const device=await repo.resolveDevice(identity.brand,identity.model),all=await repo.getCandidates(device.familyId);
  const pool=selectCandidatePool(all,device.familyId,device.officialModelId,identity.errorCode,
    await repo.getErrorCodeModelIds(device.familyId,identity.errorCode));
  let questions=await repo.getQuestions();const rawEffects=await repo.getEffects(pool.candidates.flatMap(c=>c.sourceCandidateIds??[c.id]));
  const effects=reviewedBoilerEffects(pool.candidates,questions,consensusQuestionEffects(pool.candidates,
    reviewedBoilerEffects(all,questions,rawEffects)));
  questions=reviewedBoilerQuestions(pool.candidates,questions,effects);
  const initial=calculateBoilerWeights(pool.candidates,[],effects);
  const eligible=eligibleQuestions(questions,effects,pool.candidates.map(c=>c.id),[],[]);
  const values=questionDiscrimination(pool.candidates,initial,eligible,effects);
  const audit=questions.map(q=>({key:q.question_key,text:q.question_text,evidenceGroup:q.evidence_group,priority:q.priority,
    options:q.answer_options,safety:q.is_safety_question,eligible:eligible.some(e=>e.id===q.id),value:values[q.id]??null,
    changedCandidates:new Set(effects.filter(e=>e.question_id===q.id&&e.effect!=='neutral').map(e=>e.candidate_id)).size,
    answers:(q.answer_options??[]).map(answer=>({answer,
      distribution:calculateBoilerWeights(pool.candidates,[{questionId:q.id,evidenceGroup:q.evidence_group,answerKey:answer}],effects).map(a=>({name:a.candidateName,p:a.probability})),
      mapping:pool.candidates.map(c=>({name:c.candidate_name,effect:effects.find(e=>e.question_id===q.id&&e.answer_key===answer&&e.candidate_id===c.id)?.effect??'neutral'}))})),
    originalEffects:rawEffects.filter(e=>e.question_id===q.id)}));
  const ai=generalAI(identity);ai.classifyAnswer=async q=>q.is_safety_question?'no':'unknown';
  const selections=[];ai.chooseQuestion=async input=>{
    const q=[...input.questions].sort((a,b)=>b.priority-a.priority)[0];
    selections.push({chosen:q.question_key,available:input.questions.map(q=>({key:q.question_key,priority:q.priority,value:input.questionValue[q.id]}))});return q.id;
  };
  const trace=[];let result=await diagnoseBoiler(`${identity.brand} ${identity.model} ${identity.errorCode} hatası`,[],null,repo,ai);
  for(let step=0;step<5;step++){
    const state=decodeBoilerState(result.stateToken),q=questions.find(q=>q.id===state.pendingQuestionId);
    trace.push({step:step+1,question:q?.question_key??null,text:result.aiText,state:result.resultState,count:state.totalAskedQuestions,
      probabilities:result.candidateProbabilities});
    if(state.finished||!q)break;
    result=await diagnoseBoiler(q.is_safety_question?'Hayır':'Bilmiyorum',[],result.stateToken,repo,ai);
  }
  report.cases.push({identity,device,mode:pool.mode,
    sourceRecords:data.raw.filter(r=>pool.candidates.some(c=>(c.sourceCandidateIds??[c.id]).some(id=>data.candidates.find(c=>c.id===id)?.official_error_record_id===r.id))),
    candidates:pool.candidates.map(c=>({id:c.id,name:c.candidate_name,class:c.fault_class,group:boilerTechnicalGroup(c),
      evidenceNote:c.evidence_note,sourceUrl:c.evidence_url,sourceRecordId:c.official_error_record_id,
      sourceEvidence:c.sourceEvidence??null})),
    questions:audit,selections,firstFive:trace});
 }
},{data}));
writeFileSync(`${dir}/${phase}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({phase,classification:report.classification,cases:report.cases.map(c=>({identity:c.identity,mode:c.mode,
 questions:c.questions.filter(q=>q.eligible||q.safety).map(q=>({key:q.key,changed:q.changedCandidates})),firstFive:c.firstFive.map(s=>s.question)}))},null,2));
