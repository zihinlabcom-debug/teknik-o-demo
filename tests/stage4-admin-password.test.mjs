import './helpers/register-admin-auth.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {state,resetAdminAuthDouble,fakeAccessToken} from './helpers/admin-auth-db-double.mjs';
const {safePasswordMatch,loginAdminWithPassword}=await import('../src/lib/admin-password-auth.ts');
const {validAdminSession,sealAdminSession}=await import('../src/lib/admin-session.ts');
const principal='10000000-0000-4000-8000-000000000001';

function setup(){resetAdminAuthDouble();process.env.ADMIN_SHARED_PASSWORD='stage4-test-password-long';
  process.env.ADMIN_SHARED_USER_ID=principal;}

test('correct shared password creates real admin-principal SSR session',async()=>{
  setup();
  assert.equal(safePasswordMatch('stage4-test-password-long',process.env.ADMIN_SHARED_PASSWORD),true);
  const result=await loginAdminWithPassword('stage4-test-password-long','127.0.0.1');
  assert.equal(result.ok,true);assert.equal(result.redirect,'/admin');
  assert.equal(validAdminSession(result.marker,principal,fakeAccessToken),true);
  assert.deepEqual(state.sessionOptions,{writeCookies:true,adminSession:true});
  assert.equal(state.verifyCount,1);
});

test('admin password marker is bound to principal and Supabase session and expires',()=>{
  setup();const now=Date.now();const marker=sealAdminSession(principal,fakeAccessToken,now);
  assert.ok(marker);
  assert.equal(validAdminSession(marker,principal,fakeAccessToken,now),true);
  assert.equal(validAdminSession(marker,'20000000-0000-4000-8000-000000000002',fakeAccessToken,now),false);
  const otherToken=`x.${Buffer.from(JSON.stringify({session_id:'80000000-0000-4000-8000-000000000008'})).toString('base64url')}.x`;
  assert.equal(validAdminSession(marker,principal,otherToken,now),false);
  assert.equal(validAdminSession(marker,principal,fakeAccessToken,now+8*60*60*1000+1),false);
  assert.equal(validAdminSession(`${marker}x`,principal,fakeAccessToken,now),false);
});

test('wrong password, locked IP, non-admin or inactive principal cannot create session',async()=>{
  setup();
  assert.equal((await loginAdminWithPassword('wrong','127.0.0.1')).ok,false);
  assert.equal(state.failures,1);assert.equal(state.verifyCount,0);
  state.blocked=true;
  assert.equal((await loginAdminWithPassword('stage4-test-password-long','127.0.0.1')).ok,false);
  assert.equal(state.verifyCount,0);
  state.blocked=false;state.role='customer';
  assert.equal((await loginAdminWithPassword('stage4-test-password-long','127.0.0.1')).ok,false);
  state.role='technician';
  assert.equal((await loginAdminWithPassword('stage4-test-password-long','127.0.0.1')).ok,false);
  state.role='admin';state.active=false;
  assert.equal((await loginAdminWithPassword('stage4-test-password-long','127.0.0.1')).ok,false);
  assert.equal(state.verifyCount,0);
});

test('admin UI exposes only password; OTP routes are disabled; principal stays server-side',()=>{
  const login=readFileSync(new URL('../src/components/admin-password-login-form.tsx',import.meta.url),'utf8');
  const route=readFileSync(new URL('../src/app/api/auth/admin/password/route.ts',import.meta.url),'utf8');
  const auth=readFileSync(new URL('../src/lib/admin-password-auth.ts',import.meta.url),'utf8');
  const proxy=readFileSync(new URL('../src/proxy.ts',import.meta.url),'utf8');
  const account=readFileSync(new URL('../src/lib/account-supabase.ts',import.meta.url),'utf8');
  const logout=readFileSync(new URL('../src/app/api/auth/logout/route.ts',import.meta.url),'utf8');
  assert.match(login,/type="password"/);assert.doesNotMatch(login,/ADMIN_SHARED|type="tel"|OTP/);
  assert.match(auth,/process\.env\.ADMIN_SHARED_USER_ID/);
  assert.match(auth,/timingSafeEqual/);
  assert.match(proxy,/httpOnly:true/);assert.match(proxy,/sameSite:'strict'/);
  assert.match(proxy,/validAdminSession/);assert.match(account,/validAdminSession/);
  assert.match(logout,/\.auth\.signOut\(\)/);
  assert.match(route,/loginAdminWithPassword/);
  for(const name of ['request','verify'])assert.match(readFileSync(new URL(
    `../src/app/api/auth/admin/otp/${name}/route.ts`,import.meta.url),'utf8'),/status:410/);
});
