import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {decodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {withCopaRepository} from './helpers/copa-stage3-runtime.mjs';
import {generalData} from './helpers/stage3-general-runtime.mjs';

registerHooks({resolve(specifier,context,next){
 if(specifier==='@/lib/account-supabase')return next(new URL('./helpers/account-supabase-authenticated.mjs',import.meta.url).href,context);
 if(specifier.startsWith('@/'))return next(new URL('../src/'+specifier.slice(2)+'.ts',import.meta.url).href,context);
 if(specifier==='next/server')return next('next/server.js',context);
 return next(specifier,context);
}});
const {POST}=await import('../src/app/api/diagnose/route.ts');
const story='bir süre çalıştıktan sonra veriyordu, reset atınca düzeliyordu ama sonra tekrar ediyordu; en son sürekli vermeye başladı';

test('real diagnose route preserves timeline clarification and serializes Unicode candidate names with fake AI only',async()=>{
 const envNames=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_API_KEY','DIAGNOSIS_STATE_SECRET'];
 const saved=Object.fromEntries(envNames.map(name=>[name,process.env[name]]));
 process.env.NEXT_PUBLIC_SUPABASE_URL=process.env.SUPABASE_URL='https://copa-fixture.supabase.co';
 process.env.SUPABASE_SERVICE_ROLE_KEY='offline-service-key';process.env.OPENAI_API_KEY='offline-api-key';
 process.env.DIAGNOSIS_STATE_SECRET='runtime-bugs-offline-route-secret';
 try{
  const data=generalData(),family=data.families.find(f=>f.family_name==='nitromiX');
  const timingId=data.questions.find(q=>q.question_key==='fault_timing_after_start').id;
  // Inject encoded transport data without altering the frozen manufacturer fixture.
  for(const c of data.candidates.filter(c=>c.family_id===family.id&&c.error_code?.replace('.','')==='F76'))
   c.candidate_name=c.candidate_name.replace(/u$/,'&#x75;');
  await withCopaRepository(async(_repo,calls)=>{
   const fixtureFetch=globalThis.fetch;let fakeAICalls=0;
   globalThis.fetch=async(input,init)=>{
    const req=input instanceof Request?input:new Request(input,init);
    if(new URL(req.url).hostname!=='api.openai.com')return fixtureFetch(req);
    fakeAICalls++;const body=await req.json(),schema=body.response_format?.json_schema?.name;
    let reply;
    if(body.response_format?.type==='json_object')reply={brand:'Demirdokum',model:'nitromiX',errorCode:'F76'};
    else{
     const context=JSON.parse(body.messages.at(-1).content);
     if(schema==='boiler_question_choice')reply={questionId:(context.questions.find(q=>q.question_key==='display_temperature_rise')??context.questions[0]).id};
     else if(schema==='boiler_answer')reply={answerKey:context.answerType==='fault_timing_after_start'?'after_some_time':'no'};
     else if(schema==='boiler_observations')reply={answers:context.customerMessage===story?[{
      questionId:timingId,answerKey:'after_some_time',quote:'bir süre çalıştıktan sonra veriyordu',
     }]:[]};
     else throw Error('Unhandled offline AI operation: '+schema);
    }
    return Response.json({id:'offline-completion',object:'chat.completion',choices:[{index:0,message:{role:'assistant',content:JSON.stringify(reply)},finish_reason:'stop'}]});
   };
   const post=async(message,stateToken=null,conversationToken=null,turnId=message)=>{
    const response=await POST(new Request('http://localhost/api/diagnose',{method:'POST',headers:{'content-type':'application/json'},
     body:JSON.stringify({message,stateToken,conversationToken,turnId,chatHistory:[]})}));
    assert.equal(response.status,200);const serialized=await response.text();
    assert.doesNotMatch(serialized,/&#x75;|&amp;#x75;/i);return JSON.parse(serialized);
   };
   const first=await post('Demirdöküm nitromiX F76');
   const second=await post('Hayır',first.stateToken,first.conversationToken,'safety-answer');
   const third=await post('Hayır',second.stateToken,second.conversationToken,'temperature-answer');
   const fourth=await post(story,third.stateToken,third.conversationToken,'timeline-answer'),state=decodeBoilerState(fourth.stateToken);
   assert.deepEqual([first,second,third,fourth].map(r=>r.visualProgress),[0,13,26,39]);
   assert.equal(fourth.aiText,'Şu anda resetten sonra bir süre çalışıyor mu, yoksa hata hemen tekrar mı geliyor?');
   assert.equal(fourth.resultState,'diagnosing');assert.equal(state.totalAskedQuestions,4);
   assert.equal(state.timeline.current.timing,null);assert.equal(state.timeline.current.persistent,true);
   assert.equal(state.timeline.historical.length,3);
   assert.deepEqual(fourth.candidateProbabilities.map(c=>c.name).sort(),[
    'Eşanjör/ısı bloğu sorunu','Kablolama/soket/bağlantı sorunu','Termik kapatma düzeneği sorunu',
   ].sort());
   const fifth=await post('hemen tekrar geliyor',fourth.stateToken,fourth.conversationToken,'clarification-answer'),resolved=decodeBoilerState(fifth.stateToken);
   assert.equal(fifth.visualProgress,52);assert.equal(fifth.answeredSystemQuestions,4);
   const repeated=await post('hemen tekrar geliyor',fifth.stateToken,fifth.conversationToken,'clarification-answer');
   assert.equal(repeated.visualProgress,52);assert.equal(repeated.stateToken,fifth.stateToken);
   assert.equal(resolved.timeline.current.timing,'immediate');assert.equal(resolved.totalAskedQuestions,4);
   assert.equal(resolved.answers.filter(a=>a.evidenceGroup==='fault_timing_after_start').length,1);
   assert.ok(fakeAICalls>0);assert.ok(calls.every(c=>c.host==='copa-fixture.supabase.co'));
  },{data});
 }finally{
  for(const name of envNames)if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];
 }
});
