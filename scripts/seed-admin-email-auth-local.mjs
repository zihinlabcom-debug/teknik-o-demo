// Only creates a synthetic administrator in the verified disposable local Auth DB.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const lines=readFileSync('.local-email-auth/start.log','utf8').split(/\r?\n/);
const info=lines.map(line=>{try{return JSON.parse(line);}catch{return null;}})
  .find(value=>value?.API_URL&&value?.SERVICE_ROLE_KEY);
if(!info)throw new Error('Local runtime not found');
const url=new URL(info.API_URL);
if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.port!=='61321'||url.pathname!=='/')
  throw new Error('Unverified Supabase endpoint; refusing to create test identity');
const admin=createClient(info.API_URL,info.SERVICE_ROLE_KEY,
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
if(existsSync('.local-email-auth/admin-synthetic-account.json'))
  throw new Error('Existing local admin test fixture present; refusing to create another user');
const email=`hizmetpey-admin-${randomBytes(7).toString('hex')}@example.invalid`;
const password=`Z9x!${randomBytes(24).toString('base64url')}`;
const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,
  user_metadata:{full_name:'Yerel Yönetici Test Hesabı'}});
if(error||!data.user)throw new Error('Local test Auth user could not be created');
const id=data.user.id;
const {data:existing,error:existingError}=await admin.from('users').select('id').eq('id',id).maybeSingle();
if(existingError)throw new Error('Local profile lookup failed');
const result=existing?await admin.from('users').update({role:'admin',is_active:true,is_test:true}).eq('id',id):
  await admin.from('users').insert({id,email,name:'Yerel Yönetici Test Hesabı',role:'admin',is_active:true,is_test:true});
if(result.error)throw new Error('Local admin role could not be assigned');
mkdirSync('.local-email-auth',{recursive:true});
writeFileSync('.local-email-auth/admin-synthetic-account.json',JSON.stringify({email,password,id},null,2),{flag:'wx',mode:0o600});
console.log('Synthetic localhost admin created. Credentials saved ONLY to ignored .local-email-auth/admin-synthetic-account.json.');
