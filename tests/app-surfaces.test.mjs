import './helpers/register-account-surface.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acceptsAccountRole,authorizePath} from '../src/lib/account-auth.ts';
import {appSurface,surfaceAllowsPath,surfaceHome} from '../src/lib/app-surface.ts';
import {setFakeAccount,changeFakeRole,fakeStats} from './helpers/account-surface-db-double.mjs';

const {requestOtp,verifyOtp}=await import('../src/lib/account-otp.ts');
const {parseTechnicianApplication,sealTechnicianApplication,openTechnicianApplication}=
  await import('../src/lib/technician-onboarding.ts');
const phone='5000000701';

test('customer/technician OTP combinations enforce exact role; admin OTP is disabled',async()=>{
  const roles=['customer','technician','admin'];
  for(const expectedRole of ['customer','technician']){
    for(const actualRole of roles){
      setFakeAccount({id:'00000000-0000-4000-8000-000000000701',email:null,
        role:actualRole,is_test:false,is_active:true});
      const accepted=actualRole===expectedRole;
      assert.equal(acceptsAccountRole(actualRole,expectedRole),accepted);
      const requested=await requestOtp({phone,mode:'login',expectedRole});
      assert.equal(requested.ok,accepted,`${expectedRole}/${actualRole} request`);
      const verified=await verifyOtp({phone,token:'123456',expectedRole});
      assert.equal(verified.ok,accepted,`${expectedRole}/${actualRole} verify`);
      if(!accepted)assert.ok(fakeStats().signOutCount>=1);
    }
  }
  assert.equal((await requestOtp({phone,mode:'login',expectedRole:'admin'})).ok,false);
  assert.equal((await verifyOtp({phone,token:'123456',expectedRole:'admin'})).ok,false);
});

test('surface route isolation blocks protected pages and APIs across deployments',()=>{
  for(const surface of ['customer','technician','admin']){
    for(const path of ['/musteri','/usta','/admin'])
      assert.equal(surfaceAllowsPath(path,surface),path===({customer:'/musteri',technician:'/usta',admin:'/admin'})[surface]);
  }
  assert.equal(surfaceAllowsPath('/api/admin/technicians/id','customer'),false);
  assert.equal(surfaceAllowsPath('/api/auth/otp/verify','technician'),false);
  assert.equal(surfaceAllowsPath('/api/auth/technician/otp/request','admin'),false);
  assert.equal(surfaceAllowsPath('/api/operations/dispatches/id/accept','technician'),true);
  assert.equal(surfaceAllowsPath('/api/operations/dispatches/id/accept','customer'),false);
  assert.equal(authorizePath('/admin',{id:'x',role:'customer',is_active:true,is_test:false}).redirect,'/giris-admin');
  assert.equal(surfaceHome('admin'),'/giris-admin');
});

test('combined mode is local-only; Preview/Production default to customer isolation',()=>{
  assert.equal(appSurface({nodeEnv:'development'}),'all');
  assert.equal(appSurface({configured:'all',nodeEnv:'production',vercelEnv:'preview'}),'customer');
  assert.equal(appSurface({nodeEnv:'production',vercelEnv:'production'}),'customer');
  assert.equal(appSurface({configured:'technician',nodeEnv:'production',vercelEnv:'preview'}),'technician');
  assert.equal(appSurface({configured:'admin',nodeEnv:'production',vercelEnv:'production'}),'admin');
});

