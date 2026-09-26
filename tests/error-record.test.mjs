import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extractErrorRecords,normalizeFaultCode,recordEvidence} from '../src/lib/error-record.ts';
import {extractModelScopes} from '../src/lib/model-scope.ts';
for(const code of ['501','5 01','5-01','5.01']) {
 for(const reversed of [false,true]) test(`fault record ${reversed?'description/code':'code/description'}: ${code}`,()=>{
  const row=reversed?`Mancanza fiamma | ${code}`:`${code} | Mancanza fiamma`;
  const text=`Error codes\nCode | Description\n${row}\n502 | Different error`;
  const records=extractErrorRecords(text,'501');
  assert.equal(normalizeFaultCode(code),'501');
  assert.equal(records.length,1);
  assert.equal(records[0].originalCode,code);
  assert.equal(records[0].description.text,'Mancanza fiamma');
  assert.equal(text.slice(records[0].start,records[0].end),records[0].text);
  assert.equal(records[0].causeSpans.length,0);
 });
}
test('numeric figure/page/part numbers are not fault records',()=>{
 for(const text of ['Figure 27 Gas assembly','27\nInstallation dimensions','Parts\n27 | Pump','Error codes\nSee figure 27 for installation','Page 27\nError codes']) assert.deepEqual(extractErrorRecords(text,'27'),[]);
});
test('real numeric fault row keeps cause spans inside its own boundaries',()=>{
 const text='Fault codes\n27 | Insufficient circulation\nPossible causes: blocked pump\n28 | Other error\nBroken fan';
 const [record]=extractErrorRecords(text,'27');
 assert.equal(record.normalizedCode,'27');
 assert.equal(recordEvidence(record,'blocked pump'),true);
 assert.equal(recordEvidence(record,'Broken fan'),false);
 assert.equal(recordEvidence(record,'Insufficient circulation'),false);
 assert.ok(!record.text.includes('28 |'));
});
test('split-line model variant is family, never exact',()=>{
 const scopes=extractModelScopes('VICTRIX TERA\n24 PLUS\nInstallation manual','VICTRIX TERA');
 assert.ok(scopes.some(s=>s.kind==='family'&&s.coveredModels.includes('VICTRIX TERA 24 PLUS')));
 assert.ok(!scopes.some(s=>s.kind==='exact'));
 assert.deepEqual(extractModelScopes('VICTRIX TERA 24 PLUS','VICTRIX TERA 28'),[]);
 assert.ok(extractModelScopes('EWA 20\nEWA 24','Ewa').some(s=>s.kind==='family'));
});
test('archived manufacturer documents retain their real code records and cause boundaries',async()=>{
 const cases=[
 ['test-results/vaillant-evidence-document.txt','F28','Gaz sayacı arızalı'],
 ['test-results/bosch-evidence-document.txt','EA','Проверьте, открыт ли газовый кран.'],
 ['test-results/multibrand-generalization-v2/demirdokum-3-document.txt','F28','gazda hava var'],
 ['test-results/multibrand-generalization-v2/warmhaus-3-document.txt','E02','Water pressure in the boiler not'],
 ['test-results/multibrand-generalization-v2/immergas-1-document.txt','27','circolatore bloccato'],
 ];
 for(const [file,code,cause] of cases){
  const text=await readFile(file,'utf8'),records=extractErrorRecords(text,code);
  assert.ok(records.some(r=>recordEvidence(r,cause)),`${file}: actual cause not extracted`);
 }
 const text=await readFile('test-results/multibrand-generalization-v2/ariston-2-document.txt','utf8');
 assert.ok(extractErrorRecords(text,'501').some(r=>r.description.text==='Mancanza fiamma'&&r.causeSpans.length===0));
 const baymak=await readFile('test-results/multibrand-generalization-v2/baymak-3-document.txt','utf8');
 assert.ok(extractErrorRecords(baymak,'E01').some(r=>r.description.text==='Başarısız ateşleme'&&r.causeSpans.length===0));
});

test('brand-prefixed scope retains the complete original source span',()=>{
 const text='EXAMPLE Model A 24 PLUS';const [scope]=extractModelScopes(text,'Model A','Example');
 assert.equal(scope.kind,'family');assert.equal(scope.text,text);
 assert.equal(text.slice(scope.start,scope.end),scope.text);
 assert.deepEqual(scope.coveredModels,['Model A 24 PLUS']);
});
test('a separate numeric variant list cannot turn a family cover into exact evidence',()=>{
 for(const variants of ['24-28','24 / 28','24, 28','24']){
  const text=`MODEL X\n${variants}\nInstallation manual`;
  const scopes=extractModelScopes(text,'MODEL X');
  assert.ok(scopes.length);assert.ok(scopes.every(s=>s.kind==='family'));
  assert.ok(scopes[0].text.includes(variants));
 }
 assert.deepEqual(extractModelScopes('MODEL X\n24-28\nInstallation manual','MODEL X 32'),[]);
 const child=extractModelScopes('MODEL X\n24-28\nInstallation manual','MODEL X 24');
 assert.equal(child[0].kind,'family');assert.deepEqual(child[0].coveredModels,['MODEL X 24','MODEL X 28']);
});
