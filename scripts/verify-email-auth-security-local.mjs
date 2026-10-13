import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {admin,client,password,BrowserSession,mail,otp,api} from './email-auth-local-utils.mjs';
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name)}catch(e){results.push({name,status:'FAIL',reason:e.message});console.log('FAIL',name,e.message)}}
const accounts=JSON.parse(readFileSync('.local-email-auth/test-accounts.json','utf8'));
await test('effective function, column, private-schema and Storage ACL assertions',async()=>{
 const container='supabase_db_hizmetpey-email-auth-20261013';
 const inspected=spawnSync('docker',['inspect','--format','{{.Name}}',container],{encoding:'utf8'});
 assert.equal(inspected.stdout.trim(),'/'+container);
 const result=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{
  input:readFileSync('supabase/tests/email_auth_acl.sql','utf8'),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});
await test('missing/tampered registration intent cannot verify or consume the real OTP',async()=>{
 const data={...accounts[0].data,email:'intent-'+randomUUID().slice(0,8)+'@example.test',phone:'5'+String(Date.now()).slice(-9),password:password()};
 const browser=new BrowserSession('customer');
 assert.equal((await browser.request('/api/auth/email/signup',data)).status,200);
 assert.ok(browser.headers.some(h=>h.startsWith('hizmetpey-email-registration-customer=')&&/HttpOnly/i.test(h)&&/SameSite=Strict/i.test(h)));
 const token=otp(await mail(data.email));
 assert.equal((await new BrowserSession('customer').request('/api/auth/email/verify',{email:data.email,token})).status,400);
 const tampered=new BrowserSession('customer');tampered.jar=new Map(browser.jar);
 const name='hizmetpey-email-registration-customer';tampered.jar.set(name,tampered.jar.get(name)+'tampered');
 assert.equal((await tampered.request('/api/auth/email/verify',{email:data.email,token})).status,400);
 assert.equal((await browser.request('/api/auth/email/verify',{email:data.email,token})).status,200);
});
await test('confirmed account cannot use registration verification as another login method',async()=>{
 const a=accounts[0];const browser=new BrowserSession('customer');
 assert.equal((await browser.request('/api/auth/email/verify',{email:a.data.email,token:'123456'})).status,400);
});
await test('email registration API rejects cross-origin state changes',async()=>{
 const response=await fetch(api('customer')+'/api/auth/email/signup',{method:'POST',
 headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify(accounts[0].data)});
 assert.equal(response.status,403);
});
await test('public registration catalog is narrow and validates city identifiers',async()=>{
 const all=await fetch(api('customer')+'/api/auth/email/catalog').then(r=>r.json());
 assert.ok(all.items.length>0);assert.deepEqual(Object.keys(all.items[0]).sort(),['id','name']);
 assert.equal((await fetch(api('customer')+'/api/auth/email/catalog?cityId=-1')).status,400);
});
for(const role of ['customer','technician']){
 await test(role+': profile password change uses actual captured email reauthentication code',async()=>{
  const template=accounts.find(a=>a.role===role);
  const a={...template,data:{...template.data,email:'security-'+randomUUID().slice(0,8)+'@example.test',phone:'5'+String(Date.now()).slice(-9),password:password()}};
  const browser=new BrowserSession(role);
  assert.equal((await browser.request('/api/auth/email/signup',a.data)).status,200);
  assert.equal((await browser.request('/api/auth/email/verify',{email:a.data.email,token:otp(await mail(a.data.email))})).status,200);
  assert.equal((await browser.request('/api/auth/email/login',a.data)).status,200);
  const latest=await mail(a.data.email);
  assert.equal((await browser.request('/api/'+role+'/profile',{action:'password-start'})).status,200);
  const token=otp(await mail(a.data.email,undefined,new Set([latest.id])));
  const next=password();
  assert.equal((await browser.request('/api/'+role+'/profile',{action:'password-confirm',token,password:next})).status,200);
  assert.equal((await new BrowserSession(role).request('/api/auth/email/login',{email:a.data.email,password:next})).status,200);
  a.data.password=next;
 });
}
writeFileSync('.local-email-auth/security-results.json',JSON.stringify(results,null,2));
writeFileSync('.local-email-auth/test-accounts.json',JSON.stringify(accounts));
console.log('TOTAL',results.length,'PASS',results.filter(r=>r.status==='PASS').length,'FAIL',results.filter(r=>r.status==='FAIL').length);
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
