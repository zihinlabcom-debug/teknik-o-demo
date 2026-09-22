import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManufacturerEvidence, modelScopeMatches } from '../src/lib/manufacturer-evidence.ts';
import { sourceContains, codeExcerpt } from '../src/lib/manufacturer-document.ts';

const report = {
  modelEvidence:'EWA 24', modelScope:'family', coveredModels:['EWA 20','EWA 24'],
  codeEvidence:'E02 Düşük su basıncı', descriptionEvidence:'Düşük su basıncı',
  errorRecord:'E02 Düşük su basıncı\nNedenler: Tesisat su basıncı düşük; parametre ayarı yanlış.',
  candidates:[{name:'Tesisat su basıncı düşük',basis:'Tesisat su basıncı düşük',part:''}],
};
const doc='EWA 20\nEWA 24\nARIZA KODLARI\n'+report.errorRecord+'\nE03 Fan arızası';
test('Warmhaus regression: a three-character model is a valid explicit family',()=>{
  assert.equal(sourceContains(doc,'Ewa'),true);
  assert.equal(modelScopeMatches('Ewa',report,doc),true);
  assert.equal(validateManufacturerEvidence({model:'Ewa',code:'E02'},report,doc),true);
});
test('Baymak regression: an error description is not evidence for inferred components',()=>{
  const text='DUOTEC\nARIZA KODLARI\nE01 Başarısız ateşleme\nE02 Alev hatası';
  const raw={...report,modelEvidence:'DUOTEC',modelScope:'exact',coveredModels:['DUOTEC'],
    codeEvidence:'E01 Başarısız ateşleme',descriptionEvidence:'Başarısız ateşleme',errorRecord:'E01 Başarısız ateşleme',
    candidates:['Gaz valfi','Elektrot','Kart'].map(name=>({name,basis:'Başarısız ateşleme',part:''}))};
  assert.equal(validateManufacturerEvidence({model:'DUOTEC',code:'E01'},raw,text),false);
  assert.equal(validateManufacturerEvidence({model:'DUOTEC',code:'E01'},{...raw,candidates:[]},text),true);
});
test('candidate evidence from another error record is rejected',()=>{
  const raw={...report,candidates:[{name:'Fan',basis:'Fan arızası',part:'fan'}]};
  assert.equal(validateManufacturerEvidence({model:'Ewa',code:'E02'},raw,doc),false);
});
test('family and variant do not silently become exact model matches',()=>{
  const text='VICTRIX TERA 24 PLUS\nKullanım kılavuzu';
  assert.equal(modelScopeMatches('VICTRIX TERA',{modelScope:'exact',modelEvidence:'VICTRIX TERA',coveredModels:['VICTRIX TERA']},text),false);
  assert.equal(modelScopeMatches('VICTRIX TERA',{modelScope:'family',modelEvidence:'VICTRIX TERA 24 PLUS',coveredModels:['VICTRIX TERA 24 PLUS']},text),true);
  assert.equal(modelScopeMatches('VICTRIX TERA 28',{modelScope:'family',modelEvidence:'VICTRIX TERA 24 PLUS',coveredModels:['VICTRIX TERA 24 PLUS']},text),false);
});
test('Immergas regression: numeric page/figure references cannot displace the actual fault table',()=>{
  const text='VICTRIX TERA 24 PLUS\n'+('Figura 27 C53 C83\n'.repeat(4000))+
    '\nCODICI ERRORE\n27 Circolazione insufficiente\nCause: circolatore bloccato.\n28 Perdita';
  const excerpt=codeExcerpt(text,'27');
  assert.ok(excerpt.includes('27 Circolazione insufficiente'));
  const raw={...report,modelScope:'family',modelEvidence:'VICTRIX TERA 24 PLUS',coveredModels:['VICTRIX TERA 24 PLUS'],
    codeEvidence:'27 C53 C83',descriptionEvidence:'C53 C83',errorRecord:'Figura 27 C53 C83',candidates:[]};
  assert.equal(validateManufacturerEvidence({model:'VICTRIX TERA',code:'27'},raw,text),false);
});
