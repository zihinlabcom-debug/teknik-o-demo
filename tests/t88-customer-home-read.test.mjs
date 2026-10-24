import './helpers/register-t88-read-optimizations.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReadFixture,withReadFixture} from './helpers/t88-read-db-double.mjs';
const {getCustomerHomeSummary}=await import('../apps/customer/src/lib/customer-home-read.ts');
const {getCustomerProfile}=await import('../apps/customer/src/lib/profile-server.ts');

const id='10000000-0000-4000-8000-000000000001';
function tables(){return {
  users:[{id,name:'  Test Müşteri',phone:'synthetic',email:'unused@example.invalid'}],
  customer_profiles:[{user_id:id,avatar_path:'synthetic/avatar.png'}],
  customer_addresses:[
    {customer_id:id,profile_slot:2,profile_archived_at:null,city_id:2,district_id:22},
    {customer_id:id,profile_slot:0,profile_archived_at:'archived',city_id:2,district_id:22},
    {customer_id:id,profile_slot:null,profile_archived_at:null,city_id:2,district_id:22},
    {customer_id:'another',profile_slot:0,profile_archived_at:null,city_id:2,district_id:22},
    {customer_id:id,profile_slot:1,profile_archived_at:null,city_id:1,district_id:11}],
  cities:[{id:1,name:'İl',is_active:true,plate_code:1},{id:2,name:'Başka',is_active:true,plate_code:2}],
  districts:[{id:11,city_id:1,name:'İlçe',is_active:true},{id:22,city_id:2,name:'Başka ilçe',is_active:true}],
};}
function project(p){const a=p.addresses[0];return {name:p.name,avatarUrl:p.avatarUrl,
  location:[p.cities.find(x=>x.id===a?.cityId)?.name,p.districts.find(x=>x.id===a?.districtId)?.name].filter(Boolean).join(', ')||'Konum bilgisi eklenmemiş'};}
async function compare(data,options={}){
  const old=makeReadFixture({tables:structuredClone(data),...options}),current=makeReadFixture({tables:structuredClone(data),...options});
  assert.deepEqual(await withReadFixture(current,getCustomerHomeSummary),project(await withReadFixture(old,getCustomerProfile)));
  return {old,current};
}

test('customer summary matches profile projection and reduces returned rows/fields',async()=>{
  const {old,current}=await compare(tables());
  assert.equal(old.extraUserReads,1);assert.equal(current.extraUserReads,0);
  assert.equal(current.authReads,1);
  assert.equal(current.calls.length,5);assert.ok(current.returnedRows<old.returnedRows);
  assert.deepEqual(current.signed,old.signed);
  assert.deepEqual(current.signed,[{bucket:'profile-avatars',path:'synthetic/avatar.png',expiresIn:600}]);
  assert.equal(current.calls.find(x=>x.table==='customer_addresses').cap,1);
  for(const table of ['cities','districts']){
    const q=current.calls.find(x=>x.table===table);
    assert.ok(q.filters.some(([op,key])=>op==='eq'&&key==='id'));
    assert.ok(q.filters.some(([op,key,v])=>op==='eq'&&key==='is_active'&&v===true));
  }
  assert.equal(current.calls.find(x=>x.table==='users').columns,'id,name');
  assert.equal(current.calls.find(x=>x.table==='customer_addresses').columns,'city_id,district_id');
});

for(const scenario of ['no-address','inactive-city','inactive-district','missing-city','missing-district','no-profile','no-avatar','null-ids','independent-district']){
  test('customer projection equality: '+scenario,async()=>{
    const data=tables();
    if(scenario==='no-address')data.customer_addresses=[];
    if(scenario==='inactive-city')data.cities[0].is_active=false;
    if(scenario==='inactive-district')data.districts[0].is_active=false;
    if(scenario==='missing-city')data.cities=data.cities.slice(1);
    if(scenario==='missing-district')data.districts=data.districts.slice(1);
    if(scenario==='no-profile')data.customer_profiles=[];
    if(scenario==='no-avatar')data.customer_profiles[0].avatar_path=null;
    if(scenario==='null-ids')Object.assign(data.customer_addresses.at(-1),{city_id:null,district_id:null});
    if(scenario==='independent-district')data.districts[0].city_id=999;
    const {current}=await compare(data);
    if(scenario==='no-address')assert.equal(current.calls.length,3);
  });
}
test('customer signing failure keeps the same null avatar fallback',async()=>{await compare(tables(),{avatarError:true});});
for(const table of ['users','customer_profiles','customer_addresses','cities','districts']){
  test('customer fails closed on required read error: '+table,async()=>{
    const f=makeReadFixture({tables:tables(),errors:{[table]:{message:'synthetic failure'}}});
    await assert.rejects(()=>withReadFixture(f,getCustomerHomeSummary),e=>e.code==='profile_unavailable'&&e.status===503);
  });
}
test('customer missing user keeps profile_unavailable',async()=>{
  const data=tables();data.users=[];
  await assert.rejects(()=>withReadFixture(makeReadFixture({tables:data}),getCustomerHomeSummary),e=>e.code==='profile_unavailable');
});
for(const account of [null,{id,role:'technician'},{id,role:'admin'}]){
  test('customer rejects unauthenticated/wrong-role before privileged reads: '+(account?.role??'null'),async()=>{
    const f=makeReadFixture({account,tables:tables()});
    await assert.rejects(()=>withReadFixture(f,getCustomerHomeSummary),e=>e.status===(account?403:401));
    assert.equal(f.adminClients,0);assert.equal(f.calls.length,0);
  });
}
test('customer parallel users and later request do not share profile results',async()=>{
  const a=makeReadFixture({tables:tables()}),data=tables(),other='20000000-0000-4000-8000-000000000002';
  data.users=[{id:other,name:'Diğer'}];data.customer_addresses=[];data.customer_profiles=[];
  const b=makeReadFixture({account:{id:other,role:'customer'},tables:data});
  const [left,right]=await Promise.all([withReadFixture(a,getCustomerHomeSummary),withReadFixture(b,getCustomerHomeSummary)]);
  assert.equal(left.name,'  Test Müşteri');assert.equal(right.name,'Diğer');
  for(const f of [a,b])for(const q of f.calls.filter(x=>['users','customer_profiles','customer_addresses'].includes(x.table)))assert.ok(q.filters.some(([,key,v])=>['id','user_id','customer_id'].includes(key)&&v===f.account.id));
  a.tables.users[0].name='Yeni ad';assert.equal((await withReadFixture(a,getCustomerHomeSummary)).name,'Yeni ad');
  a.account=null;await assert.rejects(()=>withReadFixture(a,getCustomerHomeSummary),e=>e.status===401);
});
