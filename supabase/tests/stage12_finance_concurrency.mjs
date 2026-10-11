// Real two-connection races. Disposable local Stage 12 container only.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run=promisify(execFile);
const container=process.argv[2];
assert.equal(container,'tekniko-stage12-finance-pg','disposable Stage 12 container only');
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
const ids=Object.fromEntries(['customer','technician','address'].map(key=>[key,randomUUID()]));
const q=key=>`'${ids[key]}'`;
await sql(`
  update public.finance_runtime_config set gate_mode='test_only',provider='fake',environment='sandbox' where id=1;
  insert into auth.users(id,phone,phone_confirmed_at) values
    (${q('customer')},'+905559900001',now()),(${q('technician')},'+905559900002',now());
  insert into public.users(id,name,role,is_active,is_test) values
    (${q('customer')},'STAGE12 RACE CUSTOMER','customer',true,true),
    (${q('technician')},'STAGE12 RACE TECHNICIAN','technician',true,true);
  insert into public.customer_profiles(user_id) values(${q('customer')});
  insert into public.customer_addresses(
    id,customer_id,label,city,district,address_line,city_id,district_id,
    is_default,profile_slot,profile_archived_at
  ) select ${q('address')},${q('customer')},'Adres 1','Test','Test','Concurrency address',
      c.id,d.id,true,1,null
    from public.cities c join public.districts d on d.city_id=c.id
    order by c.id,d.id limit 1;
  insert into public.technician_profiles(user_id,approval_status,is_available)
    values(${q('technician')},'approved',true)
    on conflict(user_id) do update set
      approval_status=excluded.approval_status,is_available=excluded.is_available;
  insert into public.technician_service_categories(technician_id,category_id,approval_status)
    select ${q('technician')},id,'approved' from public.service_categories where code='boiler';
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    select ${q('technician')},id,null from public.cities order by id limit 1;
`);

const requestKey=`stage12-race-${randomUUID()}`;
const createRequest=`set role service_role;
  select public.create_payment_pending_service_request_v2(
    ${q('customer')},'boiler',${q('address')},'Race','Race request','stage12:race',
    '${requestKey}','{"schemaVersion":"1","category":"boiler"}'::jsonb,
    'immediate',null,'TRY',400,60,460,'{}'::jsonb,'pending:${requestKey}')::text`;
const createRace=await Promise.all([outcome(createRequest),outcome(createRequest)]);
assert.equal(createRace.filter(result=>result.ok).length,2,'concurrent request retries return safely');
const createResults=createRace.map(result=>JSON.parse(result.value.split(/\r?\n/).at(-1)));
assert.equal(createResults[0].id,createResults[1].id,'concurrent request retries reuse request');
assert.equal(createResults[0].paymentIntentId,createResults[1].paymentIntentId,
  'concurrent request retries reuse intent');
const created=createResults[0];
assert.ok(created.id&&created.quoteId&&created.paymentIntentId);
assert.equal(await sql(`select count(*) from public.service_requests
  where customer_id=${q('customer')} and request_key='${requestKey}'`),'1','one request');
assert.equal(await sql(`select count(*) from public.finance_payment_intents
  where service_request_id='${created.id}' and purpose='initial'`),'1','one initial intent');

const authorize=key=>`set role service_role; select public.finance_fake_authorize(
  '${created.paymentIntentId}'::uuid,'${key}',true)::text`;
const authRace=await Promise.all([
  outcome(authorize(`approve:${randomUUID()}`)),
  outcome(authorize(`approve:${randomUUID()}`)),
]);
assert.equal(authRace.filter(result=>result.ok).length,2,'both retries return safely');
assert.equal(await sql(`select count(*) from public.finance_transactions
  where intent_id='${created.paymentIntentId}' and operation='authorize' and status='succeeded'`),'1',
  'one successful provider authorization');
assert.equal(await sql(`select count(*) from public.finance_transactions
  where intent_id='${created.paymentIntentId}' and operation='authorize' and status='no_op'`),'1',
  'second distinct retry is audited as no-op');

const release=`set role service_role; select public.finance_release_fake_sandbox_request(
  '${created.id}'::uuid)::text`;
const releaseRace=await Promise.all([outcome(release),outcome(release)]);
assert.equal(releaseRace.filter(result=>result.ok).length,2,'concurrent releases return safely');
assert.equal(await sql(`select count(*) from public.service_distribution_cycles
  where service_request_id='${created.id}' and source_job_id is null`),'1',
  'one initial distribution cycle');

await sql(`update public.technician_service_categories c
  set approval_status='approved'
  from public.service_requests r
  where r.id='${created.id}' and c.technician_id=${q('technician')}
    and c.category_id=r.category_id`);
const dispatchId=await sql(`select id from public.service_dispatches
  where service_request_id='${created.id}' and status='broadcasting'
  order by created_at desc limit 1`);
assert.ok(dispatchId,'released request has a broadcasting dispatch');
await sql(`insert into public.service_dispatch_candidates(
    dispatch_id,technician_id,status,offered_at
  ) values('${dispatchId}',${q('technician')},'offered',now())
  on conflict(dispatch_id,technician_id) do update
    set status='offered',offered_at=excluded.offered_at,responded_at=null`);
const jobId=await sql(`set role service_role; select public.accept_service_dispatch(
  '${dispatchId}'::uuid,${q('technician')},'stage12:race:accept:${created.id}')`);
const complete=`set role service_role; select public.complete_service_job(
  '${jobId}'::uuid,${q('technician')})`;
const captureRace=await Promise.all([outcome(complete),outcome(complete)]);
assert.equal(captureRace.filter(result=>result.ok).length,2,'completion retries return safely');
assert.equal(await sql(`select count(*) from public.finance_transactions
  where intent_id='${created.paymentIntentId}' and operation='capture' and status='succeeded'`),'1',
  'one capture transaction');
assert.equal(await sql(`select count(*) from (
    select transaction_id from public.finance_ledger_entries
    where intent_id='${created.paymentIntentId}' group by transaction_id
    having sum(case when direction='debit' then amount else -amount end)<>0
  ) unbalanced`),'0','all capture ledger entries balance');

console.log('PASS: concurrent authorization has one provider success and one no-op');
console.log('PASS: concurrent request creation has one request and one intent');
console.log('PASS: concurrent release has one initial distribution cycle');
console.log('PASS: concurrent completion has one capture and balanced ledger');
