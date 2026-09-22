import test from 'node:test';
import assert from 'node:assert/strict';
import {validateResearch,createTechnicalResearchService,researchKey} from '../src/lib/technical-research.ts';
import {advanceDiagnosis,emptyMemory} from '../src/lib/diagnostic-state.ts';
import {sourceContains,containsErrorCode,codeExcerpt} from '../src/lib/manufacturer-document.ts';
const identity={brand:'Vaillant',model:'ecoTEC intro',code:'F.28'};
const url='https://www.vaillant.com.tr/downloads/example.pdf';
const record={status:'verified',...identity,modelMatch:true,codeMatch:true,officialManufacturer:true,
  meaning:'Ateşleme başarısız',url,title:'ecoTEC intro',revision:'test',page:31,
  modelEvidence:'ecoTEC intro modeli kapsanıyor',codeEvidence:'F.28 kodu ateşleme başarısız',
  candidates:[{name:'Gaz beslemesi',basis:'Üretici gaz beslemesini listeliyor',part:''},
    {name:'Ateşleme sistemi',basis:'Üretici ateşleme kontrolünü listeliyor',part:''}],questionIds:['gasSupply','ignitionSound']};
test('research validates exact device/code and a retrieved official source',()=>{
  assert.equal(validateResearch(identity,record,[url]).status,'verified');
  for(const change of [{brand:'Bosch'},{model:'ecoTEC plus'},{code:'F76'},{officialManufacturer:false},{modelMatch:false},{candidates:[]},{questionIds:['invented']},{modelEvidence:''}])
    assert.equal(validateResearch(identity,{...record,...change},[url]).status,'not_found');
  assert.equal(validateResearch(identity,record,[]).status,'not_found');
});
test('lookalike, seller and insecure source URLs cannot establish official knowledge',()=>{
  for(const bad of ['https://vaillant.com.tr.example.com/doc','https://seller.example/doc','http://www.vaillant.com.tr/doc','https://user@www.vaillant.com.tr/doc'])
    assert.equal(validateResearch(identity,{...record,url:bad},[bad]).status,'not_found');
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
  const lookup=createTechnicalResearchService(async()=>{calls++;if(fail)throw Error('offline');return validateResearch(identity,record,[url]);},()=>clock);
  await Promise.all([lookup(identity),lookup(identity)]);assert.equal(calls,1);
  await lookup({...identity,model:'ecoTEC plus'});assert.equal(calls,2);
  clock=86400001;fail=true;assert.equal((await lookup(identity)).status,'unavailable');
  assert.equal(researchKey(identity),researchKey({...identity,code:'F28'}));
});
test('even quoted customer input cannot inject an unrelated cause into a closed pool',()=>{
  const previous={...emptyMemory(),candidates:[{name:'Gaz beslemesi',probability:50,supports:[],contradicts:[]},{name:'Ateşleme sistemi',probability:50,supports:[],contradicts:[]}]};
  const step=advanceDiagnosis(previous,{informative:true,newEvidence:['ses var'],candidates:[{name:'Basınç sensörü',probability:100,supports:['ses var']}],nextQuestions:['gasSupply']},'ses var',[],['Gaz beslemesi','Ateşleme sistemi']);
  assert.deepEqual(step.memory.candidates,previous.candidates);
  assert.equal(step.memory.candidates.reduce((sum,c)=>sum+c.probability,0),100);
});
