import './helpers/register-technician-management.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calls,setAccount,setResponse} from './helpers/technician-management-db-double.mjs';
const {adminChangeTechnician,setOwnTechnicianAvailability}=await import('../src/lib/technician-management.ts');

const adminId='10000000-0000-4000-8000-000000000001';
const technicianId='20000000-0000-4000-8000-000000000002';
const categoryId='30000000-0000-4000-8000-000000000003';
const account=(id,role)=>({id,role,is_active:true,is_test:true});

test('admin mutation binds actor to authenticated account, not caller input',async()=>{
  calls.length=0;setAccount(account(adminId,'admin'));setResponse({data:true,error:null});
  assert.deepEqual(await adminChangeTechnician(technicianId,{action:'category_add',categoryId,
    actorId:technicianId}),{changed:true});
  assert.equal(calls.length,1);
  assert.equal(calls[0].name,'admin_change_technician');
  assert.equal(calls[0].args.p_actor_id,adminId);
  assert.equal(calls[0].args.p_technician_id,technicianId);
  assert.equal(calls[0].args.p_category_id,categoryId);
  assert.equal('actorId' in calls[0].args,false);
});

test('customer and technician cannot invoke admin mutation',async()=>{
  calls.length=0;
  for(const role of ['customer','technician']){
    setAccount(account(technicianId,role));
    await assert.rejects(adminChangeTechnician(technicianId,{action:'approve'}),
      error=>error.status===403);
  }
  assert.equal(calls.length,0);
});

test('availability changes only authenticated technician own ID and is not a client target',async()=>{
  calls.length=0;setAccount(account(technicianId,'technician'));setResponse({data:false,error:null});
  assert.deepEqual(await setOwnTechnicianAvailability(true),{changed:false});
  assert.deepEqual(calls[0],{name:'set_technician_availability',
    args:{p_actor_id:technicianId,p_is_available:true}});
  setAccount(account(adminId,'admin'));
  await assert.rejects(setOwnTechnicianAvailability(true),error=>error.status===403);
});

test('invalid technician action, ID and availability never reach database',async()=>{
  calls.length=0;setAccount(account(adminId,'admin'));
  await assert.rejects(adminChangeTechnician(technicianId,{action:'arbitrary'}),error=>error.status===400);
  await assert.rejects(adminChangeTechnician('invalid',{action:'approve'}),error=>error.status===400);
  setAccount(account(technicianId,'technician'));
  await assert.rejects(setOwnTechnicianAvailability('yes'),error=>error.status===400);
  assert.equal(calls.length,0);
});

test('browser route does not accept actor identity or service-role credentials',()=>{
  const route=readFileSync(new URL('../src/app/api/admin/technicians/[id]/route.ts',import.meta.url),'utf8');
  const availability=readFileSync(new URL('../src/app/api/technician/availability/route.ts',import.meta.url),'utf8');
  assert.doesNotMatch(route,/body\.(?:actorId|actorUserId|serviceRoleKey)/);
  assert.doesNotMatch(availability,/body\.(?:technicianId|actorId|serviceRoleKey)/);
});
