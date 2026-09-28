// Actual route over loopback HTTP, prepared REST data and fake AI only.
// Every other network host is rejected by the repository fixture.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {createServer} from 'node:http';
import {writeFileSync} from 'node:fs';
import {withGeneralRepository} from '../tests/helpers/stage3-general-runtime.mjs';
import {decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
registerHooks({resolve(specifier,context,next){
 if(specifier.startsWith('@/'))return next(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 if(specifier==='next/server')return next('next/server.js',context);
 return next(specifier,context);
}});
const {POST}=await import('../src/app/api/diagnose/route.ts');
const networkFetch=globalThis.fetch;
const names=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','DIAGNOSIS_STATE_SECRET'];
const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
process.env.NEXT_PUBLIC_SUPABASE_URL=process.env.SUPABASE_URL='https://copa-fixture.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='offline-service-key';process.env.OPENAI_API_KEY='offline-api-key';
process.env.DIAGNOSIS_STATE_SECRET='general-local-http-smoke';
const definitions=[
 ['Demirdokum nitromic F76 hatasi veriyor',{brand:'Demirdokum',model:'nitromic',errorCode:'F76'},true],
 ['Demirdokum nitromix F28',{brand:'Demirdokum',model:'nitromix',errorCode:'F28'},false],
 ['COPA e-Lecto 24 F47',{brand:'COPA',model:'e-Lecto 24',errorCode:'F47'},false],
 ['COPA eomiks E01',{brand:'COPA',model:'eomiks',errorCode:'E01'},true],
 ['Bosch condes 2500 EA',{brand:'Bosch',model:'condes 2500',errorCode:'EA'},true],
 ['Vaillant ecoTEC intro VUW 18/24 AS/1-1 F28',{brand:'Vaillant',model:'ecoTEC intro VUW 18/24 AS/1-1',errorCode:'F28'},false],
];
let server,identity;
try{
 await withGeneralRepository(async(_repo,calls)=>{
  server=createServer(async(req,res)=>{
   try{
    let body='';for await(const chunk of req)body+=chunk;
    const reply=await POST(new Request('http://127.0.0.1/api/diagnose',{method:'POST',headers:{'content-type':'application/json'},body}));
    res.writeHead(reply.status,{'content-type':'application/json'});res.end(await reply.text());
   }catch(error){res.writeHead(500);res.end(JSON.stringify({error:error.message}));}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const endpoint=`http://127.0.0.1:${server.address().port}/api/diagnose`;
  const post=async body=>{
   const response=await networkFetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;
  };
  const cases=[];
  for(const [message,extracted,confirmation] of definitions){
   identity=extracted;
   const first=await post({message,chatHistory:[]}),before=decodeBoilerState(first.stateToken);
   assert.equal(!!before.identityConfirmation,confirmation,message);
   assert.equal(before.errorCode,extracted.errorCode);
   const result=confirmation?await post({message:'evet',chatHistory:[{role:'user',content:message}],stateToken:first.stateToken}):first;
   const state=decodeBoilerState(result.stateToken);
   assert.equal(state.identityConfirmation,undefined,message+' confirmation must resume');
   assert.ok(state.familyId,JSON.stringify({message,state,aiText:result.aiText}));assert.ok(result.candidateProbabilities.length,message);
   assert.equal(result.candidateProbabilities.reduce((n,c)=>n+Math.round(c.probability*100),0),10000);
   assert.equal(result.groupProbabilities.reduce((n,g)=>n+Math.round(g.probability*100),0),10000);
   assert.equal(state.errorCode,extracted.errorCode);assert.ok(state.totalAskedQuestions<=12);
   assert.notEqual(result.resultState,'priced_candidate');
   if(message.includes('nitromic')){assert.equal(state.officialModelId,null);assert.equal(result.candidateProbabilities.length,3);}
   if(message.includes('nitromix F28')){
    assert.ok(result.candidateProbabilities.some(c=>c.name==='Ateşleme sistemi sorunu'));
    assert.ok(result.candidateProbabilities.every(c=>!/trafo/i.test(c.name)));
   }
   if(message.includes('e-Lecto')){
    assert.equal(state.fuelType,'electric');assert.equal(result.candidateProbabilities.length,2);
    assert.doesNotMatch(result.aiText,/gaz|ateşleme|baca/i);
    assert.ok(result.candidateProbabilities.every(c=>!/gaz|ateşleme|baca/i.test(c.name)));
   }
   if(message.startsWith('Vaillant')){assert.ok(state.officialModelId);assert.equal(result.candidateProbabilities.length,6);}
   cases.push({message,httpStatus:200,confirmationAsked:confirmation,confirmationText:confirmation?first.aiText:null,
    brand:state.brand,model:state.model,familyId:state.familyId,officialModelId:state.officialModelId,
    errorCode:state.errorCode,fuelType:state.fuelType,candidateCount:result.candidateProbabilities.length,
    candidateProbabilities:result.candidateProbabilities,groupProbabilities:result.groupProbabilities,
    aiText:result.aiText,resultState:result.resultState,questionCount:state.totalAskedQuestions,verdict:'PASS'});
  }
  const report={mode:'Actual /api/diagnose POST over local HTTP; frozen DB + unapplied 00032–00036 REST fixture; fake AI',
    liveDatabaseCalls:0,liveOpenAICalls:0,dbPush:false,cases,interceptedRequests:calls.length};
  writeFileSync(new URL('../test-results/stage3-general/local-api-smoke.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({cases:cases.map(c=>({message:c.message,verdict:c.verdict,count:c.candidateCount,state:c.resultState})),liveOpenAICalls:0},null,2));
 },{mockAI:true,aiIdentity:()=>identity});
}finally{
 if(server)await new Promise(resolve=>server.close(resolve));
 for(const name of names)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];
}
