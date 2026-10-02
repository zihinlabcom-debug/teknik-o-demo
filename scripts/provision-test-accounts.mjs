// Explicit, non-production pilot provisioning. No credentials or identities live in this file.
import {createClient} from '@supabase/supabase-js';

const enabled=process.env.ALLOW_TEST_ACCOUNT_PROVISIONING==='true';
const preview=process.env.APP_ENV==='staging'&&process.env.VERCEL_ENV==='preview';
const local=process.env.NODE_ENV==='development'||process.env.NODE_ENV==='test';
if(!enabled||process.env.VERCEL_ENV==='production'||!(preview||local))throw Error('Test account provisioning is disabled outside explicit development/staging.');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef=process.env.TEST_ACCOUNT_PROJECT_REF;
if(!url||!key||!projectRef||new URL(url).hostname!==`${projectRef}.supabase.co`)throw Error('Target project reference or admin credentials are missing/mismatched.');
const entries=JSON.parse(process.env.TEST_ACCOUNTS_JSON||'[]');
if(!Array.isArray(entries)||entries.length<1||entries.length>12)throw Error('Supply 1–12 explicit test accounts.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(['customer','technician','admin']);
for(const entry of entries){
  if(!entry||!allowed.has(entry.role)||typeof entry.name!=='string'||!entry.name.trim()||
     typeof entry.email!=='string'||!/^\S+@\S+\.\S+$/.test(entry.email)||
     typeof entry.phone!=='string'||!/^\+90[5]\d{9}$/.test(entry.phone))throw Error('Invalid test account entry.');
  const {data:existing,error:lookupError}=await db.from('users').select('id,role,is_test,email').eq('phone',entry.phone).limit(2);
  if(lookupError||!existing||existing.length>1)throw Error('Account lookup failed or phone is ambiguous.');
  let id;
  if(existing.length===1){
    if(existing[0].is_test!==true||existing[0].email!==entry.email)throw Error('Refusing to modify an existing non-test/mismatched account.');
    id=existing[0].id;
  }else{
    const {data,error}=await db.auth.admin.createUser({phone:entry.phone,email:entry.email,
      phone_confirm:true,email_confirm:true,user_metadata:{full_name:entry.name.trim()}});
    if(error||!data.user)throw Error('Supabase Auth test user creation failed.');
    id=data.user.id;
  }
  const {error:updateError}=await db.from('users').update({role:entry.role,is_test:true,name:entry.name.trim()}).eq('id',id);
  if(updateError)throw Error('Canonical account provisioning failed; inspect the new Auth user before retrying.');
  process.stdout.write(`Provisioned test ${entry.role} account.\n`);
}
