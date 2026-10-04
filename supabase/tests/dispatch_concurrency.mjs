// Run only against the disposable `tekniko-operation-pg` Docker container.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync=promisify(execFile);
const container='tekniko-operation-pg';
const db='tekniko_operation_test';
const psqlArgs=['exec',container,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','postgres','-d',db];
async function query(sql){
  const {stdout}=await execFileAsync('docker',[...psqlArgs,'-c',sql],{maxBuffer:1024*1024});
  return stdout.trim();
}
async function outcome(sql){
  try{return {ok:true,value:await query(sql)};}
  catch(error){return {ok:false,error:String(error.stderr||error.message)};}
}
async function holdLock(sql){
  return new Promise((resolve,reject)=>{
    const child=spawn('docker',[...psqlArgs,'-c',`begin; ${sql}; select 'LOCKED'; select pg_sleep(3); commit;`]);
    let output=''; let errors=''; let ready=false;
    child.stdout.on('data',chunk=>{
      output+=chunk.toString();
      if(!ready&&output.includes('LOCKED')){ready=true;resolve(child);}
    });
    child.stderr.on('data',chunk=>{errors+=chunk.toString();});
    child.on('error',reject);
    child.on('exit',code=>{if(!ready)reject(new Error(`Lock session failed ${code}: ${errors}`));});
  });
}

assert.equal(await query('select current_database()'),db,'local database guard');
const ids={customer:randomUUID(),a:randomUUID(),b:randomUUID(),capacity:randomUUID(),
  request:randomUUID(),race:randomUUID(),first:randomUUID(),second:randomUUID(),
  keyRace1:randomUUID(),keyRace2:randomUUID()};
const uuid=(key)=>`'${ids[key]}'`;
await query(`
  insert into auth.users(id) values (${uuid('customer')}),(${uuid('a')}),(${uuid('b')}),(${uuid('capacity')});
  insert into public.users(id,name,role) values
    (${uuid('customer')},'TEST CUSTOMER','customer'),
    (${uuid('a')},'TEST A','technician'),
    (${uuid('b')},'TEST B','technician'),
    (${uuid('capacity')},'TEST CAPACITY','technician');
  insert into public.customer_profiles(user_id) values (${uuid('customer')});
  insert into public.cities default values;
  insert into public.districts(city_id) select id from public.cities order by id desc limit 1;
  insert into public.customer_addresses(customer_id,city_id,district_id)
    select ${uuid('customer')},c.id,d.id from public.cities c join public.districts d on d.city_id=c.id order by c.id desc,d.id desc limit 1;
  insert into public.technician_profiles(user_id,approval_status,is_available) values
    (${uuid('a')},'approved',true),(${uuid('b')},'approved',true),(${uuid('capacity')},'approved',true);
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    select x.id,c.id,null from (values (${uuid('a')}::uuid),(${uuid('b')}::uuid),(${uuid('capacity')}::uuid)) x(id)
    cross join lateral (select id from public.cities order by id desc limit 1) c;
  insert into public.technician_service_categories(technician_id,category_id)
    select x.id,c.id from (values (${uuid('a')}::uuid),(${uuid('b')}::uuid),(${uuid('capacity')}::uuid)) x(id)
    cross join public.service_categories c where c.code='boiler';
  insert into public.service_requests(id,customer_id,category_id,address_id)
    select ${uuid('request')},${uuid('customer')},c.id,a.id
    from public.service_categories c cross join public.customer_addresses a
    where c.code='boiler' and a.customer_id=${uuid('customer')}
    order by a.id limit 1;
  insert into public.service_dispatches(id,service_request_id,status) values
    (${uuid('race')},${uuid('request')},'broadcasting'),
    (${uuid('first')},${uuid('request')},'broadcasting'),
    (${uuid('second')},${uuid('request')},'broadcasting');
  insert into public.service_dispatch_candidates(dispatch_id,technician_id,status) values
    (${uuid('race')},${uuid('a')},'offered'),
    (${uuid('race')},${uuid('b')},'offered'),
    (${uuid('first')},${uuid('capacity')},'offered'),
    (${uuid('second')},${uuid('capacity')},'offered');
  insert into public.service_jobs(service_request_id,technician_id,status)
    values (${uuid('request')},${uuid('capacity')},'assigned');
`);

const dispatchLock=await holdLock(`select id from public.service_dispatches where id=${uuid('race')} for update`);
const race=await Promise.all([
  outcome(`set role service_role; select public.accept_service_dispatch(${uuid('race')},${uuid('a')},'race-${ids.race}-a')`),
  outcome(`set role service_role; select public.accept_service_dispatch(${uuid('race')},${uuid('b')},'race-${ids.race}-b')`)
]);
assert.equal(race.filter(x=>x.ok).length,1,'exactly one dispatch winner');
assert.equal(race.filter(x=>!x.ok).length,1,'exactly one dispatch loser');
assert.match(race.find(x=>!x.ok).error,/Dispatch is closed for acceptance/);
assert.equal(await query(`select count(*) from public.service_jobs where dispatch_id=${uuid('race')}`),'1');
assert.equal(await query(`select count(*) from public.service_dispatch_candidates where dispatch_id=${uuid('race')} and status='accepted'`),'1');
assert.equal(await query(`select count(*) from public.service_dispatch_candidates where dispatch_id=${uuid('race')} and status='withdrawn'`),'1');
assert.equal(await query(`select status from public.service_dispatches where id=${uuid('race')}`),'accepted');
assert.equal(await query(`select count(*) from public.operational_events where dispatch_id=${uuid('race')} and event_type='dispatch.accepted'`),'1');
assert.equal(dispatchLock.exitCode,0);
console.log('PASS: concurrent same-dispatch accept: one winner, one job, one withdrawn loser');

const technicianLock=await holdLock(`select id from public.users where id=${uuid('capacity')} for update`);
const capacityRace=await Promise.all([
  outcome(`set role service_role; select public.accept_service_dispatch(${uuid('first')},${uuid('capacity')},'capacity-${ids.first}')`),
  outcome(`set role service_role; select public.accept_service_dispatch(${uuid('second')},${uuid('capacity')},'capacity-${ids.second}')`)
]);
assert.equal(capacityRace.filter(x=>x.ok).length,1,'only second active job accepted');
assert.equal(capacityRace.filter(x=>!x.ok).length,1,'third active job rejected');
assert.match(capacityRace.find(x=>!x.ok).error,/Technician active job capacity reached/);
assert.equal(await query(`select count(*) from public.service_jobs where technician_id=${uuid('capacity')} and status in ('assigned','in_progress')`),'2');
assert.equal(technicianLock.exitCode,0);
console.log('PASS: concurrent capacity accept: active job count remains two');

await query(`
  insert into public.service_dispatches(id,service_request_id,status) values
    (${uuid('keyRace1')},${uuid('request')},'broadcasting'),
    (${uuid('keyRace2')},${uuid('request')},'broadcasting');
  insert into public.service_dispatch_candidates(dispatch_id,technician_id,status) values
    (${uuid('keyRace1')},${uuid('a')},'offered'),
    (${uuid('keyRace2')},${uuid('b')},'offered');
`);
const reusedKey=`shared-${ids.keyRace1}`;
const keyRace=await Promise.all([
  outcome(`set role service_role; select public.accept_service_dispatch(${uuid('keyRace1')},${uuid('a')},'${reusedKey}')`),
  outcome(`set role service_role; select public.accept_service_dispatch(${uuid('keyRace2')},${uuid('b')},'${reusedKey}')`)
]);
assert.equal(keyRace.filter(x=>x.ok).length,1,'shared key yields one acceptance');
assert.match(keyRace.find(x=>!x.ok).error,/Idempotency key belongs to another acceptance/);
assert.equal(await query(`select count(*) from public.service_jobs where idempotency_key='${reusedKey}'`),'1');
assert.equal(await query(`select count(*) from public.operational_events where dispatch_id in (${uuid('keyRace1')},${uuid('keyRace2')}) and event_type='dispatch.accepted'`),'1');
console.log('PASS: concurrent cross-context idempotency key reuse fails safely');
