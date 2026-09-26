import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnose} from '../src/lib/diagnosis.ts';
import {decodeMemory} from '../src/lib/diagnostic-state.ts';

const identity={brand:'Test Marka',model:'Test Model',code:'E01'};
const names=['Eşanjör/dolaşım','Anakart','Soket/kablo','Fan'];
const knowledge={code:'E01',meaning:'Test arıza kaydı',causes:names,parts:[],questions:[],questionIds:[],page:1,
  source:{title:'Doğrulanmış üretici kaydı',url:'https://manufacturer.example/manual.pdf',revision:'1',reviewedAt:'2026-09-23'}};
const output=(weights,topic,question,canConclude=false)=>({
  candidateAssessments:weights.map((weight,candidateIndex)=>({candidateIndex,weight,reason:`Müşteri gözlemleriyle göreli değerlendirme ${candidateIndex}`})),
  nextQuestion:{topic,text:question,whyThisQuestion:'Kalan adayları ayıran müşteri gözlemi'},
  canConclude,requiresTechnicianMeasurement:false,
});

test('single fake AI assessment owns every percentage while backend preserves pool, evidence and stop guard',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='unit-test-only';
  try {
    const proposals=[
      output([25,25,25,25],'noise','Fan sesi geliyor mu?'),
      output([40,25,20,15],'onset','Arıza ne zaman ortaya çıkıyor?'),
      output([60,15,15,10],'affected','Sıcak su akışında değişiklik var mı?'),
      output([70,10,10,10],'recurrence','Sorun her kullanımda oluyor mu?',true),
    ];
    const contexts=[];
    const provider={
      async extractIdentity(conversation){const user=conversation.filter(item=>item.role==='user').map(item=>item.content).join(' ');return {
        brand:user.includes('Test Marka')?'Test Marka':'',model:user.includes('Test Model')?'Test Model':'',errorCode:user.includes('E01')?'E01':''};},
      async assess(context){contexts.push(context);return proposals.shift();},
    };
    const turns=['kombim arızalı','Test Marka','Test Model','E01','Fan sesi geliyor.',
      'Arıza yaklaşık 20 dakika çalıştıktan sonra çıkıyor.','Sıcak su debisi de son zamanlarda azaldı.'];
    let history=[],token;const results=[];
    for(const message of turns){
      const result=await diagnose(message,history,token,{provider,knowledge:{identity,value:knowledge}});
      token=result.stateToken;results.push(result);
      history.push({role:'user',content:message},{role:'assistant',content:result.aiText});
    }
    assert.deepEqual(results.map(result=>result.informationProgress),[0,0,0,0,10,20,30]);
    assert.equal(contexts.length,4);
    assert.deepEqual(contexts.map(context=>context.customerEvidence.length),[0,1,2,3]);
    assert.deepEqual(contexts.at(-1).customerEvidence.map(item=>item.quote),turns.slice(4));
    assert.deepEqual(results.slice(3).map(result=>decodeMemory(result.stateToken).candidates.map(candidate=>candidate.probability)),
      [[25,25,25,25],[40,25,20,15],[60,15,15,10],[70,10,10,10]]);
    for(const result of results.slice(3)) {
      const candidates=decodeMemory(result.stateToken).candidates;
      assert.deepEqual(candidates.map(candidate=>candidate.name),names);
      assert.equal(candidates.reduce((sum,candidate)=>sum+candidate.probability,0),100);
    }
    assert.equal(results.at(-1).assessmentComplete,false);
    assert.match(results.at(-1).aiText,/her kullanımda/i);
    assert.deepEqual(contexts.at(-1).askedTopics,['noise','onset','affected']);
    assert(results.slice(3).every(result=>result.researchStatus==='verified' && result.technicalSource.url===knowledge.source.url));
    assert.deepEqual(contexts.at(-1).manufacturerCandidates.map(item=>item.label),names);
  } finally {if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});
test('a stated absence of an error code does not repeat the code question or invent a manufacturer pool',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='unit-test-only';
  try{
    const provider={async extractIdentity(){return {brand:'Test Marka',model:'Test Model',errorCode:''};},
      async assess(){assert.fail('AI candidate assessment must not run without a verified pool');}};
    const result=await diagnose('Test Marka Test Model, hata kodu yok.',[],undefined,{provider});
    assert.equal(result.researchStatus,'not_found');
    assert.deepEqual(result.candidateProbabilities,[]);
    assert.doesNotMatch(result.aiText,/hangi hata kodu/i);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});
