import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {admin,client,password,BrowserSession,mail,runtime} from './email-auth-local-utils.mjs';
const base='http://127.0.0.1:3132';
const markerName='hizmetpey-admin-email-session',headerName='x-hizmetpey-admin-session';
const output=process.argv.includes('--final')?'admin-final-results.json':'admin-targeted-results.json';
const results=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name);}catch(error){results.push({name,status:'FAIL',reason:error.message});console.log('FAIL',name,error.message);}}
function browser(){const b=new BrowserSession('customer');b.base=base;return b;}
function authSession(b){
 const entries=[...b.jar].filter(([k])=>k.startsWith('sb-')&&k.includes('auth-token')).sort(([a],[b])=>a.localeCompare(b));
 const value=decodeURIComponent(entries.map(([,v])=>v).join(''));
 assert.ok(value.startsWith('base64-'),'SSR session missing');
 return JSON.parse(Buffer.from(value.slice(7),'base64url').toString());
}
function db(token,marker){return createClient(runtime.API_URL,runtime.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:{Authorization:'Bearer '+token,...(marker?{[headerName]:marker}:{})}}});}
async function fixture(role='admin'){
 const email='admin-session-'+randomUUID()+'@example.test',secret=password();
 const c=await admin.auth.admin.createUser({email,password:secret,email_confirm:true});assert.ifError(c.error);
 const id=c.data.user.id;const row=await admin.from('users').select('id').eq('id',id).maybeSingle();assert.ifError(row.error);
 const values={role,is_active:true,is_test:true,email,name:'Yerel Oturum Güvenlik Testi'};
 assert.ifError((row.data?await admin.from('users').update(values).eq('id',id):await admin.from('users').insert({id,...values})).error);
 return {id,email,password:secret};
}
const account=await fixture(),other=await fixture('customer');
let b=browser(),session,marker,approved;
const path='customer/'+other.id+'/avatar';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64');
assert.ifError((await admin.storage.from('profile-avatars').upload(path,png,{contentType:'image/png'})).error);
const raw=client();const signed=await raw.auth.signInWithPassword(account);assert.ifError(signed.error);
const rawToken=signed.data.session.access_token;
await test('unapproved password JWT cannot read other users, call admin predicate or download Storage',async()=>{
 const d=db(rawToken);const users=await d.from('users').select('id').neq('id',account.id);assert.ifError(users.error);assert.equal(users.data.length,0);
 const allowed=await d.rpc('is_app_admin');assert.ifError(allowed.error);assert.equal(allowed.data,false);
 assert.ok((await d.storage.from('profile-avatars').download(path)).error);
});
await test('anonymous/authenticated callers cannot self-authorize; forged marker does not grant access',async()=>{
 for(const d of [client(),db(rawToken)])assert.ok((await d.rpc('admin_authorize_session',{p_user_id:account.id,p_session_id:randomUUID(),p_marker_hash:'a'.repeat(64)})).error);
 assert.equal((await db(rawToken,'forged').rpc('is_app_admin')).data,false);
 const invalid=await admin.rpc('admin_authorize_session',{p_user_id:account.id,p_session_id:randomUUID(),p_marker_hash:'a'.repeat(64)});assert.ifError(invalid.error);assert.equal(invalid.data,false);
});
await test('normal admin password login creates HttpOnly marker and usable UI session',async()=>{
 assert.equal((await b.request('/api/auth/admin/password',account)).status,200);
 assert.ok(b.headers.some(h=>h.startsWith(markerName+'=')&&/HttpOnly/i.test(h)&&/SameSite=Strict/i.test(h)));
 session=authSession(b);marker=b.jar.get(markerName);assert.ok(marker);
 approved=db(session.access_token,marker);
 assert.equal((await b.request('/admin/musteriler',undefined,'GET')).status,200);
 assert.equal((await b.request('/admin/ustalar',undefined,'GET')).status,200);
});
if(!session){console.log('Required positive admin login failed; dependent tests blocked');results.push({name:'dependent session scenarios',status:'BLOCKED'});}
else{
 await test('approved JWT plus marker permits REST, dependent RPC and private Storage',async()=>{
  const rows=await approved.from('users').select('id').eq('id',other.id);assert.ifError(rows.error);assert.equal(rows.data.length,1);
  assert.equal((await approved.rpc('is_app_admin')).data,true);
  const read=await approved.rpc('stage10_can_read_case_evidence',{p_storage_path:'local-session-test/nonexistent'});assert.ifError(read.error);assert.equal(read.data,true);
  assert.ifError((await approved.storage.from('profile-avatars').download(path)).error);
 });
 await test('approved JWT without marker or with wrong marker remains denied by REST/RPC/Storage',async()=>{
  for(const value of [undefined,marker+'x']){
   const d=db(session.access_token,value);assert.equal((await d.rpc('is_app_admin')).data,false);
   const rows=await d.from('users').select('id').eq('id',other.id);assert.ifError(rows.error);assert.equal(rows.data.length,0);
   assert.ok((await d.storage.from('profile-avatars').download(path)).error);
  }
 });
 await test('marker cannot be reused with another genuine Auth session',async()=>{assert.equal((await db(rawToken,marker).rpc('is_app_admin')).data,false);});
 await test('admin APIs reject missing/tampered marker and customer/anonymous credentials',async()=>{
  for(const mode of ['missing','tampered','anonymous']){
   const bad=browser();if(mode!=='anonymous')bad.jar=new Map(b.jar);
   if(mode==='missing')bad.jar.delete(markerName);if(mode==='tampered')bad.jar.set(markerName,marker+'x');
   const r=await bad.request('/api/admin/technicians/'+other.id,{action:'activate'});assert.ok([401,403].includes(r.status));
  }
  assert.equal((await browser().request('/api/auth/admin/password',other)).status,401);
 });
 await test('service approval retry cannot rotate marker or extend existing authorization',async()=>{
  const sid=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url')).session_id;
  const ok=await admin.rpc('admin_authorize_session',{p_user_id:account.id,p_session_id:sid,p_marker_hash:createHash('sha256').update(marker).digest('hex')});assert.ifError(ok.error);assert.equal(ok.data,true);
  const changed=await admin.rpc('admin_authorize_session',{p_user_id:account.id,p_session_id:sid,p_marker_hash:'b'.repeat(64)});assert.ifError(changed.error);assert.equal(changed.data,false);
 });
 await test('logout invalidates old access token plus marker for REST, RPC and API',async()=>{
  const old=browser();old.jar=new Map(b.jar);
  const out=await b.request('/api/auth/logout');assert.equal(out.status,303);assert.equal(new URL(out.headers.get('location')).pathname,'/giris-admin');
  assert.equal((await approved.rpc('is_app_admin')).data,false);
  assert.equal((await approved.from('users').select('id').eq('id',other.id)).data?.length,0);
  assert.ok([401,403].includes((await old.request('/api/admin/technicians/'+other.id,{action:'activate'})).status));
 });
 await test('password reset revokes all prior admin sessions and replayed recovery is rejected',async()=>{
  b=browser();assert.equal((await b.request('/api/auth/admin/password',account)).status,200);
  const before=authSession(b);const oldDb=db(before.access_token,b.jar.get(markerName));
  const recovery=browser();assert.equal((await recovery.request('/api/auth/admin/recovery/request',{email:account.email})).status,200);
  const message=await mail(account.email,'parola');const link=new URL(message.html.replaceAll('&amp;','&').match(/href="([^"]+)"/)[1]);
  assert.equal(link.origin,base);assert.equal(link.pathname,'/api/auth/admin/recovery/link');
  const data=Object.fromEntries(new URLSearchParams(link.hash.slice(1)));
  const result=await recovery.request('/api/auth/admin/recovery/callback',data);assert.equal(result.status,200);
  assert.equal([...recovery.jar.keys()].some(k=>k.startsWith('sb-')||k===markerName),false);
  assert.equal((await recovery.request('/api/admin/technicians/'+other.id,{action:'activate'})).status,401);
  const replay=browser();replay.jar=new Map(recovery.jar);
  const next=password();assert.equal((await recovery.request('/api/auth/admin/recovery/reset',{password:next})).status,200);
  assert.equal((await oldDb.rpc('is_app_admin')).data,false);
  assert.ok([401,403].includes((await b.request('/api/admin/technicians/'+other.id,{action:'activate'})).status));
  assert.equal((await replay.request('/api/auth/admin/recovery/reset',{password:password()})).status,400);
  assert.equal((await browser().request('/api/auth/admin/recovery/callback',data)).status,400);
  assert.equal((await browser().request('/api/auth/admin/password',account)).status,401);
  account.password=next;b=browser();assert.equal((await b.request('/api/auth/admin/password',account)).status,200);
 });
 await test('expired DB approval is rejected even with otherwise valid cookies',async()=>{
  const s=authSession(b),sid=JSON.parse(Buffer.from(s.access_token.split('.')[1],'base64url')).session_id;
  assert.match(sid,/^[0-9a-f-]{36}$/);
  const query=`update account_private.admin_sessions set approved_at=now()-interval '9 hours',expires_at=now()-interval '1 hour' where session_id='${sid}' and user_id='${account.id}';`;
  const r=spawnSync('docker',['exec','-i','supabase_db_hizmetpey-email-auth-20261013','psql','-U','postgres','-d','postgres','-X','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  assert.equal((await db(s.access_token,b.jar.get(markerName)).rpc('is_app_admin')).data,false);
  assert.ok([401,403].includes((await b.request('/api/admin/technicians/'+other.id,{action:'activate'})).status));
 });
}
await test('cross-origin admin login is refused',async()=>{
 const r=await fetch(base+'/api/auth/admin/password',{method:'POST',headers:{Origin:'https://invalid.example','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);
});
await test('effective grants deny client approval and table access; service can call approval only',async()=>{
 const query="select has_function_privilege('anon','public.admin_authorize_session(uuid,uuid,text)','execute'),has_function_privilege('authenticated','public.admin_authorize_session(uuid,uuid,text)','execute'),has_function_privilege('service_role','public.admin_authorize_session(uuid,uuid,text)','execute'),has_table_privilege('authenticated','account_private.admin_sessions','insert'),has_table_privilege('service_role','account_private.admin_sessions','insert');";
 const r=spawnSync('docker',['exec','-i','supabase_db_hizmetpey-email-auth-20261013','psql','-U','postgres','-d','postgres','-X','-At'],{input:query,encoding:'utf8'});assert.equal(r.status,0);assert.equal(r.stdout.trim(),'f|f|t|f|f');
});
writeFileSync('.local-email-auth/admin-hardening-20261013/'+output,JSON.stringify(results,null,2));
console.log('TOTAL',results.length,'PASS',results.filter(r=>r.status==='PASS').length,'FAIL',results.filter(r=>r.status==='FAIL').length);
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
