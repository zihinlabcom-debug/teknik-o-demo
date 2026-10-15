// Real two-connection races. Disposable, labelled Stage 5.2 container only.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run=promisify(execFile);
const container=process.argv[2];
assert.equal(container,'hizmetpey-stage5-iyzico-pg','isolated Stage 5 container only');
const database='tekniko_stage10_test';
const args=['exec',container,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1',
  '-U','postgres','-d',database];

async function sql(source){
  const {stdout}=await run('docker',[...args,'-c',source],{maxBuffer:1024*1024});
  return stdout.trim();
}
async function outcome(source){
  try{return {ok:true,value:await sql(source)};}
  catch(error){return {ok:false,error:String(error.stderr||error.message)};}
}

assert.equal(await sql('select current_database()'),database);
const label=await run('docker',['inspect','-f',
  '{{ index .Config.Labels "hizmetpey.scope" }}',container]);
assert.equal(label.stdout.trim(),'stage5-iyzico-local','container label');
const network=await run('docker',['inspect','-f','{{.HostConfig.NetworkMode}}',container]);
assert.equal(network.stdout.trim(),'none','container network isolation');

const scope=JSON.parse(await sql(`
  select json_build_object(
    'intentId',i.id,'requestId',i.service_request_id,'customerId',i.customer_id,
    'amount',i.amount,'currency',i.currency
  )::text
  from public.finance_payment_intents i
  join public.service_requests r on r.id=i.service_request_id
  where r.request_key='stage5-iyzico-local-request-1'
`));
assert.equal(scope.currency,'TRY');

await sql(`update public.finance_runtime_config
  set gate_mode='test_only',provider='iyzico',environment='sandbox',
      iyzico_sandbox_enabled=true where id=1`);

const suffix=randomUUID().replaceAll('-','');
const operationId=`stage5:concurrency:${suffix}`;
const businessKey=`stage5:concurrency:${suffix}`;
const conversationId=`stage5:conversation:${suffix}`;
const fingerprint='e'.repeat(64);
const claim=`set role service_role; select public.finance_iyzico_claim_operation(
  '${scope.intentId}'::uuid,'${scope.requestId}'::uuid,'${scope.customerId}'::uuid,null,
  'authorize','${operationId}','${businessKey}','${conversationId}',
  '${fingerprint}',${scope.amount},'TRY','${scope.requestId}',null,null,null)::text`;
const races=await Promise.all(Array.from({length:8},()=>outcome(claim)));
assert.equal(races.filter(result=>result.ok).length,8,'all idempotent claim attempts return');
const claims=races.map(result=>JSON.parse(result.value.split(/\r?\n/).at(-1)));
assert.equal(claims.filter(result=>result.kind==='claimed').length,1,'one claim winner');
assert.equal(claims.filter(result=>result.kind==='existing').length,7,'seven existing replies');
assert.equal(await sql(`select count(*) from public.finance_iyzico_operations
  where operation_id='${operationId}'`),'1','one durable operation');

await sql(`update public.finance_iyzico_operations
  set lease_expires_at=clock_timestamp()-interval '1 second'
  where operation_id='${operationId}'`);
const interrupt=`set role service_role; select public.finance_iyzico_mark_interrupted_unknown(
  '${operationId}',1,'interrupted_before_confirmation')::text`;
const interruptions=await Promise.all([outcome(interrupt),outcome(interrupt)]);
assert.equal(interruptions.filter(result=>result.ok).length,1,'one CAS interruption winner');
assert.equal(interruptions.filter(result=>!result.ok).length,1,'one stale revision rejection');
assert.match(interruptions.find(result=>!result.ok).error,/interruption conflict/i);
assert.equal(await sql(`select state||':'||revision from public.finance_iyzico_operations
  where operation_id='${operationId}'`),'unknown:2','durable unknown CAS result');

await sql(`update public.finance_runtime_config
  set iyzico_sandbox_enabled=false,gate_mode='test_only',provider='fake',environment='sandbox'
  where id=1`);

console.log('PASS: eight concurrent claims produced one owner and one durable row');
console.log('PASS: concurrent interruption used revision CAS and retained unknown state');
