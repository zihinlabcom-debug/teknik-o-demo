import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authorizePath,normalizePhone,phoneLookupVariants,testOtpAllowed,testOtpEnvironment,accountDestination} from '../src/lib/account-auth.ts';

const customer={id:'c',role:'customer',is_test:false,is_active:true};
const technician={id:'t',role:'technician',is_test:true,is_active:true};
const admin={id:'a',role:'admin',is_test:true,is_active:true};

test('protected routes require a canonical active role',()=>{
  for(const path of ['/admin','/usta','/musteri','/dashboard','/hizmetler','/kategoriler'])
    assert.deepEqual(authorizePath(path,null),{allowed:false,redirect:'/giris'});
  assert.equal(authorizePath('/admin',customer).allowed,false);
  assert.equal(authorizePath('/usta',customer).allowed,false);
  assert.equal(authorizePath('/usta',technician).allowed,true);
  assert.equal(authorizePath('/admin',technician).allowed,false);
  assert.equal(authorizePath('/admin',admin).allowed,true);
  assert.equal(authorizePath('/admin',{...admin,role:'unknown'}).allowed,false);
  assert.equal(authorizePath('/admin',{...admin,is_active:false}).allowed,false);
  assert.equal(authorizePath('/dashboard',customer).allowed,true);
  assert.equal(authorizePath('/kategoriler',technician).allowed,false);
  assert.equal(accountDestination('customer'),'/hizmetler');
});

test('Turkish phone normalization accepts equivalent safe formats',()=>{
  assert.equal(normalizePhone('05XX XXX XX XX'),null);
  assert.equal(normalizePhone('0532 123 45 67'),'+905321234567');
  assert.equal(normalizePhone('+90 532 123 45 67'),'+905321234567');
});

test('phone lookup accepts canonical and common stored Turkish formats',()=>{
  const variants=phoneLookupVariants('+90 500 000 01 01');
  assert.ok(variants.includes('+905000000101'));
  assert.ok(variants.includes('+90 500 000 01 01'));
  assert.ok(variants.includes('0500 000 01 01'));
  assert.equal(new Set(variants).size,variants.length);
});

test('account lookup remains fail-closed when more than one phone variant matches',()=>{
  const otp=readFileSync(new URL('../src/lib/account-otp.ts',import.meta.url),'utf8');
  assert.match(otp,/\.in\('phone',phoneLookupVariants\(phone\)\)\.limit\(2\)/);
  assert.match(otp,/data\?\.length!==1/);
});

test('fixed OTP works only for enabled test accounts outside production',()=>{
  const base={nodeEnv:'development',vercelEnv:undefined,appEnv:undefined,enabled:'true',configuredCode:'123456',submittedCode:'123456',isTest:true};
  assert.equal(testOtpAllowed(base),true);
  for(const bad of [{submittedCode:''},{submittedCode:'654321'},{isTest:false},{nodeEnv:'production'},
    {vercelEnv:'production'},{enabled:'false'},{nodeEnv:undefined}])
    assert.equal(testOtpAllowed({...base,...bad}),false);
  assert.equal(testOtpEnvironment({nodeEnv:'production',vercelEnv:'preview',appEnv:'staging',enabled:'true'}),true);
  assert.equal(testOtpEnvironment({nodeEnv:'production',vercelEnv:'production',appEnv:'staging',enabled:'true'}),false);
});

test('signup trigger fixes customer and real-account flags regardless of metadata',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261002000001_account_auth_stage1.sql',import.meta.url),'utf8');
  assert.match(sql,/new\.raw_user_meta_data->>'full_name'/);
  assert.match(sql,/'customer',new\.phone,new\.email,false/);
  assert.match(sql,/is_test boolean not null default false/);
  assert.match(sql,/revoke all on public\.users from anon, authenticated/);
  assert.match(sql,/grant update \(name\) on public\.users to authenticated/);
  assert.doesNotMatch(sql,/new\.raw_user_meta_data->>'role'/);
  assert.doesNotMatch(sql,/new\.raw_user_meta_data->>'is_test'/);
});

test('auth routes forward only identity fields; role and is_test are never client inputs',()=>{
  const route=readFileSync(new URL('../src/app/api/auth/otp/request/route.ts',import.meta.url),'utf8');
  assert.match(route,/requestOtp\(\{phone:body\.phone,mode:body\.mode,fullName:/);
  assert.doesNotMatch(route,/role:body\.role|is_test:body\.is_test/);
});

test('verified auth profile is checked by trusted server client',()=>{
  const otp=readFileSync(new URL('../src/lib/account-otp.ts',import.meta.url),'utf8');
  assert.match(otp,/const profileDb=adminSupabase\(\)/);
  assert.match(otp,/profileDb\.from\('users'\).*\.eq\('id',userId\)/);
});

test('session establishment and logout require writable SSR cookies',()=>{
  const otp=readFileSync(new URL('../src/lib/account-otp.ts',import.meta.url),'utf8');
  const logout=readFileSync(new URL('../src/app/api/auth/logout/route.ts',import.meta.url),'utf8');
  assert.match(otp,/verifyOtp[\s\S]*serverSupabase\(\{writeCookies:true\}\)/);
  assert.match(logout,/serverSupabase\(\{writeCookies:true\}\)/);
  assert.match(logout,/if\(error\)return NextResponse\.json/);
});
