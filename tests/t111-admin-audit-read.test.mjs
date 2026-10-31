import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {operationEventLabel} from '../apps/admin/src/lib/operation-presentation.ts';
const id='12345678-1234-4234-8234-123456789abc';
function load(actor,error=null){
 let calls=0;const records=[{id,reason:'Internal verified financial reason',evidence_ids:[id]}];
 const db={
  rpc:async()=>{calls++;return {data:{request:{id}},error:null};},
  from(table){calls++;assert.equal(table,'t111_finance_decisions');return {
   select(columns){assert.ok(!columns.includes('*'));return {
    eq(column,value){assert.equal(column,'service_request_id');assert.equal(value,id);return {order:async()=>({data:records,error})};}
   };}
  };}
 };
 const modules={'server-only':{},'./account-supabase':{adminSupabase:()=>db},'../../../../src/lib/operation-guard':{
  requireRole:async role=>{assert.equal(role,'admin');if(actor?.role!=='admin')throw Error('FORBIDDEN');return actor;},
  requireId:value=>assert.equal(value,id),failDb:()=>{throw Error('AUDIT_READ_FAILED');}
 },'../../../../src/lib/t100-rpc':{t100Rpc:async(db,name,args)=>{assert.equal(name,'t111_admin_request_detail');assert.equal(args.p_admin_id,actor.id);assert.equal(args.p_history,true);return (await db.rpc()).data;}}};
 const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../apps/admin/src/lib/t111-admin-read.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{exports,Buffer,require:n=>{assert.ok(n in modules);return modules[n];}});
 return {read:()=>exports.adminRequestHistory(id),calls:()=>calls};
}
for(const actor of [null,{id,role:'customer'},{id,role:'technician'}])test('financial audit history requires admin before any privileged read: '+(actor?.role??'anonymous'),async()=>{const f=load(actor);await assert.rejects(f.read,/FORBIDDEN/);assert.equal(f.calls(),0);});
test('admin audit reads are scoped to the same service and include immutable reason/evidence',async()=>{const f=load({id,role:'admin'});const data=await f.read();assert.equal(data.request.id,id);assert.equal(data.financeDecisions[0].reason,'Internal verified financial reason');assert.equal(f.calls(),2);});
test('failed audit reads do not masquerade as an empty audit trail',async()=>{const f=load({id,role:'admin'},{message:'read unavailable'});await assert.rejects(f.read,/AUDIT_READ_FAILED/);});
test('recording an admin decision never claims provider capture or bank payment',()=>{const label=operationEventLabel('admin.finance_decision_recorded');assert.equal(label,'Admin kanıta bağlı finans kararı kaydetti');assert.doesNotMatch(label,/tahsil edildi|ödendi|başarılı/i);assert.equal(operationEventLabel('admin.unknown_finance_decision'),'Tanımlanmamış teknik olay');});