test('technician signup token binds the selected fields to a phone and expires',()=>{
  const old=process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY='offline-test-signing-key';
  try{
    const application=parseTechnicianApplication({phone,fullName:'TEST Usta',email:'',
      categoryIds:['00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000701'],
      cityId:34,districtIds:[2,2,1],addressCityId:6,addressDistrictId:10,
      addressLine:'TEST Mahallesi 10 numara'});
    assert.ok(application);
    assert.deepEqual(application.categoryIds,['00000000-0000-4000-8000-000000000701']);
    assert.deepEqual(application.districtIds,[1,2]);
    const token=sealTechnicianApplication(application);
    assert.deepEqual(openTechnicianApplication(token,phone),application);
    assert.equal(openTechnicianApplication(token,'5000000702'),null);
    assert.equal(openTechnicianApplication(`${token}x`,phone),null);
    assert.equal(openTechnicianApplication(sealTechnicianApplication({...application,issuedAt:Date.now()-700000}),phone),null);
    assert.equal(parseTechnicianApplication({...application,cityId:null}),null);
    assert.equal(parseTechnicianApplication({...application,addressDistrictId:null}),null);
  }finally{if(old===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY=old;}
});

test('browser cannot supply role or bypass the server-side technician provisioning contract',()=>{
  const request=readFileSync(new URL('../src/app/api/auth/technician/otp/request/route.ts',import.meta.url),'utf8');
  const verify=readFileSync(new URL('../src/app/api/auth/technician/otp/verify/route.ts',import.meta.url),'utf8');
  const sql=readFileSync(new URL('../supabase/migrations/20261005155144_technician_signup_onboarding.sql',import.meta.url),'utf8');
  assert.match(request,/expectedRole:'technician'/);
  assert.doesNotMatch(request,/role:body\.role|is_test:body\.is_test/);
  assert.match(verify,/openTechnicianApplication/);
  assert.match(verify,/onVerified/);
  assert.match(sql,/security definer set search_path=''/);
  assert.match(sql,/revoke all on function public\.complete_technician_registration/);
  assert.match(sql,/grant execute on function public\.complete_technician_registration[\s\S]*to service_role/);
});

test('a fresh verified signup can become technician, but customer signup stays customer',async()=>{
  setFakeAccount({id:'00000000-0000-4000-8000-000000000701',email:null,
    role:'customer',is_test:false,is_active:true});
  const customer=await verifyOtp({phone,token:'123456',expectedRole:'customer'});
  assert.equal(customer.ok,true);
  assert.equal(fakeStats().signOutCount,0);
  const technician=await verifyOtp({phone,token:'123456',expectedRole:'technician',
    onVerified:async()=>changeFakeRole('technician')});
  assert.equal(technician.ok,true);
});

test('technician SMS can be retried only with server-authorized provisional intent',async()=>{
  setFakeAccount({id:'00000000-0000-4000-8000-000000000701',email:null,
    role:'customer',is_test:false,is_active:true});
  const ordinary=await requestOtp({phone,mode:'signup',fullName:'TEST Usta',expectedRole:'technician'});
  assert.equal(ordinary.ok,false);
  const retry=await requestOtp({phone,mode:'signup',fullName:'TEST Usta',
    expectedRole:'technician',allowProvisionalCustomer:true});
  assert.equal(retry.ok,true);
  assert.equal(fakeStats().otpRequests,1);
});

test('customer/technician retain login design and admin has password-only entry',()=>{
  const component=readFileSync(new URL('../src/components/account-login-form.tsx',import.meta.url),'utf8');
  const customer=readFileSync(new URL('../src/app/giris/page.tsx',import.meta.url),'utf8');
  const technician=readFileSync(new URL('../src/app/giris-usta/page.tsx',import.meta.url),'utf8');
  const admin=readFileSync(new URL('../src/app/giris-admin/page.tsx',import.meta.url),'utf8');
  assert.match(component,/role!=='admin'/);
  assert.match(customer,/role="customer"/);
  assert.match(technician,/role="technician"/);
  assert.match(admin,/AdminPasswordLoginForm/);
  const adminPassword=readFileSync(new URL('../src/components/admin-password-login-form.tsx',import.meta.url),'utf8');
  assert.match(adminPassword,/type="password"/);
  assert.doesNotMatch(adminPassword,/type="tel"|SMS Kodu/);
  assert.equal(surfaceAllowsPath('/kayit','technician'),false);
  assert.equal(surfaceAllowsPath('/kayit-usta','customer'),false);
  assert.equal(surfaceAllowsPath('/kayit-usta','admin'),false);
});
