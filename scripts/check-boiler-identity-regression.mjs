// One explicit real local API call; credentials and signed tokens are never printed.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { decodeBoilerState } from '../src/lib/boiler-diagnosis.ts';
import { normalizePartText } from '../src/lib/parts-catalog.ts';

const message = 'Demirdokum nitromiX F76 hatasi veriyor.';
const testedAt = new Date().toISOString();
const response = await fetch((process.env.BOILER_QA_BASE_URL || 'http://localhost:3000') + '/api/diagnose', {
  method:'POST', headers:{'Content-Type':'application/json'},
  body:JSON.stringify({message, chatHistory:[]}), signal:AbortSignal.timeout(120000),
});
const result = await response.json();
const state = result.stateToken ? decodeBoilerState(result.stateToken) : null;
const report = {testedAt, message, httpStatus:response.status,
  detectedBrand:state?.brand??null, model:state?.model??null,
  familyId:state?.familyId??null, officialModelId:state?.officialModelId??null,
  errorCode:state?.errorCode??null, candidateCount:result.candidateProbabilities?.length??0,
  candidates:result.candidateProbabilities??[], aiText:result.aiText??result.error??null,
  resultState:result.resultState??null, questionCount:state?.totalAskedQuestions??null};
await mkdir('test-results', {recursive:true});
const path = 'test-results/boiler-identity-regression-live-' + testedAt.replace(/[:.]/g, '-') + '.json';
await writeFile(path, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log('Report: ' + path);
assert.equal(response.status, 200);
assert.equal(report.detectedBrand, 'DemirDöküm');
assert.equal(normalizePartText(report.model??''), 'nitromix');
assert.ok(report.familyId); assert.equal(report.officialModelId, null);
assert.equal((report.errorCode??'').toUpperCase().replace(/[.\s-]/g, ''), 'F76');
assert.equal(report.candidateCount, 3);
assert.equal(report.resultState, 'diagnosing'); assert.equal(report.questionCount, 1);
assert.doesNotMatch(report.aiText??'', /markası nedir|modeli nedir|hata kodu görünüyor/);
