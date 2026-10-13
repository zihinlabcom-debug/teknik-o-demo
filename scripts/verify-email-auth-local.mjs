import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createServerClient} from '@supabase/ssr';
import {admin,client,password,BrowserSession,mail,otp,runtime,api} from './email-auth-local-utils.mjs';
const results=[];
async function check(name,fn){
 try{await fn();results.push({name,status:'PASS'});console.log('PASS',name);}
 catch(error){results.push({name,status:'FAIL',reason:error.message});console.log('FAIL',name,error.message);}
}
function expected(response,status){assert.equal(response.status,status,'Unexpected HTTP status');}
const suffix=randomUUID().slice(0,8);let number=0;
const accounts=[];
const {data:cities,error:ce}=await admin.from('cities').select('id').eq('plate_code',34);assert.ifError(ce);
const {data:districts,error:de}=await admin.from('districts').select('id').eq('city_id',cities[0].id);assert.ifError(de);
const {data:categories,error:cae}=await admin.from('service_categories').select('id,code,requires_document');assert.ifError(cae);
const painting=categories.find(c=>c.code==='painting').id;
const boiler=categories.find(c=>c.code==='boiler').id;
function input(role){
 number++;
 return {email:'email-'+suffix+'-'+number+'@example.test',password:password(),phone:'5'+String(Date.now()+number).slice(-9),
 fullName:'Yerel Auth Test',cityId:cities[0].id,districtId:districts[0].id,addressLine:'Yalnız yerel test için örnek adres',
 categoryIds:[painting],districtIds:[districts[0].id],addressCityId:cities[0].id,addressDistrictId:districts[0].id,
 role:'admin',is_test:true};
}
async function attach(browser,session){
 const db=createServerClient(runtime.API_URL,runtime.ANON_KEY,{cookies:{
  getAll:()=>[...browser.jar].map(([name,value])=>({name,value})),
  setAll:values=>values.forEach(({name,value})=>browser.jar.set(name,value))
 }});
 assert.ifError((await db.auth.setSession(session)).error);
}
async function signup(role){
 const data=input(role);const browser=new BrowserSession(role);
 expected(await browser.request('/api/auth/email/signup',data),200);
 expected(await new BrowserSession(role).request('/api/auth/email/login',data),401);
 const message=await mail(data.email);const code=otp(message);
 expected(await browser.request('/api/auth/email/verify',{email:data.email,token:code==='000000'?'999999':'000000'}),400);
 expected(await browser.request('/api/auth/email/verify',{email:data.email,token:code}),200);
 const authCookies=browser.headers.filter(h=>h.startsWith('sb-'));
 assert.ok(authCookies.length>0,'SSR session cookie missing');
 for(const h of authCookies){if(process.env.EMAIL_TEST_PRODUCTION==='true')assert.match(h,/Secure/i);assert.match(h,/SameSite=Lax/i);assert.match(h,/Path=\//i);}
 expected(await new BrowserSession(role).request('/api/auth/email/verify',{email:data.email,token:code}),400);
 const replay=await client().auth.verifyOtp({email:data.email,token:code,type:'email'});
 assert.ok(replay.error,'Auth accepted a consumed registration OTP');
 const sdk=client();const login=await sdk.auth.signInWithPassword({email:data.email,password:data.password});
 assert.ifError(login.error);
 assert.ok(login.data.user.email_confirmed_at);assert.ok(!login.data.user.phone_confirmed_at);
 const id=login.data.user.id;
 const {data:user,error}=await admin.from('users').select('role,is_test').eq('id',id).single();assert.ifError(error);
 assert.equal(user.role,role);assert.equal(user.is_test,false);
 const entry={role,data,browser,sdk,id};accounts.push(entry);return entry;
}
for(const role of ['customer','technician']){
 for(let i=1;i<=2;i++)await check(role+' '+i+': signup, real OTP, wrong/replay denial, unverified login denial, SSR cookies, role metadata isolation',()=>signup(role));
}
if(accounts.length!==4){
 writeFileSync('.local-email-auth/integration-results.json',JSON.stringify(results,null,2));
 console.log('Remaining scenarios BLOCKED: registration prerequisite failed.');
 process.exit(1);
}
const customers=accounts.filter(a=>a.role==='customer'),techs=accounts.filter(a=>a.role==='technician');
await check('anonymous and authenticated callers cannot execute onboarding/phone-sync service RPCs',async()=>{
 for(const db of [client(),customers[0].sdk]){
  assert.ok((await db.rpc('email_auth_complete',{p_user_id:customers[0].id,p_purpose:'customer'})).error);
  assert.ok((await db.rpc('sync_verified_account_phone',{p_actor_id:customers[0].id,p_phone:'+905111111111'})).error);
 }
});
await check('email verification does not verify contact phone or permit phone synchronization',async()=>{
 assert.ok((await admin.rpc('sync_verified_account_phone',{p_actor_id:customers[0].id,p_phone:'+90'+customers[0].data.phone})).error);
});
await check('two customers and two technicians cannot read or mutate other accounts',async()=>{
 for(const a of accounts){
  const {data,error}=await a.sdk.from('users').select('id');assert.ifError(error);assert.deepEqual(data.map(r=>r.id),[a.id]);
  assert.ok((await a.sdk.from('users').update({role:'admin'}).eq('id',a.id)).error);
  assert.ok((await a.sdk.from('users').update({email:'other@example.test'}).eq('id',a.id)).error);
  const other=accounts.find(b=>b.id!==a.id);
  const changed=await a.sdk.from('users').update({name:'Unauthorized'}).eq('id',other.id).select('id');
  assert.ifError(changed.error);assert.equal(changed.data.length,0);
 }
});
await check('customer and technician cross-panel/API sessions are denied',async()=>{
 const cross=new BrowserSession('technician');cross.jar=new Map(customers[0].browser.jar);
 const denial=await cross.request('/api/technician/profile',{action:'update'});assert.ok([401,403].includes(denial.status));
 const reverse=new BrowserSession('customer');reverse.jar=new Map(techs[0].browser.jar);
 const result=await reverse.request('/api/customer/profile',{action:'update'});assert.ok([401,403].includes(result.status));
});
await check('email-verified but incomplete account denied by API, REST and caller-bound RPC',async()=>{
 const data=input('customer');const db=client();assert.ifError((await db.auth.signUp({email:data.email,password:data.password})).error);
 const verified=await db.auth.verifyOtp({email:data.email,token:otp(await mail(data.email)),type:'email'});assert.ifError(verified.error);
 const browser=new BrowserSession('customer');await attach(browser,verified.data.session);
 assert.equal((await db.rpc('email_account_ready')).data,false);
 assert.deepEqual((await db.from('users').select('id')).data,[]);
 assert.ok((await db.rpc('email_auth_complete',{p_user_id:verified.data.user.id,p_purpose:'customer'})).error);
 const response=await browser.request('/api/customer/profile',{action:'update',name:'Not allowed',addresses:[]});
 assert.ok([401,403].includes(response.status));
});
await check('interrupted OTP completion resumes with password and same UID',async()=>{
 const data=input('customer');const browser=new BrowserSession('customer');
 expected(await browser.request('/api/auth/email/signup',data),200);
 const db=client();const verified=await db.auth.verifyOtp({email:data.email,token:otp(await mail(data.email)),type:'email'});assert.ifError(verified.error);
 expected(await browser.request('/api/auth/email/login',data),200);
 const {data:p,error}=await admin.from('customer_profiles').select('user_id').eq('user_id',verified.data.user.id);assert.ifError(error);assert.equal(p.length,1);
});
await check('parallel profile completion is idempotent and preserves address identity',async()=>{
 const data=input('customer');const browser=new BrowserSession('customer');
 expected(await browser.request('/api/auth/email/signup',data),200);
 const db=client();const verified=await db.auth.verifyOtp({email:data.email,token:otp(await mail(data.email)),type:'email'});assert.ifError(verified.error);
 const id=verified.data.user.id;
 const done=await Promise.all([1,2,3].map(()=>admin.rpc('email_auth_complete',{p_user_id:id,p_purpose:'customer'})));
 done.forEach(r=>assert.ifError(r.error));assert.equal(done.filter(r=>r.data===true).length,1);
 const before=await admin.from('customer_addresses').select('id').eq('customer_id',id);assert.equal(before.data.length,1);
 await admin.rpc('email_auth_complete',{p_user_id:id,p_purpose:'customer'});
 const after=await admin.from('customer_addresses').select('id').eq('customer_id',id);assert.deepEqual(before.data,after.data);
});
await check('wrong-email and expired OTP are rejected by real local Auth',async()=>{
 const a=input('customer'),b=input('customer');const browser=new BrowserSession('customer');
 expected(await browser.request('/api/auth/email/signup',a),200);const code=otp(await mail(a.email));
 const secondBrowser=new BrowserSession('customer');
 expected(await secondBrowser.request('/api/auth/email/signup',b),200);
 expected(await secondBrowser.request('/api/auth/email/verify',{email:b.email,token:code}),400);
 const command="update auth.users set confirmation_sent_at=now()-interval '2 hours' where email='"+a.email+"';";
 const sql=spawnSync('docker',['exec','supabase_db_hizmetpey-email-auth-20261013','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',command],{encoding:'utf8'});
 assert.equal(sql.status,0,'Local OTP aging query failed');
 expected(await browser.request('/api/auth/email/verify',{email:a.email,token:code}),400);
});
await check('resend sends new captured email and persistent limiter returns 429',async()=>{
 const data=input('customer');const browser=new BrowserSession('customer');
 expected(await browser.request('/api/auth/email/signup',data),200);const first=await mail(data.email);
 await new Promise(resolve=>setTimeout(resolve,1200));
 expected(await browser.request('/api/auth/email/resend',{email:data.email}),200);
 const second=await mail(data.email,undefined,new Set([first.id]));assert.notEqual(first.id,second.id);
 for(let i=0;i<4;i++)expected(await new BrowserSession('customer').request('/api/auth/email/resend',{email:data.email}),200);
 expected(await new BrowserSession('customer').request('/api/auth/email/resend',{email:data.email}),429);
});
await check('old SMS/test-code routes and phone change are disabled',async()=>{
 for(const role of ['customer','technician']){
  const browser=new BrowserSession(role);
  const base=role==='customer'?'/api/auth/otp':'/api/auth/technician/otp';
  for(const part of ['request','verify'])expected(await browser.request(base+'/'+part,{phone:'5111111111',token:'123456',mode:'signup'}),410);
 }
 expected(await customers[0].browser.request('/api/customer/profile',{action:'phone-start',phone:'5111111111',currentPassword:customers[0].data.password}),400);
});
await check('wrong password and absent-account responses do not enumerate accounts',async()=>{
 const browser=new BrowserSession('customer');
 const wrong=await browser.request('/api/auth/email/login',{email:customers[0].data.email,password:password()});
 const absent=await browser.request('/api/auth/email/login',{email:'absent-'+suffix+'@example.test',password:password()});
 assert.equal(wrong.status,absent.status);assert.deepEqual(wrong.data,absent.data);
});
await check('technician email verification preserves pending approval and category restrictions',async()=>{
 for(const t of techs){
  const profile=await admin.from('technician_profiles').select('approval_status,is_available').eq('user_id',t.id).single();
  assert.equal(profile.data.approval_status,'pending');assert.equal(profile.data.is_available,false);
  assert.ok((await t.sdk.from('technician_service_categories').update({approval_status:'approved'}).eq('technician_id',t.id)).error);
 }
});
await check('technician profile update and new category use email password proof',async()=>{
 const t=techs[0];const d=t.data;
 expected(await t.browser.request('/api/technician/profile',{action:'update',name:'Yerel Test Güncel',email:d.email,
 addressCityId:d.cityId,addressDistrictId:d.districtId,addressLine:d.addressLine,serviceCityId:d.cityId,
 serviceDistrictIds:[d.districtId],currentPassword:d.password}),200);
 expected(await t.browser.request('/api/technician/profile',{action:'add-category',categoryId:boiler,currentPassword:d.password}),200);
 const row=await admin.from('technician_service_categories').select('approval_status').eq('technician_id',t.id).eq('category_id',boiler).single();
 assert.equal(row.data.approval_status,'pending_document');
});
await check('customer and technician avatars and technician document upload remain private',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
 for(const a of [customers[0],techs[0]]){
  const form=new FormData();form.set('file',new Blob([png],{type:'image/png'}),'avatar.png');
  if(a.role==='technician')form.set('currentPassword',a.data.password);
  expected(await a.browser.request('/api/'+a.role+'/profile/avatar',form),200);
  const other=accounts.find(b=>b.role===a.role&&b.id!==a.id);
  assert.ok((await other.sdk.storage.from('profile-avatars').download(a.role+'/'+a.id+'/avatar')).error);
 }
 const t=techs[0];const form=new FormData();form.set('file',new Blob([png],{type:'image/png'}),'proof.png');
 form.set('categoryId',boiler);form.set('currentPassword',t.data.password);
 expected(await t.browser.request('/api/technician/documents',form),200);
 const rows=await admin.from('technician_documents').select('storage_path,status').eq('technician_id',t.id);
 assert.ok(rows.data.length>0);assert.equal(rows.data[0].status,'pending');
 assert.ok((await techs[1].sdk.storage.from('technician-documents').download(rows.data[0].storage_path)).error);
});
await check('existing UID, profile and addresses remain unchanged after normal login',async()=>{
 const a=customers[0];const before=await admin.from('customer_addresses').select('id').eq('customer_id',a.id);
 expected(await new BrowserSession('customer').request('/api/auth/email/login',a.data),200);
 const after=await admin.from('customer_addresses').select('id').eq('customer_id',a.id);assert.deepEqual(before.data,after.data);
});
await check('refresh works and logout removes SSR session',async()=>{
 const a=customers[1];assert.ifError((await a.sdk.auth.refreshSession()).error);
 const response=await a.browser.request('/api/auth/logout',undefined);assert.equal(response.status,303);
 assert.equal([...a.browser.jar.keys()].filter(k=>k.startsWith('sb-')).length,0);
 const denied=await a.browser.request('/api/customer/profile',{action:'update'});assert.ok([401,403].includes(denied.status));
});
writeFileSync('.local-email-auth/integration-results.json',JSON.stringify(results,null,2));
writeFileSync('.local-email-auth/test-accounts.json',JSON.stringify(accounts.map(({role,data,id})=>({role,data,id}))));
console.log('TOTAL',results.length,'PASS',results.filter(r=>r.status==='PASS').length,'FAIL',results.filter(r=>r.status==='FAIL').length);
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