test('spontaneous ignition and flame observations are sent as answered topics before asking again',async()=>{
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='unit-test-only';
  try{
    let received;
    const provider={async extractIdentity(){return {brand:identity.brand,model:identity.model,errorCode:identity.code};},
      async assess(context){received=context;return output([25,25,25,25],'gasSupply','Bildiğiniz bir gaz kesintisi var mı?');}};
    const result=await diagnose('Test Marka Test Model E01. Tıklama geliyor ama alev oluşmuyor.',[],undefined,
      {provider,knowledge:{identity,value:knowledge}});
    assert.ok(received.askedTopics.includes('ignitionSound'));
    assert.ok(received.askedTopics.includes('flameFormation'));
    const state=decodeMemory(result.stateToken);
    assert.equal(state.information,10);
    assert.deepEqual(state.evidence[0].observations.map(item=>item.topic),['ignitionSound','flameFormation']);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});
async function repairRun(message,first,second){
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='unit-test-only';
  try{
    const contexts=[];
    const provider={async extractIdentity(){return {brand:identity.brand,model:identity.model,errorCode:identity.code};},
      async assess(context){contexts.push(context);return contexts.length===1?first:second;}};
    const result=await diagnose(message,[],undefined,{provider,knowledge:{identity,value:knowledge}});
    return {result,contexts,state:decodeMemory(result.stateToken)};
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
}
test('unsafe question receives one bounded repair while original AI weights are retained',async()=>{
  const first=output([45,30,15,10],'pressure','Gaz giriş basıncını ölçtünüz mü?');
  const second=output([10,10,70,10],'noise','Cihazınızdan olağan dışı ses geliyor mu?');
  const {result,contexts,state}=await repairRun('Test Marka Test Model E01.',first,second);
  assert.equal(contexts.length,2);
  assert.match(contexts[1].repair.rejectReason,/Unsafe/);
  assert.deepEqual(contexts[1].manufacturerCandidates.map(item=>item.label),names);
  assert.deepEqual(state.candidates.map(item=>item.probability),[45,30,15,10]);
  assert.match(result.aiText,/olağan dışı ses/i);
  assert.doesNotMatch(result.aiText,/gaz giriş basıncı/i);
});
test('semantic repeat receives one bounded repair and keeps accepted evidence',async()=>{
  const first=output([45,30,15,10],'ignitionSound','Ateşleme tıkırtısı duyuyor musunuz?');
  const second=output([25,25,25,25],'gasSupply','Bildiğiniz bir gaz kesintisi var mı?');
  const {contexts,state}=await repairRun('Test Marka Test Model E01. Tıklama geliyor.',first,second);
  assert.equal(contexts.length,2);
  assert.match(contexts[1].repair.rejectReason,/Repeated/);
  assert.ok(contexts[1].askedTopics.includes('ignitionSound'));
  assert.equal(state.evidence[0].quote,'Test Marka Test Model E01. Tıklama geliyor.');
  assert.deepEqual(state.candidates.map(item=>item.probability),[45,30,15,10]);
});
test('repair can choose a reasoned technician boundary',async()=>{
  const first=output([45,30,15,10],'pressure','Gaz giriş basıncını ölçtünüz mü?');
  const second={...output([1,1,1,97],'noise','Cihazınızdan ses geliyor mu?'),nextQuestion:null,
    requiresTechnicianMeasurement:true,technicianBoundaryReason:'Yararlı müşteri sorusu kalmadı; kalan ayrım teknik ölçüm gerektirir.'};
  const {result,contexts,state}=await repairRun('Test Marka Test Model E01.',first,second);
  assert.equal(contexts.length,2);
  assert.equal(result.stopReason,'technician_measurement_required');
  assert.deepEqual(state.candidates.map(item=>item.probability),[45,30,15,10]);
});
test('invalid repair ends safely without a third call or a 503-like failure',async()=>{
  const first=output([45,30,15,10],'pressure','Gaz giriş basıncını ölçtünüz mü?');
  const second=output([1,1,1,97],'pressure','Manometreyle basıncı ölçtünüz mü?');
  const {result,contexts,state}=await repairRun('Test Marka Test Model E01.',first,second);
  assert.equal(contexts.length,2);
  assert.equal(result.stopReason,'technician_measurement_required');
  assert.match(result.aiText,/yerinde teknisyen kontrolü/i);
  assert.deepEqual(state.candidates.map(item=>item.probability),[45,30,15,10]);
});
