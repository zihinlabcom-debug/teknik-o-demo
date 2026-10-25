import './helpers/register-t88-read-optimizations.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeReadFixture,withReadFixture} from './helpers/t88-read-db-double.mjs';
const {completeTechnicianJob}=await import('../apps/technician/src/lib/operation-server.ts');
const job='20000000-0000-4000-8000-000000000002',tech='10000000-0000-4000-8000-000000000001';
test('technician completion only persists a report; no provider preparation or capture',async()=>{
 const f=makeReadFixture({account:{id:tech,role:'technician'}}),calls=[];
 f.db.rpc=async(name,params)=>{calls.push({name,params});return {data:job,error:null};};
 const result=await withReadFixture(f,()=>completeTechnicianJob(job));
 assert.deepEqual(result,{id:job,completion:'awaiting_customer'});
 assert.deepEqual(calls,[{name:'complete_service_job',params:{p_job_id:job,p_technician_id:tech}}]);
 assert.equal(f.calls.length,0);
 const source=readFileSync(new URL('../apps/technician/src/lib/operation-server.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source.slice(source.indexOf('export async function completeTechnicianJob'),source.indexOf('type AppointmentDbError')),/captureCompletedIyzicoJob|prepareIyzicoJobCompletion|\.capture\(/);
});
for(const [account,status] of [[null,401],[{id:tech,role:'customer'},403]])test('completion role rejected before RPC '+status,async()=>{
 const f=makeReadFixture({account});f.db.rpc=()=>{throw Error('RPC must not be called');};
 await assert.rejects(()=>withReadFixture(f,()=>completeTechnicianJob(job)),e=>e.status===status);
});
test('completion RPC rejection cannot return pending success',async()=>{
 const f=makeReadFixture({account:{id:tech,role:'technician'}});f.db.rpc=async()=>({data:null,error:{message:'Invalid job status'}});
 await assert.rejects(()=>withReadFixture(f,()=>completeTechnicianJob(job)),e=>e.status===409);
});
