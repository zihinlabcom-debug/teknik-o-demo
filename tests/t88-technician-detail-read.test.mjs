import './helpers/register-t88-read-optimizations.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeReadFixture,withReadFixture} from './helpers/t88-read-db-double.mjs';
const {technicianJobDetail}=await import('../apps/technician/src/lib/operation-server.ts');

const id='10000000-0000-4000-8000-000000000001',jobId='20000000-0000-4000-8000-000000000002';
function fixture(options={}){return makeReadFixture({account:{id,role:'technician'},tables:{
  service_jobs:[{id:jobId,service_request_id:'request',technician_id:id,status:'completed',accepted_quote_id:'quote',assigned_at:'2020-01-01',started_at:'2020-01-01',completed_at:'2020-01-02',cancelled_at:null}],
  service_requests:[{id:'request',category_id:'category',address_id:'address',status:'completed',requested_service_mode:'scheduled',requested_service_date:'2020-01-01'}],
  service_quotes:[{id:'quote',total_amount:3041.75,currency:'TRY',status:'accepted'}],
  service_appointments:[{id:'appointment',job_id:jobId,status:'completed',starts_at:'2020-01-01',ends_at:'2020-01-02'}],
  service_categories:[{id:'category',name:'Temizlik'}],customer_addresses:[{id:'address',address_line:'Sentetik adres',label:'Ev',city_id:1,district_id:11}],
},...options});}
const run=f=>withReadFixture(f,()=>technicianJobDetail(jobId));

test('technician category and address start together only after ownership/parent reads',async()=>{
  let release;const gate=new Promise(r=>{release=r;});const started=[];
  const timer=setTimeout(()=>release(),5000);
  const f=fixture({beforeQuery:async(q,state)=>{
    if(!['service_categories','customer_addresses'].includes(q.table))return;
    assert.ok(state.calls.some(x=>x.table==='service_jobs'&&x.filters.some(([,key,v])=>key==='technician_id'&&v===id)));
    assert.ok(state.calls.some(x=>x.table==='service_requests'));
    started.push(q.table);if(started.length===2)release();await gate;
    assert.equal(started.length,2,'Both independent reads must start before either completes');
  }});
  try{const d=await run(f);
    assert.deepEqual(d.category,{name:'Temizlik'});assert.equal(d.address.address_line,'Sentetik adres');
    assert.equal(d.id,jobId);assert.equal(d.status,'completed');assert.equal(d.quote.total_amount,3041.75);
    assert.equal(d.request.requested_service_date,'2020-01-01');assert.equal(d.appointments[0].status,'completed');
    assert.equal(d.has_active_appointment,false);assert.equal(d.appointment_scheduling_expired,false);assert.equal(d.scheduled_service_date_reached,true);
    assert.equal(f.calls.length,6);
  }finally{clearTimeout(timer);release();}
});
for(const table of ['service_categories','customer_addresses']){
  test('technician missing optional record keeps null: '+table,async()=>{const f=fixture();f.tables[table]=[];const d=await run(f);assert.equal(table==='service_categories'?d.category:d.address,null);});
  test('technician optional read DB error keeps prior data-null behavior: '+table,async()=>{const f=fixture({errors:{[table]:{message:'test'}}});const d=await run(f);assert.equal(table==='service_categories'?d.category:d.address,null);});
  test('technician optional query rejection is not swallowed: '+table,async()=>{const err=Error('synthetic rejection');await assert.rejects(()=>run(fixture({reject:{[table]:err}})),e=>e===err);});
}
test('technician absent category/address IDs skip both reads',async()=>{
  const f=fixture();Object.assign(f.tables.service_requests[0],{category_id:null,address_id:null});
  const d=await run(f);assert.equal(d.category,null);assert.equal(d.address,null);assert.equal(f.calls.length,4);
});
for(const mode of ['wrong-owner','missing-job','job-error','invalid-id','signed-out','customer-role']){
  test('technician no dependent reads after rejection: '+mode,async()=>{
    const f=fixture();
    if(mode==='wrong-owner')f.tables.service_jobs[0].technician_id='another';
    if(mode==='missing-job')f.tables.service_jobs=[];
    if(mode==='job-error')f.errors.service_jobs={message:'synthetic'};
    if(mode==='signed-out')f.account=null;
    if(mode==='customer-role')f.account.role='customer';
    await assert.rejects(()=>withReadFixture(f,()=>technicianJobDetail(mode==='invalid-id'?'bad':jobId)),e=>e.status===(mode==='invalid-id'?400:mode==='signed-out'?401:mode==='customer-role'?403:mode==='job-error'?500:404));
    assert.ok(f.calls.every(x=>x.table==='service_jobs'));
  });
}
