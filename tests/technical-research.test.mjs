import test from 'node:test';
import assert from 'node:assert/strict';
import {validateResearch,createTechnicalResearchService,researchKey} from '../src/lib/technical-research.ts';
import {advanceDiagnosis,emptyMemory} from '../src/lib/diagnostic-state.ts';
import {sourceContains,containsErrorCode,codeExcerpt} from '../src/lib/manufacturer-document.ts';
const identity={brand:'Vaillant',model:'ecoTEC intro',code:'F.28'};
const url='https://www.vaillant.com.tr/downloads/example.pdf';
const record={status:'verified',...identity,modelMatch:true,codeMatch:true,officialManufacturer:true,
  meaning:'Ateşleme başarısız',url,title:'ecoTEC intro',revision:'test',page:31,
  modelScope:'exact',coveredModels:['ecoTEC intro'],modelEvidence:'ecoTEC intro',descriptionEvidence:'ateşleme başarısız',errorRecord:'F.28 kodu ateşleme başarısız\nÜretici gaz beslemesini listeliyor\nÜretici ateşleme kontrolünü listeliyor',codeEvidence:'F.28 kodu ateşleme başarısız',
  candidates:[{name:'Gaz beslemesi',basis:'Üretici gaz beslemesini listeliyor',part:''},
    {name:'Ateşleme sistemi',basis:'Üretici ateşleme kontrolünü listeliyor',part:''}],questionIds:['gasSupply','ignitionSound']};
const proof={text:'ecoTEC intro\n'+record.errorRecord,review:{modelScopeSupported:true,faultRecordSupported:true,reason:'fixture',candidates:record.candidates.map((_,index)=>({index,supported:true,reason:'explicit cause'}))}};
test('research validates exact device/code and a retrieved official source',()=>{
  assert.equal(validateResearch(identity,record,[url],proof).status,'verified');
  for(const change of [{brand:'Bosch'},{model:'ecoTEC plus'},{code:'F76'},{officialManufacturer:false},{modelMatch:false},{candidates:[]},{questionIds:['invented']},{modelEvidence:''}])
    assert.equal(validateResearch(identity,{...record,...change},[url],proof).status,'not_found');
  assert.equal(validateResearch(identity,record,[],proof).status,'not_found');
});
test('lookalike, seller and insecure source URLs cannot establish official knowledge',()=>{
  for(const bad of ['https://vaillant.com.tr.example.com/doc','https://seller.example/doc','http://www.vaillant.com.tr/doc','https://user@www.vaillant.com.tr/doc'])
    assert.equal(validateResearch(identity,{...record,url:bad},[bad],proof).status,'not_found');
});
test('document evidence tolerates PDF line wrapping but rejects invented text and substring codes',()=>{
  assert.equal(sourceContains('Termik kapatma düzeneği tetiklen-\nmiş','Termik kapatma düzeneği tetiklenmiş'),true);
  assert.equal(sourceContains('Gaz vanası açık','Gaz vanası kapalı'),false);
  assert.equal(containsErrorCode('F.28 ateşleme','F28'),true);
  assert.equal(containsErrorCode('HEAT error','EA'),false);
  const doc='ecoTEC intro\n'+'.'.repeat(9000)+'F.28 Ateşleme\n'+'.'.repeat(5000)+'devam eden neden';
  assert.ok(codeExcerpt(doc,'F28').includes('devam eden neden'));
});
test('cache separates brand, full model and code; expires without a stale fallback',async()=>{
  let clock=0,calls=0,fail=false;
  const lookup=createTechnicalResearchService(async()=>{calls++;if(fail)throw Error('offline');return validateResearch(identity,record,[url],proof);},()=>clock);
  await Promise.all([lookup(identity),lookup(identity)]);assert.equal(calls,1);
  await lookup({...identity,model:'ecoTEC plus'});assert.equal(calls,2);
  clock=86400001;fail=true;assert.equal((await lookup(identity)).status,'unavailable');
  assert.equal(researchKey(identity),researchKey({...identity,code:'F28'}));
});
test('even quoted customer input cannot inject an unrelated cause into a closed pool',()=>{
  const previous={...emptyMemory(),candidates:[{name:'Gaz beslemesi',probability:50},{name:'Ateşleme sistemi',probability:50}]};
  assert.throws(()=>advanceDiagnosis(previous,{candidateAssessments:[{candidateIndex:2,weight:100,reason:'uydurma'},
    {candidateIndex:1,weight:0,reason:'uydurma'}],nextQuestion:{topic:'gasSupply',text:'Gaz kesintisi var mı?',whyThisQuestion:'ayırır'},
    canConclude:false,requiresTechnicianMeasurement:false},'ses var'));
  assert.deepEqual(previous.candidates.map(c=>c.name),['Gaz beslemesi','Ateşleme sistemi']);
});
