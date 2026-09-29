import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deduplicateSourceCandidates} from '../src/lib/boiler-candidate-dedup.ts';
import {selectCandidatePool,consensusQuestionEffects,calculateBoilerWeights} from '../src/lib/boiler-probability.ts';
import {matchesBoilerErrorCode,isBoilerErrorCode} from '../src/lib/boiler-error-code.ts';
import {diagnoseBoiler,decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {generalAI,signedGeneral} from './helpers/stage3-general-runtime.mjs';
import {withCopaRepository} from './helpers/copa-stage3-runtime.mjs';
const data=JSON.parse(readFileSync(new URL('./fixtures/stage3-blockers.json',import.meta.url),'utf8'));
const run=callback=>withCopaRepository(callback,{data});
const synthetic=(id,name,description,action)=>({id,candidate_name:name,fault_class:'sensor',family_id:'f',official_model_id:'m',error_code:'E1',
 is_active:true,verification_status:'verified',official_error_record_id:1,evidence_note:`description support: "${description}"; action support: "${action}"`,
 evidence_url:'https://manufacturer.test/manual',sourceRecord:{id:1,official_description:description,official_action:action,source_url:'https://manufacturer.test/manual'}});

for(const [brand,model,code,count] of [['Vaillant','ecoTEC intro VUW 24/28 AS/1-1','F78',1],
 ['Vaillant','ecoTEC intro VUW 24/28 AS/1-1','F83',2],['Ariston','microGENUS II / HE 24/28/31/32 MFFI','A99',2]]){
 test(`source point is counted once and all provenance retained: ${brand} ${code}`,()=>run(async repo=>{
  const device=await repo.resolveDevice(brand,model),all=await repo.getCandidates(device.familyId);
  const physical=all.filter(c=>matchesBoilerErrorCode(c.error_code,code)&&c.official_model_id===device.officialModelId);
  const pool=selectCandidatePool(all,device.familyId,device.officialModelId,code).candidates;
  assert.equal(pool.length,count);
  assert.deepEqual(new Set(pool.flatMap(c=>c.sourceCandidateIds??[c.id])),new Set(physical.map(c=>c.id)));
  assert.ok(pool.flatMap(c=>c.sourceEvidence??[]).every(e=>e.evidence_note&&e.evidence_url));
  assert.equal(calculateBoilerWeights(pool,[],[]).reduce((sum,c)=>sum+Math.round(c.probability*100),0),10000);
 }));
}
test('different physical sensors and source records cannot be blanket merged',()=>{
 const description='Gidiş NTC ve dönüş NTC kontrol edilir.',action='İki ayrı sensör ve bağlantısı kontrol edilir.';
 const rows=[synthetic('g','Gidiş sıcaklık sensörü sorunu',description,action),synthetic('d','Dönüş sıcaklık sensörü sorunu',description,action),synthetic('u','Sensör sorunu',description,action)];
 assert.equal(deduplicateSourceCandidates(rows).length,3);
 const others=[synthetic('a','Sensör sorunu','NTC arızası','NTC kontrol edilir.'),{...synthetic('b','Sıcaklık sensörü sorunu','NTC arızası','NTC kontrol edilir.'),official_error_record_id:2}];
 assert.equal(deduplicateSourceCandidates(others).length,2);
 const ports=[synthetic('a','Sensör sorunu','S1 sensörü arızası','S1 sensörü kontrol edilir.'),synthetic('b','Sıcaklık sensörü sorunu','S2 NTC arızası','S2 NTC kontrol edilir.')];
 assert.equal(deduplicateSourceCandidates(ports).length,2);
 const connection=(id,name)=>({...synthetic(id,name,'X1 soket arızası.','X2 kablo bağlantısını kontrol edin.'),fault_class:'electrical'});
 assert.equal(deduplicateSourceCandidates([connection('x1','X1 soket sorunu'),connection('x2','X2 kablo bağlantısı sorunu')]).length,2);
});
test('existing plus new batch is deduplicated together and operation is idempotent',()=>{
 const d='NTC sıcaklık dalgalanması hatası',a='Sensörün boruya teması kontrol edilir.';
 const old=[synthetic('general','Sensör sorunu',d,a)],added=[synthetic('specific','Sıcaklık sensörü sorunu',d,a)];
 const merged=deduplicateSourceCandidates([...old,...added]);assert.equal(merged.length,1);
 assert.equal(merged[0].candidate_name,'Sıcaklık sensörü sorunu');
 assert.deepEqual(new Set(merged[0].sourceCandidateIds),new Set(['general','specific']));
 assert.equal(merged[0].sourceEvidence.length,2);assert.deepEqual(deduplicateSourceCandidates(merged),merged);
});
test('short evidence phrases never merge distinct source sensor ids or electronic points',()=>{
 const d='S1 sensörü arızası.',a='S2 NTC sensörünü kontrol edin.';
 const parent=synthetic('general','Sensör sorunu',d,a),child=synthetic('specific','Sıcaklık sensörü sorunu',d,a);
 parent.evidence_note='description support: "sensörü"';child.evidence_note='action support: "NTC"';
 assert.equal(deduplicateSourceCandidates([parent,child]).length,2);
 const pressure=synthetic('pressure','Sensör sorunu','Su basınç sensörü arızası.','NTC sensörünü kontrol edin.'),temperature=synthetic('temperature','Sıcaklık sensörü sorunu','Su basınç sensörü arızası.','NTC sensörünü kontrol edin.');
 pressure.evidence_note='description support: "sensörü"';temperature.evidence_note='action support: "NTC"';
 assert.equal(deduplicateSourceCandidates([pressure,temperature]).length,2);
 const electronic=(id,name)=>({...synthetic(id,name,'Elektronik kontrol problemi.','Ana kartı ve ayrı ekran kontrol ünitesini kontrol edin.'),fault_class:'electronic'});
 assert.equal(deduplicateSourceCandidates([electronic('e','Elektronik kontrol sistemi sorunu'),electronic('pcb','Elektronik kart/kontrol ünitesi sorunu'),electronic('display','Ekran kontrol ünitesi sorunu')]).length,3);
});
test('a named parent only aliases the same sensor id in a multi-point source',()=>{
 const d='S1 gidiş NTC arızası.',a='S2 NTC sensörünü kontrol edin.';
 const first=synthetic('first','Gidiş sıcaklık sensörü sorunu',d,a),parent=synthetic('parent','Sensör sorunu',d,a),child=synthetic('child','Sıcaklık sensörü sorunu',d,a);
 first.evidence_note=`description support: "${d}"`;parent.evidence_note=child.evidence_note=`action support: "${a}"`;
 const rows=deduplicateSourceCandidates([first,parent,child]);assert.equal(rows.length,2);
 assert.deepEqual(rows.find(c=>c.id==='child').sourceCandidateIds,['child','parent']);
});
test('alias effects retain support without doubling; conflict is neutral; variant missing stays neutral',()=>{
 const rows=deduplicateSourceCandidates([synthetic('g','Sensör sorunu','NTC arızası','NTC kontrol edilir.'),synthetic('s','Sıcaklık sensörü sorunu','NTC arızası','NTC kontrol edilir.')]);
 const e={id:'effect-original',candidate_id:'g',question_id:'q',answer_key:'yes',effect:'support',evidence_note:'original evidence',source_url:'https://manufacturer.test/manual'};
 let result=consensusQuestionEffects(rows,[e]);assert.equal(result.length,1);assert.equal(result[0].effect,'support');assert.equal(result[0].sourceEffects[0].id,e.id);
 result=consensusQuestionEffects(rows,[e,{...e,candidate_id:'s',effect:'weaken'}]);assert.equal(result[0].effect,'neutral');assert.equal(result[0].sourceEffects.length,2);
 const variants=[{...rows[0],sourceCandidateIds:['g','s','v2'],sourceCandidateGroups:[['g','s'],['v2']]}];
 assert.equal(consensusQuestionEffects(variants,[e])[0].effect,'neutral');
});
test('family consensus preserves source notes across every variant and alias',()=>{
 const pair=(model,id)=>[synthetic(id+'g','Sensör sorunu','NTC arızası','NTC kontrol edilir.'),synthetic(id+'s','Sıcaklık sensörü sorunu','NTC arızası','NTC kontrol edilir.')]
   .map(c=>({...c,official_model_id:model}));
 const pool=selectCandidatePool([...pair('m1','one'),...pair('m2','two')],'f',null,'E1',['m1','m2']);
 assert.equal(pool.mode,'family_code_consensus');assert.equal(pool.candidates.length,1);
 assert.equal(pool.candidates[0].sourceCandidateGroups.length,2);assert.equal(pool.candidates[0].sourceEvidence.length,4);
 const effects=[{candidate_id:'oneg',question_id:'q',answer_key:'yes',effect:'support'},
   {candidate_id:'twos',question_id:'q',answer_key:'yes',effect:'support'}];
 const merged=consensusQuestionEffects(pool.candidates,effects);assert.equal(merged[0].effect,'support');
 assert.equal(merged[0].sourceEffects.length,2);
});
test('code grammar supports 1P1 and explicit alternatives without splitting main/subcodes',()=>{
 for(const code of ['1P1','F76','F.76','F 76','EA','C47/F47','6A/227'])assert.ok(isBoilerErrorCode(code),code);
 for(const word of ['hatasi','hata','veriyor'])assert.equal(isBoilerErrorCode(word),false);
 assert.ok(matchesBoilerErrorCode('C47/F47','C47'));assert.ok(matchesBoilerErrorCode('C47/F47','F47'));
 assert.ok(matchesBoilerErrorCode('6A/227','6A/227'));assert.equal(matchesBoilerErrorCode('6A/227','6A'),false);
 assert.equal(matchesBoilerErrorCode('6A/227','227'),false);assert.equal(matchesBoilerErrorCode('C47/F47','47'),false);
});
for(const [brand,model,code,n] of [['Ariston','CLAS ONE / CLAS ONE SYSTEM','1P1',7],['E.C.A.','Citius Premix','F47',1],['E.C.A.','Citius Premix','C47',1]]){
 test(`real repository/diagnosis reaches catalog pool: ${brand} ${code}`,()=>signedGeneral(()=>run(async repo=>{
  const result=await diagnoseBoiler(`${brand} ${model} ${code} hatası`,[],null,repo,generalAI({brand,model,errorCode:'Hatası'}));
  const state=decodeBoilerState(result.stateToken);assert.equal(state.errorCode,code);assert.equal(state.pendingIdentity,null);
  assert.equal(result.candidateProbabilities.length,n);assert.ok(state.officialModelId);
 })));
}
async function timingFlow(repo,reply,historyStory=null){
 const identity={brand:'Demirdokum',model:'nitromix',errorCode:'F76'},ai=generalAI(identity);
 ai.classifyAnswer=async(q)=> q.question_key==='fault_timing_after_start'?'unknown':'no';ai.chooseQuestion=async({questions})=>(questions.find(q=>q.question_key==='display_temperature_rise')??questions[0])?.id??null;
 const first=await diagnoseBoiler('Demirdokum nitromix F76',[],null,repo,ai);
 const second=await diagnoseBoiler('Hayır',[],first.stateToken,repo,ai);
 const third=await diagnoseBoiler('Hayır',[],second.stateToken,repo,ai);
 const previous=historyStory?await diagnoseBoiler(historyStory,[],third.stateToken,repo,ai):third;
 return diagnoseBoiler(reply,[],previous.stateToken,repo,ai);
}
for(const reply of ['Resetten sonra hemen tekrar geliyor.','başlar başlamaz','Şimdi sürekli, hemen hata veriyor.']){
 test('ambiguous/reset/persistent immediate never earns automatic startup wiring support: '+reply,()=>signedGeneral(()=>run(async repo=>{
  const result=await timingFlow(repo,reply),state=decodeBoilerState(result.stateToken);
  assert.equal(state.timeline.current.timing,'immediate');
  assert.ok(result.candidateProbabilities.every(c=>c.probability<34));
 })));
}
test('previous successful run and reset recurrence remain neutral across stateToken-only turns',()=>signedGeneral(()=>run(async repo=>{
 const story='bir süre çalıştıktan sonra veriyordu, reset atınca düzeliyordu ama sonra tekrar ediyordu; en son sürekli vermeye başladı';
 const result=await timingFlow(repo,'hemen tekrar geliyor',story),state=decodeBoilerState(result.stateToken);
 assert.equal(state.timeline.current.timing,'immediate');assert.equal(state.timeline.historical.length,3);
 assert.ok(result.candidateProbabilities.every(c=>c.probability<34));assert.equal(state.totalAskedQuestions,4);
})));
test('explicit true first/cold startup retains the existing source-backed startup effect',()=>signedGeneral(()=>run(async repo=>{
 const result=await timingFlow(repo,'Cihaz tamamen soğukken ilk çalıştırmada, hiç ısı vermeden başlar başlamaz hata veriyor.');
 assert.equal(decodeBoilerState(result.stateToken).timeline.startupContext,'first_cold_start');
 assert.equal(result.candidateProbabilities.find(c=>/Kablolama/.test(c.name)).probability,50);
})));
test('previous successful run prevents a later cold-start phrase from authorizing startup support',()=>signedGeneral(()=>run(async repo=>{
 const result=await timingFlow(repo,'Cihaz soğukken ilk çalıştırmada hemen hata veriyor.','Daha önce normal çalışıyordu.');
 assert.equal(decodeBoilerState(result.stateToken).timeline.startupContext,'recurrence');
 assert.ok(result.candidateProbabilities.every(c=>c.probability<34));
})));
