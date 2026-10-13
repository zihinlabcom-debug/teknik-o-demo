import './helpers/register-admin-auth.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {state,resetAdminAuthDouble,fakeAccessToken} from './helpers/admin-auth-db-double.mjs';
const {loginAdminWithPassword}=await import('../src/lib/admin-password-auth.ts');
const {validAdminSession,sealAdminSession}=await import('../src/lib/admin-session.ts');
const principal='10000000-0000-4000-8000-000000000001';
function setup(){resetAdminAuthDouble();process.env.ADMIN_SESSION_SECRET='unit-test-secret-for-hizmetpey-admin-email'.repeat(2);}

test('personal confirmed email/password creates a role-bound admin SSR session',async()=>{
  setup();
  const result=await loginAdminWithPassword(state.email,state.password,'127.0.0.1');
  assert.equal(result.ok,true);assert.equal(result.redirect,'/admin');
  assert.equal(validAdminSession(result.marker,principal,fakeAccessToken),true);
  assert.deepEqual(state.sessionOptions,{writeCookies:true,adminSession:true});
  assert.equal(state.signInCount,1);assert.equal(state.magicLinks,0);
});

test('session signature requires new independent secret, UID and session and expires',()=>{
  setup();const now=Date.now();const marker=sealAdminSession(principal,fakeAccessToken,now);
  assert.ok(marker);assert.equal(validAdminSession(marker,principal,fakeAccessToken,now),true);
  assert.equal(validAdminSession(marker,'20000000-0000-4000-8000-000000000002',fakeAccessToken,now),false);
  const otherToken=`x.${Buffer.from(JSON.stringify({session_id:'80000000-0000-4000-8000-000000000008'})).toString('base64url')}.x`;
  assert.equal(validAdminSession(marker,principal,otherToken,now),false);
  assert.equal(validAdminSession(marker,principal,fakeAccessToken,now+8*60*60*1000+1),false);
  assert.equal(validAdminSession(marker+'x',principal,fakeAccessToken,now),false);
  process.env.ADMIN_SESSION_SECRET='different-test-secret-for-hizmetpey-admin'.repeat(2);
  assert.equal(validAdminSession(marker,principal,fakeAccessToken,now),false);
  delete process.env.ADMIN_SESSION_SECRET;
  assert.equal(validAdminSession(marker,principal,fakeAccessToken,now),false);
});

test('wrong password, blocked IP, wrong role, inactive and unconfirmed accounts rejected',async()=>{
  setup();assert.equal((await loginAdminWithPassword(state.email,'wrong','127.0.0.1')).ok,false);
  assert.equal(state.failures,2);
  state.blocked=true;assert.equal((await loginAdminWithPassword(state.email,state.password,'127.0.0.1')).ok,false);
  state.blocked=false;state.role='customer';
  assert.equal((await loginAdminWithPassword(state.email,state.password,'127.0.0.1')).ok,false);
  state.role='technician';assert.equal((await loginAdminWithPassword(state.email,state.password,'127.0.0.1')).ok,false);
  state.role='admin';state.active=false;
  assert.equal((await loginAdminWithPassword(state.email,state.password,'127.0.0.1')).ok,false);
  state.active=true;state.confirmed=false;
  assert.equal((await loginAdminWithPassword(state.email,state.password,'127.0.0.1')).ok,false);
  assert.equal(state.magicLinks,0);
});

test('admin login UI has email and password, no public signup or shared secret bypass',()=>{
  const login=readFileSync(new URL('../apps/admin/src/components/admin-password-login-form.tsx',import.meta.url),'utf8');
  const route=readFileSync(new URL('../apps/admin/src/app/api/auth/admin/password/route.ts',import.meta.url),'utf8');
  const auth=readFileSync(new URL('../src/lib/admin-password-auth.ts',import.meta.url),'utf8');
  const proxy=readFileSync(new URL('../apps/admin/src/proxy.ts',import.meta.url),'utf8');
  assert.match(login,/type="email"/);assert.match(login,/type=\{visible\?'text':'password'\}/);
  assert.doesNotMatch(login,/Kay[ıi]t Ol|signUp\(/);
  assert.doesNotMatch(auth,/ADMIN_SHARED_PASSWORD|ADMIN_SHARED_USER_ID|generateLink|magiclink/);
  assert.match(route,/body\?\.email,body\?\.password/);
  assert.match(proxy,/user\.email_confirmed_at/);
  for(const name of ['request','verify'])assert.match(readFileSync(new URL(
    `../src/app/api/auth/admin/otp/${name}/route.ts`,import.meta.url),'utf8'),/status:410/);
});


test('admin login registers only a hash bound to the verified UID and Auth session',async()=>{
  setup();const result=await loginAdminWithPassword(state.email,state.password,'127.0.0.1');
  assert.equal(result.ok,true);assert.equal(state.approvalCalls.length,1);
  const approval=state.approvalCalls[0];
  assert.equal(approval.p_user_id,principal);
  assert.equal(approval.p_session_id,'70000000-0000-4000-8000-000000000007');
  assert.match(approval.p_marker_hash,/^[a-f0-9]{64}$/);
  const {createHash}=await import('node:crypto');
  assert.equal(approval.p_marker_hash,createHash('sha256').update(result.marker).digest('hex'));
});

test('admin login fails closed and signs out when DB session authorization fails',async()=>{
  for(const unavailable of [false,true]){
    setup();state.authorization=false;state.authorizationError=unavailable;
    const result=await loginAdminWithPassword(state.email,state.password,'127.0.0.1');
    assert.equal(result.ok,false);assert.equal(state.signOutCount,1);
  }
  setup();state.role='customer';
  assert.equal((await loginAdminWithPassword(state.email,state.password,'127.0.0.1')).ok,false);
  assert.equal(state.approvalCalls.length,0);
});
