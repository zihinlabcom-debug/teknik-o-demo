import 'server-only';
import {createCipheriv,createDecipheriv,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {adminSupabase,serverSupabase} from './account-supabase';
import {adminSessionCookie,adminSessionSecret} from './admin-session';
import {normalizeEmail} from './email-auth-policy';

const cookieName='hizmetpey-admin-email-recovery';
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,
  path:'/api/auth/admin/recovery',maxAge:600};
const generic='Hesabınız uygunsa parola sıfırlama iletisi gönderilecektir.';
type Recovery={uid:string;access:string;refresh:string;nonce:string;expires:number};
const response=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
const invalid=()=>response({error:'Bağlantı geçersiz veya süresi dolmuş. Yeni sıfırlama isteği gönderin.'},400);
function isolatedAuth(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error('Auth settings missing');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
function key(){
  const secret=adminSessionSecret();
  if(!secret)throw new Error('ADMIN_SESSION_SECRET missing');
  return createHmac('sha256',secret).update('admin-recovery-cookie.v1').digest();
}
function digest(data:string){
  const secret=adminSessionSecret();
  if(!secret)throw new Error('ADMIN_SESSION_SECRET missing');
  return createHmac('sha256',secret).update('admin-recovery:'+data).digest('hex');
}
function encrypt(data:Recovery){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64url');
}
function decrypt(value:string|undefined):Recovery|null{
  try{
    if(!value||value.length>8000)return null;
    const bytes=Buffer.from(value,'base64url');
    if(bytes.length<29)return null;
    const decipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    const valueObj=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8')) as Recovery;
    return typeof valueObj.uid==='string'&&typeof valueObj.access==='string'&&
      typeof valueObj.refresh==='string'&&typeof valueObj.nonce==='string'&&
      Number.isSafeInteger(valueObj.expires)&&valueObj.expires>Date.now()?valueObj:null;
  }catch{return null;}
}
async function limit(action:string,id:string,count:number,seconds:number){
  const db=adminSupabase();
  const {data,error}=await db.rpc('email_auth_rate_limit',{
    p_key:digest(action+':'+id),p_limit:count,p_seconds:seconds,
  });
  return !error&&data===true;
}
async function validAdminUser(user:{id:string;email?:string|null;email_confirmed_at?:string|null}|null){
  if(!user?.id||!user.email_confirmed_at||!normalizeEmail(user.email))return false;
  const {data,error}=await adminSupabase().from('users')
    .select('id,role,is_active').eq('id',user.id).maybeSingle();
  return !error&&data?.id===user.id&&data.role==='admin'&&data.is_active===true;
}
function goodPassword(p:unknown):p is string{
  return typeof p==='string'&&p.length>=10&&p.length<=128&&/[A-Z]/.test(p)&&/[a-z]/.test(p)&&/[0-9]/.test(p);
}

// Public request, but no account enumeration, no admin assignment, and no login cookie.
export async function requestAdminPasswordRecovery(emailInput:unknown,origin:string){
  const email=normalizeEmail(emailInput);
  if(!email)return response({error:'Geçerli bir e-posta girin.'},400);
  try{
    if(!await limit('recover',email,3,600)||!await limit('recover-global','all',100,3600))
      return response({error:'Çok fazla deneme. Daha sonra tekrar deneyin.'},429);
    await isolatedAuth().auth.resetPasswordForEmail(email,{
      redirectTo:origin+'/api/auth/admin/recovery/link',
    });
    return response({ok:true,message:generic});
  }catch{return response({error:'Parola kurtarma hizmeti kullanılamıyor.'},503);}
}

// Requires the genuine recovery TokenHash from the recovery email template.
// Ordinary access/refresh tokens are deliberately never accepted here.
export async function acceptAdminRecovery(token:unknown,type:unknown){
  if(type!=='recovery'||typeof token!=='string'||!/^[A-Za-z0-9_-]{16,1024}$/.test(token))return invalid();
  try{
    if(!await limit('callback',digest(token),5,600))return invalid();
    const db=isolatedAuth();
    const {data,error}=await db.auth.verifyOtp({token_hash:token,type:'recovery'});
    if(error||!data.user||!data.session||!await validAdminUser(data.user)){
      if(data.session)await db.auth.signOut({scope:'local'});
      return invalid();
    }
    const recovery=encrypt({uid:data.user.id,access:data.session.access_token,
      refresh:data.session.refresh_token,nonce:randomUUID(),expires:Date.now()+600000});
    // Do not revoke the verified recovery session before its one-time password update.
    const answer=response({ok:true});
    answer.cookies.set(cookieName,recovery,cookieOptions);
    return answer;
  }catch{return invalid();}
}

export async function resetAdminPassword(password:unknown){
  const store=await cookies(),recovery=decrypt(store.get(cookieName)?.value);
  if(!recovery||!goodPassword(password))return invalid();
  let spent=false;
  try{
    if(!await limit('reset',recovery.uid,5,600))return invalid();
    const db=isolatedAuth();
    const {data:{user},error}=await db.auth.getUser(recovery.access);
    if(error||!user||user.id!==recovery.uid||!await validAdminUser(user))return invalid();
    const {data:unused,error:replayError}=await adminSupabase().rpc('email_recovery_consume',{
      p_digest:digest(recovery.nonce),
    });
    if(replayError||unused!==true)return invalid();
    spent=true;
    const {error:sessionError}=await db.auth.setSession({access_token:recovery.access,
      refresh_token:recovery.refresh});
    const {error:changeError}=sessionError?{error:sessionError}:await db.auth.updateUser({password});
    await db.auth.signOut({scope:'global'});
    const answer=changeError?invalid():response({ok:true,redirect:'/giris-admin'});
    answer.cookies.set(cookieName,'',{...cookieOptions,maxAge:0});
    answer.cookies.delete(adminSessionCookie);
    // Recovery must never install a normal admin SSR cookie.
    await (await serverSupabase({writeCookies:true,adminSession:true})).auth.signOut({scope:'local'});
    return answer;
  }catch{
    if(spent){const answer=invalid();answer.cookies.set(cookieName,'',{...cookieOptions,maxAge:0});return answer;}
    return invalid();
  }
}
