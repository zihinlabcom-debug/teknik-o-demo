import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupDiagnosticKnowledge } from '../src/lib/diagnostic-knowledge.ts';
import { buildDiagnosisResult } from '../src/lib/diagnosis.ts';
import { calculateOMF } from '../src/lib/omf-engine.ts';

test('manual lookup isolates brand/model revisions and normalizes code punctuation', () => {
  assert.equal(lookupDiagnosticKnowledge('Demirdöküm', 'Nitromix', 'F.76').code, 'F76');
  for (const [brand, model, code] of [['Vaillant','Nitromix','F76'], ['Demirdöküm','Nitromix Ioni','F76'], ['Demirdöküm','Nitromix','F999']])
    assert.equal(lookupDiagnosticKnowledge(brand, model, code), null);
});
test('normal price uses 20% risk and 15% service on risk-inclusive cost with minimum', () => {
  assert.deepEqual(calculateOMF({basePartPrice: 548.8, fixedLabor: 2000}).breakdown, {OMF: 2548.8, risk: 509.76, service: 458.78, total: 3517.34});
  assert.equal(calculateOMF({basePartPrice: 100, fixedLabor: 100}).breakdown.total, 540);
  assert.equal(calculateOMF({basePartPrice: 100, fixedLabor: 100}).warrantyDays, 90);
  assert.throws(() => calculateOMF({basePartPrice: -1, fixedLabor: 2000}));
});
const prior = [{role:'user',content:'Demirdöküm Nitromix. Ekran açık. Basınç sıfır.'}];
const ready = {mostLikelyReason:'Gözlemler en olası senaryoyu destekliyor.',brand:'Demirdöküm',model:'Nitromix',catalogKey:'basınç sensörü',confidence:99,isReadyForPrice:true,supportingEvidence:['Ekran açık','Basınç sıfır'],unresolvedAlternatives:[]};
test('customer sees a plain observation question instead of technical preamble', async () => {
  const result = await buildDiagnosisResult({...ready, isReadyForPrice:false,
    aiText:'F.76 termik kapatma düzeneği arızasını işaret eder. Cihazınızdan olağan dışı ses geliyor mu?'},prior,'Devam');
  assert.equal(result.aiText,'Cihazınızdan olağan dışı ses geliyor mu?');
});
test('incompatible part, unknown code, insufficient and fabricated evidence prevent quotes', async () => {
  for (const change of [{errorCode:'F76'}, {errorCode:'F999'}, {confidence:74}, {mostLikelyReason:''}, {supportingEvidence:['Uydurulan ölçüm']}, {safetyStop:true}]) {
    const result = await buildDiagnosisResult({...ready,...change},prior,'Devam',async()=>assert.fail('Price lookup forbidden'));
    assert.equal(result.isReadyForPrice,false);
    assert.equal(result.priceSource,null);
  }
});
test('long uncertain conversations terminate without an invented appointment', async () => {
  const result = await buildDiagnosisResult({...ready, isReadyForPrice:false}, [...prior, ...Array.from({length:10},()=>({role:'assistant',content:'Soru'}))], 'Bilmiyorum');
  assert.equal(result.diagnosticStatus,'needs_onsite');
  assert.equal(result.options.length,0);
});

test('sufficient basis allows OMF with remaining alternatives, even after ten turns', async () => {
  const source = { title:'Test parçası', price:1000, sku:'TEST', url:'https://example.com', currency:'TRY', vatIncluded:true };
  const history = [...prior, ...Array.from({length:10},()=>({role:'assistant',content:'Soru'}))];
  const result = await buildDiagnosisResult({...ready, unresolvedAlternatives:['Kablo arızası'], needsOnsite:true}, history,'Devam',async()=>({status:'available',source,risk:999}));
  assert.equal(result.isReadyForPrice,true);
  assert.deepEqual(result.deterministicOMF.breakdown,{OMF:3000,risk:600,service:540,total:4140});
  assert.deepEqual(result.assessment.unresolvedAlternatives,['Kablo arızası']);
  assert.equal(result.deterministicOMF.warrantyDays,90);
});

test('F76 is assessed rather than automatically stopped; missing price is a separate result', async () => {
  let calls=0;
  const result = await buildDiagnosisResult({...ready, errorCode:'F76',catalogKey:'termik kapatma düzeneği',unresolvedAlternatives:['Kablo kesintisi']},prior,'Devam',async(brand,model,part)=>{
    calls++;
    assert.equal(part,'termik kapatma düzeneği');
    return {status:'unmapped',message:'Bu parça için doğrulanmış fiyat kaydı yok.'};
  });
  assert.equal(calls,1);
  assert.equal(result.assessment.sufficientBasis,true);
  assert.equal(result.pricingStatus,'unmapped');
  assert.notEqual(result.diagnosticStatus,'needs_onsite');
});
