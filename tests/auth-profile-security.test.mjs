import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NextResponse} from 'next/server.js';
import {accountSessionCookieOptions as customerCookieOptions}
  from '../apps/customer/src/lib/account-cookie-options.ts';
import {accountSessionCookieOptions as technicianCookieOptions}
  from '../apps/technician/src/lib/account-cookie-options.ts';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('hardening migration revokes direct phone and address mutations',async()=>{
  const sql=await read('supabase/migrations/20261011084530_auth_profile_security_hardening.sql');
  assert.match(sql,/revoke update on public\.users from authenticated/i);
  assert.match(sql,/grant update\(name,email\) on public\.users to authenticated/i);
  assert.match(sql,/revoke insert,update,delete on public\.customer_addresses from authenticated/i);
  assert.match(sql,/profile_archived_at/);
  assert.match(sql,/sync_verified_account_phone/);
  assert.doesNotMatch(sql,/delete from public\.customer_addresses/i);
});

test('Supabase session cookie options are explicit and serialize safely',()=>{
  const original=process.env.NODE_ENV;
  process.env.NODE_ENV='production';
  try{
    for(const factory of [customerCookieOptions,technicianCookieOptions]){
      const options=factory();
      assert.deepEqual(options,{httpOnly:false,secure:true,sameSite:'lax',path:'/'});
      const response=NextResponse.json({ok:true});
      response.cookies.set('sb-test-auth-token','value',options);
      const header=response.headers.get('set-cookie')??'';
      assert.match(header,/Path=\//i);
      assert.match(header,/SameSite=lax/i);
      assert.match(header,/Secure/i);
      assert.doesNotMatch(header,/HttpOnly/i);
    }
  }finally{
    process.env.NODE_ENV=original;
  }
});

test('disposable Supabase config stays excluded and is secret-free when locally present',async()=>{
  const ignore=await read('supabase/.gitignore');
  assert.match(ignore,/^config\.toml$/m);
  let config=null;
  try{config=await read('supabase/config.toml');}
  catch(error){
    if(error?.code!=='ENOENT')throw error;
  }
  if(config===null)return;
  assert.match(config,/\[db\.migrations\][\s\S]*?enabled = false/);
  assert.match(config,/auth_token\s*=\s*"env\(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN\)"/);
  assert.doesNotMatch(config,/auth_token\s*=\s*"local-test-token"/);
});

test('security verifier refuses a remote Supabase target',async()=>{
  const script=await read('scripts/verify-auth-profile-security-local.mjs');
  assert.match(script,/Refusing to run security integration against a non-loopback Supabase URL/);
  assert.match(script,/LOCAL FIXED OTP ONLY: real SMS delivery was not tested/);
});
