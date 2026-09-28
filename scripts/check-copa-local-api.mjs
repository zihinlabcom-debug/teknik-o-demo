// Local HTTP smoke of the actual /api/diagnose handler, with REST fixtures for
// the unapplied migrations and a fake AI endpoint. Never accesses live services.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createServer} from 'node:http';
import {writeFileSync} from 'node:fs';
import {withCopaRepository} from '../tests/helpers/copa-stage3-runtime.mjs';
import {decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';

registerHooks({resolve(specifier,context,next){
 if(specifier.startsWith('@/'))return next(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 if(specifier==='next/server')return next('next/server.js',context);
 return next(specifier,context);
}});
const {POST}=await import('../src/app/api/diagnose/route.ts');
const networkFetch=globalThis.fetch;
const names=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','DIAGNOSIS_STATE_SECRET'];
const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
process.env.NEXT_PUBLIC_SUPABASE_URL='https://copa-fixture.supabase.co';
process.env.SUPABASE_URL='https://copa-fixture.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='offline-service-key';
process.env.OPENAI_API_KEY='offline-api-key';
process.env.DIAGNOSIS_STATE_SECRET='copa-local-http-smoke';
let server;
try{
 await withCopaRepository(async(_repo,calls)=>{
  server=createServer(async(req,res)=>{
   try{
    let body='';for await(const chunk of req)body+=chunk;
    const response=await POST(new Request('http://127.0.0.1/api/diagnose',{method:'POST',headers:{'content-type':'application/json'},body}));
    res.writeHead(response.status,{'content-type':'application/json'});res.end(await response.text());
   }catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const endpoint=`http://127.0.0.1:${server.address().port}/api/diagnose`;
  const cases=[];
  for(const message of ['COPA Eomix E01','COPA e-Lecto 24 F47','COPA e-Lecto 12 F47','COPA e-Lecto 24 F34']){
   const response=await networkFetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,chatHistory:[]})});
   const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));
   const state=decodeBoilerState(result.stateToken);
   if(message.includes('e-Lecto'))assert.equal(state.fuelType,'electric');
   else{assert.equal(state.fuelType,'gas');assert.equal(result.aiText,'Gaz kokusu alıyor musunuz?');}
   if(message.includes('12'))assert.equal(result.candidateProbabilities.length,0);
   if(message.includes('24 F47'))assert.equal(result.candidateProbabilities.length,2);
   if(message.includes('e-Lecto'))assert.notEqual(state.pendingQuestionId,'safety_gas_smell');
   cases.push({message,httpStatus:response.status,brand:state.brand,model:state.model,familyId:state.familyId,
    officialModelId:state.officialModelId,errorCode:state.errorCode,fuelType:state.fuelType,
    candidateCount:result.candidateProbabilities.length,candidates:result.candidateProbabilities,
    aiText:result.aiText,resultState:result.resultState,questionCount:state.totalAskedQuestions});
  }
  const report={mode:'actual POST handler over local HTTP; generated Supabase REST fixture; fake AI',
    liveDatabaseCalls:0,liveOpenAICalls:0,dbPush:false,cases,interceptedRequests:calls.length};
  writeFileSync(new URL('../test-results/copa-stage3/local-api-smoke.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
 },{mockAI:true});
}finally{
 if(server)await new Promise(resolve=>server.close(resolve));
 for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];
}
