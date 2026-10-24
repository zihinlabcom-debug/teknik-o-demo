import './helpers/register-t88-read-optimizations.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReadFixture,withReadFixture} from './helpers/t88-read-db-double.mjs';
const {adminRequestTableRows}=await import('../apps/admin/src/lib/admin-request-list.ts');
const {adminRequestList}=await import('../src/lib/admin-request-read.ts');

function fixture(options={}){return makeReadFixture({account:{id:'admin',role:'admin'},tables:{
  service_requests:[{id:'a',customer_id:'c',category_id:'cat',status:'created',created_at:'2026-01-01'},{id:'b',customer_id:'other',category_id:'missing',status:'unknown',created_at:'2026-01-02'}],
  users:[{id:'c',name:'Sentetik müşteri',is_test:true},{id:'other',name:'Sentetik gerçek',is_test:false}],
  service_categories:[{id:'cat',name:'Temizlik'}],
  service_quotes:[{service_request_id:'a',status:'offered',total_amount:1,currency:'TRY'},{service_request_id:'a',status:'accepted',total_amount:3041.75,currency:'TRY'},{service_request_id:'a',status:'accepted',total_amount:99,currency:'EUR'}],
  service_jobs:[{service_request_id:'a',technician_id:'t',status:'completed'}],
},...options});}
const withoutJob=rows=>rows.map(({job,...rest})=>rest);
async function compare(old,current){const expected=await withReadFixture(old,adminRequestList),actual=await withReadFixture(current,adminRequestTableRows);assert.deepEqual(actual,withoutJob(expected));return {expected,actual};}

test('admin table preserves all visible fields, status, test flag and first accepted quote; 5 reads become 4',async()=>{
  const old=fixture(),current=fixture(),{expected,actual}=await compare(old,current);
  assert.equal(old.calls.length,5);assert.equal(current.calls.length,4);
  assert.ok(!current.calls.some(x=>x.table==='service_jobs'));assert.ok(expected.find(x=>x.id==='a').job);
  assert.deepEqual(actual.map(x=>x.id),['b','a']);assert.equal(actual[1].status,'created');assert.equal(actual[0].status,'unknown');
  assert.equal(actual[1].quote.total_amount,3041.75);assert.equal(actual[1].quote.currency,'TRY');
  assert.equal(actual[1].customer.is_test,true);assert.equal(actual[0].customer.is_test,false);
  assert.equal(current.calls[0].cap,200);assert.deepEqual(current.calls[0].sorts,[['created_at',false]]);
});
test('admin empty list performs only the parent query',async()=>{
  const old=fixture(),current=fixture();old.tables.service_requests=[];current.tables.service_requests=[];
  await compare(old,current);assert.equal(current.calls.length,1);
});
for(const table of ['users','service_categories','service_quotes']){
  test('admin missing relation preserves null: '+table,async()=>{const old=fixture(),current=fixture();old.tables[table]=[];current.tables[table]=[];await compare(old,current);});
  test('admin relation error preserves old fallback: '+table,async()=>{await compare(fixture({errors:{[table]:{message:'test'}}}),fixture({errors:{[table]:{message:'test'}}}));});
}
test('admin 200-row limit and descending order remain identical',async()=>{
  const old=fixture(),current=fixture(),rows=Array.from({length:205},(_,i)=>({id:String(i),customer_id:null,category_id:null,status:'created',created_at:String(i).padStart(4,'0')}));
  old.tables.service_requests=rows;current.tables.service_requests=structuredClone(rows);
  const {actual}=await compare(old,current);assert.equal(actual.length,200);assert.equal(actual[0].id,'204');assert.equal(actual.at(-1).id,'5');
});
test('admin parent error is not converted to an empty success',async()=>{
  const f=fixture({errors:{service_requests:{message:'synthetic'}}});
  await assert.rejects(()=>withReadFixture(f,adminRequestTableRows),e=>e.status===500);assert.equal(f.calls.length,1);
});
for(const account of [null,{id:'c',role:'customer'},{id:'t',role:'technician'}]){
  test('admin privileged reads require authorized admin result: '+(account?.role??'null'),async()=>{
    const f=fixture({account});await assert.rejects(()=>withReadFixture(f,adminRequestTableRows),e=>e.status===(account?403:401));
    assert.equal(f.calls.length,0);assert.equal(f.adminClients,0);
  });
}
test('admin subsequent revoked account is rechecked',async()=>{
  const f=fixture();await withReadFixture(f,adminRequestTableRows);const reads=f.calls.length;f.account=null;
  await assert.rejects(()=>withReadFixture(f,adminRequestTableRows),e=>e.status===401);assert.equal(f.calls.length,reads);assert.equal(f.authReads,2);
});
