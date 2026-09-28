// Explicit live local API QA. Never prints environment values or signed tokens.
import { mkdir, writeFile } from 'node:fs/promises';
import { decodeBoilerState } from '../src/lib/boiler-diagnosis.ts';
import { productionBoilerRepository } from '../src/lib/boiler-supabase.ts';
import { selectCandidatePool } from '../src/lib/boiler-probability.ts';

const base = process.env.BOILER_QA_BASE_URL || 'http://localhost:3000';
const repository = productionBoilerRepository();
if (!repository) throw Error('Local Supabase configuration missing');
const report = { testedAt: new Date().toISOString(), base, cases: [] };
for (const [label,message] of [
  ['family','Demirdokum nitromiX F76 hatasi veriyor.'],
  ['exact','Demirdokum nitromiX P24 NG HEP F76 hatasi veriyor.'],
]) {
  const response = await fetch(base + '/api/diagnose', { method:'POST',
    headers:{'Content-Type':'application/json'}, body:JSON.stringify({message,chatHistory:[]}),
    signal:AbortSignal.timeout(120000) });
  const result = await response.json();
  const state = result.stateToken ? decodeBoilerState(result.stateToken) : null;
  const device = state ? await repository.resolveDevice(state.brand,state.model) : null;
  let selected = null, coveredModelCount = null;
  if (device && device !== 'ambiguous') {
    const candidates = await repository.getCandidates(device.familyId);
    const covered = !device.officialModelId && state.errorCode
      ? await repository.getErrorCodeModelIds(device.familyId,state.errorCode) : [];
    coveredModelCount = covered.length;
    selected = selectCandidatePool(candidates,device.familyId,device.officialModelId,state.errorCode,covered);
  }
  const item = { label,message,httpStatus:response.status,brand:state?.brand ?? null,model:state?.model ?? null,
    resolvedFamily:device && device !== 'ambiguous' ? device.familyName : null,
    officialModelName:device && device !== 'ambiguous' ? device.officialModelName : null,
    officialModelId:state?.officialModelId ?? null,errorCode:state?.errorCode ?? null,
    candidateMode:selected?.mode ?? null,coveredModelCount,
    candidateCount:result.candidateProbabilities?.length ?? 0,
    candidates:result.candidateProbabilities ?? [],aiText:result.aiText ?? result.error ?? null,
    resultState:result.resultState ?? null,stopReason:result.stopReason ?? null,
    totalAskedQuestions:state?.totalAskedQuestions ?? null,pricingData:result.pricingData ?? null };
  report.cases.push(item);
  console.log(JSON.stringify(item,null,2));
  if (label === 'family' && result.aiText === 'Gaz kokusu alıyor musunuz?' && result.stateToken) {
    const followResponse = await fetch(base + '/api/diagnose', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:'Hayır, gaz kokusu almıyorum.',stateToken:result.stateToken,
        chatHistory:[{role:'user',content:message},{role:'assistant',content:result.aiText}]}),signal:AbortSignal.timeout(120000)});
    const follow = await followResponse.json();
    const followState = follow.stateToken ? decodeBoilerState(follow.stateToken) : null;
    item.afterSafetyNo = {httpStatus:followResponse.status,candidateCount:follow.candidateProbabilities?.length ?? 0,
      candidates:follow.candidateProbabilities ?? [],aiText:follow.aiText ?? follow.error ?? null,
      resultState:follow.resultState ?? null,stopReason:follow.stopReason ?? null,
      totalAskedQuestions:followState?.totalAskedQuestions ?? null,pricingData:follow.pricingData ?? null};
    console.log(JSON.stringify(item.afterSafetyNo,null,2));
  }
}
await mkdir('test-results',{recursive:true});
const reportPath='test-results/boiler-family-consensus-live-'+report.testedAt.replace(/[:.]/g,'-')+'.json';
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log('Report: '+reportPath);
if (report.cases.some(item=>item.httpStatus !== 200 || item.candidateCount !== 3) ||
    report.cases[0].candidateMode !== 'family_code_consensus' || report.cases[0].officialModelId !== null ||
    !report.cases[1].officialModelId) process.exitCode = 1;
