import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {admin,client,password,BrowserSession,mail,otp,api} from './email-auth-local-utils.mjs';
const accounts=JSON.parse(readFileSync('.local-email-auth/test-accounts.json','utf8'));
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name)}catch(e){results.push({name,status:'FAIL',reason:e.message});console.log('FAIL',name,e.message)}}
function expected(r,status){assert.equal(r.status,status,'Unexpected HTTP status');}
for(const role of ['customer','technician']){
 await test(role+': real recovery email, fixed redirect, HttpOnly capability, reset and replay rejection',async()=>{
  const template=accounts.find(a=>a.role===role);
  const account={...template,data:{...template.data,email:'recovery-'+randomUUID().slice(0,8)+'@example.test',phone:'5'+String(Date.now()).slice(-9),password:password()}};
  const enrollment=new BrowserSession(role);
  expected(await enrollment.request('/api/auth/email/signup',account.data),200);
  expected(await enrollment.request('/api/auth/email/verify',{email:account.data.email,token:otp(await mail(account.data.email))}),200);
  const browser=new BrowserSession(role);
  expected(await browser.request('/api/auth/email/recover',{email:account.data.email}),200);
  const message=await mail(account.data.email,'parola');
  const html=message.html.replaceAll('&amp;','&');
  const href=html.match(/href="([^"]+)"/)?.[1];assert.ok(href,'Recovery link missing');
  const url=new URL(href);assert.equal(url.origin,api(role));
  assert.equal(url.pathname,'/api/auth/email/callback');assert.equal(url.search,'');
  const fragment=new URLSearchParams(url.hash.slice(1));assert.equal(fragment.get('type'),'recovery');
  const token_hash=fragment.get('token_hash');assert.ok(token_hash);
  const redirected=await browser.request('/api/auth/email/callback?next=https://evil.example',undefined,'GET');
  assert.equal(redirected.status,307);assert.equal(new URL(redirected.headers.get('location')).pathname,'/sifre-yenile');
  assert.equal(new URL(redirected.headers.get('location')).origin,api(role));
  const checked=await browser.request('/api/auth/email/callback',{token_hash,type:'recovery'});expected(checked,200);
  assert.equal([...browser.jar.keys()].some(k=>k.startsWith('sb-')),false,'Recovery installed a normal session');
  assert.ok(browser.headers.some(h=>h.startsWith('hizmetpey-recovery=')&&/HttpOnly/i.test(h)&&/SameSite=Strict/i.test(h)&&/Path=\/api\/auth\/email/i.test(h)));
  expected(await new BrowserSession(role).request('/api/auth/email/callback',{token_hash,type:'recovery'}),400);
  const replayJar=new Map(browser.jar);const newPassword=password();
  expected(await browser.request('/api/auth/email/reset',{password:newPassword}),200);
  const replay=new BrowserSession(role);replay.jar=replayJar;
  expected(await replay.request('/api/auth/email/reset',{password:password()}),400);
  expected(await new BrowserSession(role).request('/api/auth/email/login',{email:account.data.email,password:account.data.password}),401);
  expected(await new BrowserSession(role).request('/api/auth/email/login',{email:account.data.email,password:newPassword}),200);
  account.data.password=newPassword;
 });
}
await test('invalid recovery and anonymous reset are denied',async()=>{
 const browser=new BrowserSession('customer');
 expected(await browser.request('/api/auth/email/callback',{token_hash:'not-a-valid-token',type:'recovery'}),400);
 expected(await browser.request('/api/auth/email/callback',{token_hash:'not-a-valid-token',type:'email'}),400);
 expected(await browser.request('/api/auth/email/reset',{password:password()}),400);
});
await test('customer and technician cannot authenticate as admin through email endpoints',async()=>{
 const a=accounts[1];const original=await admin.from('users').select('role').eq('id',a.id).single();
 assert.equal(original.data.role,'customer');
 // Only a synthetic fixture is promoted, never a real account.
 assert.ifError((await admin.from('users').update({role:'admin'}).eq('id',a.id)).error);
 for(const role of ['customer','technician'])
  expected(await new BrowserSession(role).request('/api/auth/email/login',a.data),403);
 const row=await admin.from('users').select('role').eq('id',a.id).single();assert.equal(row.data.role,'admin');
});
await test('legacy phone-only contact cannot automatically create a second Auth UID',async()=>{
 const phone='+905'+String(Date.now()).slice(-9);const secret=password();
 const created=await admin.auth.admin.createUser({phone,password:secret,phone_confirm:true});
 assert.ifError(created.error);const id=created.data.user.id;
 const browser=new BrowserSession('customer');
 const result=await browser.request('/api/auth/email/signup',{...accounts[0].data,
  email:'legacy-attempt-'+randomUUID()+'@example.test',phone,password:password()});
 assert.ok([200,400].includes(result.status));
 const publicRows=await admin.from('users').select('id').eq('phone',phone);
 // Auth stores digits without '+', so include canonical equivalent.
 const digitRows=await admin.from('users').select('id').eq('phone',phone.slice(1));
 assert.deepEqual([...publicRows.data,...digitRows.data].map(r=>r.id),[id]);
 const existing=await admin.auth.admin.getUserById(id);assert.ifError(existing.error);assert.ok(!existing.data.user.email_confirmed_at);
});
await test('inactive account login is denied without changing its UID',async()=>{
 const a=accounts.find(a=>a.role==='technician'&&a!==accounts[2]);
 assert.ifError((await admin.from('users').update({is_active:false}).eq('id',a.id)).error);
 expected(await new BrowserSession('technician').request('/api/auth/email/login',a.data),403);
 assert.equal((await admin.auth.admin.getUserById(a.id)).data.user.id,a.id);
});
writeFileSync('.local-email-auth/recovery-results.json',JSON.stringify(results,null,2));
writeFileSync('.local-email-auth/test-accounts.json',JSON.stringify(accounts));
console.log('TOTAL',results.length,'PASS',results.filter(r=>r.status==='PASS').length,'FAIL',results.filter(r=>r.status==='FAIL').length);
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
