import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('all Admin login entry points use personal email and active role',()=>{
  for(const p of ['apps/admin/src/app/api/auth/admin/password/route.ts',
    'src/app/api/auth/admin/password/route.ts']){
    assert.match(read(p),/body\?\.email,body\?\.password/);
    assert.match(read(p),/sameOriginJson/);
  }
  assert.match(read('src/lib/admin-password-auth.ts'),/signInWithPassword/);
  assert.match(read('src/lib/admin-password-auth.ts'),/email_confirmed_at/);
  assert.doesNotMatch(read('src/lib/admin-password-auth.ts'),/generateLink|ADMIN_SHARED_PASSWORD|ADMIN_SHARED_USER_ID/);
  assert.match(read('apps/admin/src/proxy.ts'),/user\.email_confirmed_at/);
});
test('Admin password recovery is not normal login or a public signup',()=>{
  const recovery=read('src/lib/admin-recovery.ts');
  assert.match(recovery,/verifyOtp\(\{token_hash:token,type:'recovery'\}\)/);
  assert.match(recovery,/email_recovery_consume/);
  assert.match(recovery,/role==='admin'/);
  assert.match(recovery,/scope:'global'/);
  assert.doesNotMatch(recovery,/signUp\(|generateLink|magiclink/);
  const form=read('apps/admin/src/components/admin-recovery-form.tsx');
  assert.match(form,/window\.location\.hash/);
  assert.match(form,/window\.history\.replaceState/);
  assert.doesNotMatch(form,/location\.search/);
});
test('Admin session has dedicated secret and existing magic OTP routes are disabled',()=>{
  const session=read('src/lib/admin-session.ts');
  assert.match(session,/ADMIN_SESSION_SECRET/);
  assert.doesNotMatch(session,/ADMIN_SHARED_PASSWORD/);
  for(const route of ['request','verify'])assert.match(read(`src/app/api/auth/admin/otp/${route}/route.ts`),/status:410/);
});
