import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceDiagnosis,emptyMemory,encodeMemory,decodeMemory,isUsableDiagnosticAnswer,inferObservedTopics,extractCustomerObservations} from '../src/lib/diagnostic-state.ts';

const pool=['Eşanjör/dolaşım','Anakart','Soket/kablo','Fan'];
const memory=()=>({...emptyMemory(),candidates:pool.map(name=>({name,probability:0}))});
const assessment=(weights,topic='noise',text='Fan sesi geliyor mu?',canConclude=false)=>({
  candidateAssessments:weights.map((weight,candidateIndex)=>({candidateIndex,weight,reason:'AI gözlem değerlendirmesi'})),
  nextQuestion:{topic,text,whyThisQuestion:'Adayları ayırır'},canConclude,requiresTechnicianMeasurement:false,
});

test('AI weights pass through unchanged and names are mapped from the manufacturer pool',()=>{
  const step=advanceDiagnosis(memory(),assessment([25,25,25,25]),'E01',true);
  assert.deepEqual(step.memory.candidates.map(candidate=>candidate.probability),[25,25,25,25]);
  assert.deepEqual(step.memory.candidates.map(candidate=>candidate.name),pool);
  assert.equal(step.memory.information,0);
});
test('AI weights totaling 99 or 101 are proportionally normalized to 100',()=>{
  for(const weights of [[63,16,11,9],[65,16,11,9]]){
    const step=advanceDiagnosis(memory(),assessment(weights),'E01',true);
    const result=step.memory.candidates.map(candidate=>candidate.probability);
    const total=weights.reduce((sum,weight)=>sum+weight,0);
    assert.equal(result.reduce((sum,weight)=>sum+weight,0),100);
    for(let index=0;index<weights.length;index++){
      assert.ok(Math.abs(result[index]-weights[index]/total*100)<1e-10);
    }
    assert.deepEqual([...result].sort((a,b)=>b-a),result);
    assert.deepEqual(step.memory.candidates.map(candidate=>candidate.name),pool);
  }
});
test('strong contradiction may leave zero weight and non-bucket AI weights pass through unchanged',()=>{
  const weights=[47,29,14,0,0,10];
  const previous={...emptyMemory(),candidates:['A','B','C','D','E','F'].map(name=>({name,probability:0}))};
  const step=advanceDiagnosis(previous,assessment(weights),'E01',true);
  assert.deepEqual(step.memory.candidates.map(candidate=>candidate.probability),weights);
  assert.equal(step.memory.candidates.reduce((total,candidate)=>total+candidate.probability,0),100);
});
test('new customer evidence is retained and information rises by ten, not by candidate weight',()=>{
  const start=advanceDiagnosis(memory(),assessment([25,25,25,25]),'E01',true);
  const next=advanceDiagnosis(start.memory,assessment([40,25,20,15],'onset','Arıza ne zaman çıkıyor?'),'Fan sesi geliyor.');
  assert.equal(next.memory.information,10);
  assert.deepEqual(next.memory.candidates.map(candidate=>candidate.probability),[40,25,20,15]);
  assert.equal(next.memory.evidence[0].quote,'Fan sesi geliyor.');
});
test('unknown and repeated answers add no information or new weights',()=>{
  const start=advanceDiagnosis(memory(),assessment([25,25,25,25]),'E01',true);
  const next=advanceDiagnosis(start.memory,assessment([40,25,20,15],'onset','Arıza ne zaman çıkıyor?'),'Fan sesi geliyor.');
  assert.equal(isUsableDiagnosticAnswer(next.memory,'Bilmiyorum'),false);
  assert.equal(isUsableDiagnosticAnswer(next.memory,'Fan sesi geliyor.'),false);
  const unknown=advanceDiagnosis(next.memory,assessment([70,10,10,10],'affected','Sıcak su nasıl?'),'Bilmiyorum');
  assert.equal(unknown.memory.information,10);
  assert.deepEqual(unknown.memory.candidates,next.memory.candidates);
});
test('incomplete, duplicate, invented, negative, invalid and zero-total AI distributions fail closed',()=>{
  const base=assessment([25,25,25,25]);
  const invalid=[
    {...base,candidateAssessments:base.candidateAssessments.slice(0,3)},
    {...base,candidateAssessments:base.candidateAssessments.map(item=>({...item,candidateIndex:0}))},
    {...base,candidateAssessments:base.candidateAssessments.map((item,index)=>({...item,candidateIndex:index===3?4:index}))},
    assessment([-1,25,25,25]),assessment([NaN,25,25,25]),
    assessment([Infinity,25,25,25]),assessment([0,0,0,0]),
  ];
  for(const proposal of invalid)assert.throws(()=>advanceDiagnosis(memory(),proposal,'E01',true));
});
test('repeat topic and risky technician questions are rejected',()=>{
  const previous={...memory(),asked:['noise']};
  assert.throws(()=>advanceDiagnosis(previous,assessment([25,25,25,25]),'Fan sesi geliyor.'));
  assert.throws(()=>advanceDiagnosis(previous,assessment([25,25,25,25],'pressure','Kart pininde voltaj ölçer misiniz?'),'Fan sesi geliyor.'));
  assert.throws(()=>advanceDiagnosis(memory(),assessment([25,25,25,25],'pressure','Gaz giriş basıncını ölçtünüz mü?'),'E01',true),/Unsafe/);
});
test('semantic onset repeat is rejected even when AI changes the declared topic',()=>{
  const previous={...memory(),asked:['onset']};
  const proposal=assessment([25,25,25,25],'recurrence','Sorun ilk olarak ne zaman başladı?');
  assert.throws(()=>advanceDiagnosis(previous,proposal,'Üç gün önce başladı.'),/Repeated diagnostic topic/);
});
test('one customer observation can answer ignition sound and flame formation together',()=>{
  const observed=inferObservedTopics('Tıklama geliyor ama alev oluşmuyor.');
  assert.ok(observed.includes('ignitionSound'));
  assert.ok(observed.includes('flameFormation'));
  const previous={...memory(),evidence:[{quote:'Tıklama geliyor ama alev oluşmuyor.',topic:'volunteered'}]};
  assert.throws(()=>advanceDiagnosis(previous,assessment([25,25,25,25],'flameFormation','Alev oluşuyor mu?'),'E01',true),/Repeated diagnostic topic/);
});
test('one message yields multiple exact-quote observations without treating unknown as evidence',()=>{
  const message='Evet, ateşleme sırasında birkaç kez tıklama/çakma sesi duyuyorum ama cihaz alev almıyor.';
  const observations=extractCustomerObservations(message);
  assert.deepEqual(observations.map(item=>[item.topic,item.value]),
    [['ignitionSound','present'],['flameFormation','absent']]);
  assert.ok(observations.every(item=>message.includes(item.evidence)));
  assert.deepEqual(extractCustomerObservations('Bilmiyorum.'),[]);
  assert.deepEqual(extractCustomerObservations('Tıklama var mı bilmiyorum.'),[]);
  assert.deepEqual(extractCustomerObservations('Gaz var mı?'),[]);
});
test('gas, other appliances, clicking, absent flame and reset outcome coexist in one message',()=>{
  const message='Gaz var, ocak çalışıyor, kombi tıklıyor ama yanmıyor; resetledim yine aynı.';
  const observations=extractCustomerObservations(message);
  assert.deepEqual(observations.map(item=>item.topic),
    ['gasSupply','stoveGas','ignitionSound','flameFormation','resetOutcome']);
  const step=advanceDiagnosis(memory(),assessment([25,25,25,25],'onset','Sorun ne zaman başladı?'),message);
  assert.deepEqual(step.memory.evidence[0].observations,observations);
  assert.equal(step.memory.information,10);
});
test('AI cannot finish normally before sixty points, but may conclude after it',()=>{
  const previous={...memory(),information:20};
  const early=advanceDiagnosis(previous,assessment([70,10,10,10],'onset','Sorun ne zaman çıkıyor?',true),'Fan sesi geliyor.');
  assert.equal(early.memory.information,30);
  assert.equal(early.memory.finished,false);
  const enough=advanceDiagnosis({...previous,information:50},assessment([70,10,10,10],'onset','Sorun ne zaman çıkıyor?',true),'Fan sesi geliyor.');
  assert.equal(enough.memory.stopReason,'concluded');
});
test('technician boundary requires AI to have no customer question',()=>{
  const proposal={...assessment([25,25,25,25]),nextQuestion:null,requiresTechnicianMeasurement:true,
    technicianBoundaryReason:'Kalan ayrım yalnız teknisyen ölçümüyle yapılabilir; yararlı müşteri sorusu kalmadı.'};
  const step=advanceDiagnosis(memory(),proposal,'E01',true);
  assert.equal(step.memory.stopReason,'technician_measurement_required');
  assert.throws(()=>advanceDiagnosis(memory(),{...proposal,nextQuestion:assessment([25,25,25,25]).nextQuestion},'E01',true),/Technician boundary/);
  assert.throws(()=>advanceDiagnosis(memory(),{...proposal,technicianBoundaryReason:null},'E01',true),/Technician boundary/);
});
test('fake AI may concentrate Vaillant-like evidence without a production weighting rule',()=>{
  const names=['A ignition system','B gas valve','C gas inlet pressure','D gas shutoff valve','E gas meter','F electronics'];
  const quotes=['Gaz vanası açık.','Diğer gazlı cihazlar çalışıyor.','Ateşleme tıklaması geliyor.',
    'Alev oluşmuyor.','Reset sonrası aynı sorun tekrar ediyor.'];
  const previous={...emptyMemory(),candidates:names.map(name=>({name,probability:0})),
    evidence:quotes.map(quote=>({quote,topic:'volunteered'})),information:50};
  const proposal={...assessment([45,30,15,0,0,10]),nextQuestion:null,requiresTechnicianMeasurement:true,
    technicianBoundaryReason:'Müşterinin cevaplayabileceği ayırıcı soru kalmadı; kalan ayrım teknisyen ölçümü gerektiriyor.'};
  const step=advanceDiagnosis(previous,proposal,'Bilmiyorum');
  assert.deepEqual(step.memory.candidates.map(candidate=>candidate.name),names);
  assert.deepEqual(step.memory.candidates.map(candidate=>candidate.probability),[45,30,15,0,0,10]);
  assert.deepEqual(step.memory.evidence.map(item=>item.quote),quotes);
  assert.equal(step.memory.candidates.reduce((total,candidate)=>total+candidate.probability,0),100);
  assert.equal(step.memory.stopReason,'technician_measurement_required');
});
test('signed state cannot be changed by the browser',()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='unit-test-only';
  try{const token=encodeMemory(memory());assert.deepEqual(decodeMemory(token),memory());assert.throws(()=>decodeMemory('e30.'+token.split('.')[1]));}
  finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});
