import test from 'node:test';
import assert from 'node:assert/strict';
import {matchVerifiedModel} from '../src/lib/model-name-match.ts';
import {diagnose} from '../src/lib/diagnosis.ts';
import {decodeMemory} from '../src/lib/diagnostic-state.ts';
import {toVerifiedKnowledge} from '../src/lib/verified-knowledge.ts';
import {verifiedKnowledgeRepository} from '../src/lib/technical-research.ts';
import {assessRecord} from '../src/lib/manufacturer-research-engine.ts';
import {extractErrorRecords} from '../src/lib/error-record.ts';
import {extractModelScopes} from '../src/lib/model-scope.ts';

test('verified canonical model tolerates casing, spacing, styling and one clear typo',()=>{
  const names=['ecoTEC intro'];
  assert.deepEqual(matchVerifiedModel('ecoTEC intro',names),{status:'exact',model:'ecoTEC intro'});
  for(const input of ['ecotec intro','ecotech intro','  ECO TEC   INTRO  ','eco-tec intro'])
    assert.deepEqual(matchVerifiedModel(input,names),{status:'canonical',model:'ecoTEC intro'});
});
test('ambiguous verified names are not auto-selected and unrelated or sibling variants are rejected',()=>{
  assert.deepEqual(matchVerifiedModel('ecotecc intro',['ecoTEC intro','ecotech intro']),{status:'ambiguous'});
  assert.deepEqual(matchVerifiedModel('alakasız model',['ecoTEC intro']),{status:'none'});
  assert.deepEqual(matchVerifiedModel('VICTRIX TERA 24',['VICTRIX TERA 28']),{status:'none'});
});
test('a misspelled customer model resolves to an already verified canonical record offline',async()=>{
  const identity={brand:'Vaillant',model:'ecoTEC intro',code:'F.28'};
  const document='ecoTEC intro\nFault codes\nF.28 | Ignition failed\nElectrodes and cables should be checked\nF.29 | Other fault';
  const scopes=extractModelScopes(document,identity.model),records=extractErrorRecords(document,'F28');
  const result=assessRecord(identity,{url:'https://www.vaillant.com.tr/manual.pdf',text:document},scopes,records,
    {scopeId:scopes[0].id,recordId:records[0].id,candidates:[{name:'electrodes / cables',part:'',startSpan:'s0',endSpan:'s0'}],questionIds:['gasSupply']},
    {modelVerified:true,errorCodeVerified:true,descriptionVerified:true,reason:'fixture',candidates:[{index:0,supported:true,reason:'literal evidence'}]});
  assert.equal(result.status,'verified');
  await verifiedKnowledgeRepository.saveVerified(toVerifiedKnowledge(identity,result));
  const saved=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='unit-test-only';
  try{
    let received;
    const provider={async extractIdentity(){return {brand:'Vaillant',model:'ecotech intro',errorCode:'F.28'};},
      async assess(context){received=context;return {candidateAssessments:[{candidateIndex:0,weight:100,reason:'fixture'}],
        nextQuestion:{topic:'gasSupply',text:'Bildiğiniz bir gaz kesintisi var mı?',whyThisQuestion:'Adayı ayırır'},
        canConclude:false,requiresTechnicianMeasurement:false};}};
    const response=await diagnose('Vaillant ecotech intro F.28',[],undefined,{provider});
    assert.equal(received.model,'ecoTEC intro');
    assert.equal(response.researchStatus,'verified');
    assert.deepEqual(decodeMemory(response.stateToken).candidates.map(item=>item.name),['electrodes / cables']);
  }finally{if(saved===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=saved;}
});
