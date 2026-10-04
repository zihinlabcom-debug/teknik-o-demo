import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {withCopaRepository} from './helpers/copa-stage3-runtime.mjs';

registerHooks({resolve(specifier,context,next){
 if(specifier==='@/lib/account-supabase')return next(new URL('./helpers/account-supabase-authenticated.mjs',import.meta.url).href,context);
 if(specifier.startsWith('@/'))return next(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 if(specifier==='next/server')return next('next/server.js',context);
 return next(specifier,context);
}});
const routes=[await import('../src/app/api/diagnose/route.ts'),await import('../src/app/api/chat/route.ts')];
const data=JSON.parse(readFileSync(new URL('./fixtures/free-text-relevance.json',import.meta.url),'utf8'));
async function offline(run){
 const values={NEXT_PUBLIC_SUPABASE_URL:'https://copa-fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'offline-fixture-key',
  OPENAI_API_KEY:'offline-not-a-real-key',DIAGNOSIS_STATE_SECRET:'offline-free-text-api-secret'};
 const saved=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);
 try{return await withCopaRepository(run,{data,mockAI:true,aiIdentity:()=>({brand:'',model:'',errorCode:''})});}
 finally{for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;}
}
async function post(route,body){
 const response=await route.POST(new Request('http://localhost/api/offline',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal(response.status,200);return response.json();
}
function identity(result){
 const state=decodeBoilerState(result.stateToken);
 assert.equal(result.category,'boiler');assert.equal(state.brand,'Ariston');assert.equal(state.model,'CLAS ONE');assert.equal(state.errorCode,'1P1');
 assert.equal(state.officialModelId,'0905af6f-6776-475f-904b-68b282018de2');assert.equal(result.candidateProbabilities.length,7);
 assert.equal(state.pendingIdentity,null);assert.match(result.aiText,/Gaz kokusu/);
}
test('both actual routes recover Ariston free-text identity even with an empty fake AI extraction',()=>offline(async()=>{
 for(const route of routes){const result=await post(route,{message:'Ariston CLAS ONE 1P1 hatası veriyor'});identity(result);assert.equal(result.questionCount,1);}
}));
test('both actual routes preserve initial identity through category confirmation without caller history',()=>offline(async()=>{
 for(const route of routes){
  const first=await post(route,{message:'Ariston CLAS ONE 1P1 hatası veriyor; evimi boyatmak da istiyorum'});
  assert.equal(first.resultState,'category_clarification');
  const next=await post(route,{message:'Kombi',conversationToken:first.conversationToken});identity(next);assert.equal(next.questionCount,2);
 }
}));
test('both actual routes accept all existing history field names and do not double-count current user text',()=>offline(async()=>{
 for(const route of routes)for(const field of ['history','chatHistory','messages']){
  const result=await post(route,{message:'Kombi',[field]:[{role:'user',content:'Ariston CLAS ONE 1P1 hatası veriyor'},
    {role:'user',content:'Kombi'}]});identity(result);assert.equal(result.questionCount,1);
 }
}));
