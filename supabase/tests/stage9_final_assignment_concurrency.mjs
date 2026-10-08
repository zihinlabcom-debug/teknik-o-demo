// Real two-connection race. Run only against the disposable local container.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run=promisify(execFile);
const container=process.argv[2];
assert.equal(container,'tekniko-stage9-3-pg','disposable Stage 9.3 container only');
const args=['exec',container,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1',
  '-U','postgres','-d','tekniko_operation_test'];
async function sql(source){
  const {stdout}=await run('docker',[...args,'-c',source],{maxBuffer:1024*1024});
  return stdout.trim();
}
async function outcome(source){
  try{return {ok:true,value:await sql(source)};}
  catch(error){return {ok:false,error:String(error.stderr||error.message)};}
}

assert.equal(await sql('select current_database()'),'tekniko_operation_test');
const ids=Object.fromEntries(['customer','admin','a','b','request','quote'].map(key=>[key,randomUUID()]));
const q=key=>`'${ids[key]}'`;
await sql(`
  insert into auth.users(id) values(${q('customer')}),(${q('admin')}),(${q('a')}),(${q('b')});
  insert into public.users(id,name,role,is_active) values
    (${q('customer')},'STAGE93 RACE CUSTOMER','customer',true),
    (${q('admin')},'STAGE93 RACE ADMIN','admin',true),
    (${q('a')},'STAGE93 RACE A','technician',true),
    (${q('b')},'STAGE93 RACE B','technician',true);
  insert into public.customer_profiles(user_id) values(${q('customer')});
  insert into public.cities default values;
  insert into public.districts(city_id) select id from public.cities order by id desc limit 1;
  insert into public.customer_addresses(customer_id,city_id,district_id)
    select ${q('customer')},c.id,d.id from public.cities c
    join public.districts d on d.city_id=c.id order by c.id desc limit 1;
  insert into public.technician_profiles(user_id,approval_status,is_available) values
    (${q('a')},'approved',true),(${q('b')},'approved',false);
  insert into public.technician_service_categories(technician_id,category_id,approval_status)
    select x.id,c.id,'approved' from (values(${q('a')}::uuid),(${q('b')}::uuid))x(id)
    cross join public.service_categories c where c.code='boiler';
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    select x.id,c.id,null from (values(${q('a')}::uuid),(${q('b')}::uuid))x(id)
    cross join lateral(select id from public.cities order by id desc limit 1)c;
  insert into public.service_requests(id,customer_id,category_id,address_id)
    select ${q('request')},${q('customer')},c.id,a.id from public.service_categories c
    cross join lateral(select id from public.customer_addresses
      where customer_id=${q('customer')} order by id desc limit 1)a
    where c.code='boiler';
  insert into public.service_quotes(id,service_request_id,version,status,currency,subtotal,service_fee,total_amount,offered_at)
    values(${q('quote')},${q('request')},1,'offered','TRY',100,15,115,now());
  select public.accept_service_quote(${q('quote')},${q('customer')});
  select public.start_service_distribution_cycle(${q('request')},${q('quote')},null);
`);
for(let round=1;round<=3;round++){
  await sql(`update public.service_distribution_cycles set next_round_at=now()-interval '1 minute'
    where service_request_id=${q('request')} and status='active';
    select public.advance_service_distribution_cycles();`);
}
assert.equal(await sql(`select public.admin_manual_assignment_ready(${q('request')})`),'t');
const keyA=`stage93-race-${randomUUID()}`,keyB=`stage93-race-${randomUUID()}`;
const call=(tech,key)=>`select public.admin_manual_assign_service_job(
  ${q('request')},${q(tech)},${q('admin')},'Concurrent manual assignment','${key}')`;
const results=await Promise.all([outcome(call('a',keyA)),outcome(call('b',keyB))]);
assert.equal(results.filter(result=>result.ok).length,1,'exactly one manual assignment succeeds');
assert.match(results.find(result=>!result.ok).error,/Request already has an active job|Manual assignment requires/);
assert.equal(await sql(`select count(*) from public.service_jobs
  where service_request_id=${q('request')} and status='assigned'`),'1');
assert.equal(await sql(`select count(*) from public.operational_events
  where service_request_id=${q('request')} and event_type='admin.manual_assignment'`),'1');
const winner=results[0].ok?['a',keyA,results[0].value]:['b',keyB,results[1].value];
assert.equal(await sql(call(winner[0],winner[1])),winner[2],'idempotent retry returns same job');
assert.equal(await sql(`select count(*) from public.operational_events
  where service_request_id=${q('request')} and event_type='admin.manual_assignment'`),'1');
console.log('PASS: concurrent manual assignment has one winner, one active job and one audit event');
