import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestBrands,suggestModels} from '../src/lib/boiler-identity-suggestions.ts';

const catalog={brands:['DemirDöküm','Vaillant','Bosch','COPA','Buderus','Viessmann'],models:[
 {brand:'DemirDöküm',name:'nitromiX',familyId:'nitromix',officialModelId:null},
 {brand:'DemirDöküm',name:'Nitron',familyId:'nitron',officialModelId:null},
 {brand:'DemirDöküm',name:'nitromiX P24 NG (HEP)',familyId:'nitromix',officialModelId:'p24'},
 {brand:'DemirDöküm',name:'nitromiX P28 NG (HEP)',familyId:'nitromix',officialModelId:'p28'},
 {brand:'Vaillant',name:'ecoTEC intro',familyId:'intro',officialModelId:null},
 {brand:'Vaillant',name:'ecoTEC plus',familyId:'plus',officialModelId:null},
 {brand:'Vaillant',name:'ecoTEC plus 236',familyId:'plus',officialModelId:'236'},
 {brand:'Vaillant',name:'ecoTEC plus 286',familyId:'plus',officialModelId:'286'},
 {brand:'Bosch',name:'Condens 2500 W',familyId:'2500',officialModelId:null},
 {brand:'Bosch',name:'Condens 2300 W',familyId:'2300',officialModelId:null},
 {brand:'COPA',name:'Eomix',familyId:'eomix',officialModelId:null},
 {brand:'COPA',name:'e-Lecto',familyId:'electo',officialModelId:null},
]};

test('catalog-only model suggestions recover small typos without resolving identity',()=>{
 assert.equal(suggestModels(catalog,'DemirDöküm','nitromic')[0].name,'nitromiX');
 assert.equal(suggestModels(catalog,'DemirDöküm','nitromix')[0].exact,true);
 assert.equal(suggestModels(catalog,'COPA','eomiks')[0].name,'Eomix');
 assert.equal(suggestModels(catalog,'COPA','electo')[0].name,'e-Lecto');
 assert.equal(suggestModels(catalog,'Bosch','condes 2500')[0].name,'Condens 2500 W');
 assert.ok(suggestModels(catalog,'Vaillant','ecotce').length>1);
 assert.deepEqual(suggestModels(catalog,'Bosch','completely unknown'),[]);
});
test('capacity and model numbers cannot change through fuzzy matching',()=>{
 assert.equal(suggestModels(catalog,'DemirDöküm','nitromic p24')[0].officialModelId,'p24');
 assert.equal(suggestModels(catalog,'DemirDöküm','nitromic p28')[0].officialModelId,'p28');
 assert.deepEqual(suggestModels(catalog,'DemirDöküm','nitromic p35'),[]);
 assert.ok(suggestModels(catalog,'Vaillant','ecotce plus 236').every(m=>m.officialModelId==='236'));
 assert.ok(suggestModels(catalog,'Bosch','condes 2500').every(m=>m.familyId==='2500'));
});
test('brand typo proposals use catalog identities and are always confirmation proposals',()=>{
 for(const [input,expected] of [['demirdokun','DemirDöküm'],['vailant','Vaillant'],['buderuz','Buderus'],['visman','Viessmann']])
  assert.equal(suggestBrands(catalog,input)[0].name,expected);
 assert.deepEqual(suggestBrands(catalog,'unknownbrand'),[]);
});
test('multiple equally close models remain multiple explicit choices',()=>{
 const extra={...catalog,models:[{brand:'COPA',name:'Nexa',familyId:'nexa',officialModelId:null},
 {brand:'COPA',name:'Nexi',familyId:'nexi',officialModelId:null}]};
 assert.equal(suggestModels(extra,'COPA','nexo').length,2);
});

test('roman variant tokens cannot be substituted through a typo suggestion',()=>{
 const variants={brands:['Any'],models:[
  {brand:'Any',name:'Example I',familyId:'one',officialModelId:null},
  {brand:'Any',name:'Example II',familyId:'two',officialModelId:null},
  {brand:'Any',name:'Example V',familyId:'five',officialModelId:null},
 ]};
 assert.ok(suggestModels(variants,'Any','Exampl I').every(m=>m.familyId==='one'));
 assert.ok(suggestModels(variants,'Any','Exampl II').every(m=>m.familyId==='two'));
 assert.ok(suggestModels(variants,'Any','Exampl V').every(m=>m.familyId==='five'));
 assert.deepEqual(suggestModels(variants,'Any','Exampl III'),[]);
});
