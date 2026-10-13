import 'server-only';
import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {createClient,type User} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {adminSupabase,publicSupabaseConfig,serverSupabase} from './account-supabase';
import {phoneLookupVariants} from './account-auth';
import {validPassword} from './account-password';
import {normalizeEmail,validEmailOtp,sameOriginJson,safeAuthOrigin} from './email-auth-policy';
import {parseTechnicianApplication as parseApplication,validTechnicianSelection as validSelection} from './technician-onboarding';

type Role='customer'|'technician';
type Action='signup'|'verify'|'resend'|'login'|'recover'|'reset';
const generic='İşlem tamamlanamadı. Bilgilerinizi kontrol edin veya daha sonra tekrar deneyin.';
const recoveryCookie='hizmetpey-recovery';
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/api/auth/email',maxAge:600};
const destination=(role:Role)=>role==='customer'?'/hizmetler':'/usta';
const loginPage=(role:Role)=>role==='customer'?'/giris':'/giris-usta';
function reply(body:object,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});}
function digest(value:string){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error('Auth configuration missing');
  return createHmac('sha256',key).update(value).digest('hex');
}
function isolatedAuth(){
  const {url,key}=publicSupabaseConfig();
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
async function limit(action:string,email:string){
  // Persistent atomic DB counters, shared across serverless instances. Fail closed.
  const db=adminSupabase();
  for(const [key,count,seconds] of [[digest('email:'+email+':'+action),action==='verify'?10:5,300],
    [digest('global:'+action),300,3600]] as const){
    const {data,error}=await db.rpc('email_auth_rate_limit',{p_key:key,p_limit:count,p_seconds:seconds});
    if(error)throw new Error('Rate limit unavailable');
    if(data!==true)return false;
  }
  return true;
}
async function ready(user:User,role:Role){
  if(!user.email_confirmed_at||!user.email)return false;
  const db=adminSupabase();
  const {data,error}=await db.from('users').select('role,is_active').eq('id',user.id).maybeSingle();
  if(error||data?.role!==role||data.is_active!==true)return false;
  const {data:profile,error:profileError}=await db.from(role==='customer'?'customer_profiles':'technician_profiles')
    .select('user_id').eq('user_id',user.id).maybeSingle();
  return !profileError&&!!profile;
}
async function complete(user:User,role:Role){
  if(await ready(user,role))return true;
  if(!user.email_confirmed_at||!user.email)return false;
  const {error}=await adminSupabase().rpc('email_auth_complete',{p_user_id:user.id,p_purpose:role});
  return !error&&await ready(user,role);
}
type Registration={uid:string;email:string;role:Role;expires:number};
function sealRegistration(value:Registration){
 const payload=Buffer.from(JSON.stringify(value)).toString('base64url');
 return payload+'.'+digest('registration:'+payload);
}
function openRegistration(value:string|undefined):Registration|null{
 try{
  if(!value||value.length>1500)return null;
  const [payload,signature,...extra]=value.split('.');
  if(extra.length||!payload||!signature||!/^[a-f0-9]{64}$/.test(signature))return null;
  const expected=Buffer.from(digest('registration:'+payload),'hex');
  const actual=Buffer.from(signature,'hex');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as Registration;
  return data.expires>Date.now()?data:null;
 }catch{return null;}
}
type Recovery={uid:string;access:string;refresh:string;nonce:string;expires:number;role:Role};
function seal(value:Recovery){
  const key=createHash('sha256').update(digest('recovery-cookie-v1')).digest();
  const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);
  const bytes=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64url');
}
function open(value:string|undefined):Recovery|null{
  try{
    if(!value||value.length>8000)return null;
    const bytes=Buffer.from(value,'base64url');
    const key=createHash('sha256').update(digest('recovery-cookie-v1')).digest();
    const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    const result=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8')) as Recovery;
    return result.expires>Date.now()?result:null;
  }catch{return null;}
}
export async function emailAuthPost(request:Request,role:Role,action:Action){
  if(!sameOriginJson(request,safeAuthOrigin(process.env.EMAIL_AUTH_ORIGIN)))return reply({error:'Geçersiz istek.'},403);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=='object')return reply({error:generic},400);
  try{
    if(action==='reset'){
      const store=await cookies();const recovery=open(store.get(recoveryCookie)?.value);
      if(!recovery||recovery.role!==role||!validPassword(body.password))return reply({error:'Bağlantı geçersiz veya şifre kurallara uygun değil.'},400);
      if(!await limit('reset',recovery.uid))return reply({error:generic},429);
      const db=isolatedAuth();
      const {data:{user},error}=await db.auth.getUser(recovery.access);
      if(error||user?.id!==recovery.uid||!await ready(user,role))return reply({error:generic},400);
      const {data:unused,error:useError}=await adminSupabase().rpc('email_recovery_consume',{p_digest:digest(recovery.nonce)});
      if(useError||unused!==true)return reply({error:'Bu bağlantı kullanılmış. Yeni sıfırlama isteği gönderin.'},400);
      const {error:sessionError}=await db.auth.setSession({access_token:recovery.access,refresh_token:recovery.refresh});
      const update=sessionError?{error:sessionError}:await db.auth.updateUser({password:body.password});
      await db.auth.signOut({scope:'global'});
      store.set(recoveryCookie,'',{...cookieOptions,maxAge:0});
      // Recovery never installs a normal SSR login session.
      await (await serverSupabase({writeCookies:true})).auth.signOut({scope:'local'});
      return update.error?reply({error:generic},400):reply({ok:true,redirect:loginPage(role)});
    }
    const email=normalizeEmail(body.email);
    if(!email)return reply({error:'Geçerli bir e-posta adresi girin.'},400);
    if(!await limit(action,email))return reply({error:'Çok fazla deneme. Birkaç dakika sonra tekrar deneyin.'},429);
    if(action==='recover'){
      const db=isolatedAuth();
      await db.auth.resetPasswordForEmail(email,{redirectTo:safeAuthOrigin(process.env.EMAIL_AUTH_ORIGIN)+'/api/auth/email/callback'});
      return reply({ok:true,message:'Hesabınız uygunsa parola sıfırlama iletisi gönderilecektir.'});
    }
    if(action==='resend'){
      await isolatedAuth().auth.resend({type:'signup',email});
      return reply({ok:true,message:'Hesabınız uygunsa yeni doğrulama kodu gönderilecektir.'});
    }
    const db=await serverSupabase({writeCookies:true});
    if(action==='verify'){
      const store=await cookies();
      const intent=openRegistration(store.get('hizmetpey-email-registration-'+role)?.value);
      if(!intent||intent.role!==role||intent.email!==email)return reply({error:'Kayıt oturumu geçersiz. Kayıt ekranından tekrar devam edin.'},400);
      const pending=await adminSupabase().rpc('email_auth_pending',{p_user_id:intent.uid,p_purpose:role});
      if(pending.error||pending.data!==true)return reply({error:'Kayıt tamamlanmış veya geçersiz. E-posta ve şifrenizle giriş yapın.'},400);
      if(!validEmailOtp(body.token))return reply({error:'6 haneli e-posta kodunu girin.'},400);
      const {data,error}=await db.auth.verifyOtp({email,token:body.token,type:'email'});
      if(error||!data.user||data.user.id!==intent.uid||normalizeEmail(data.user.email)!==email)return reply({error:'Kod geçersiz veya süresi dolmuş.'},400);
      if(!await complete(data.user,role)){
        await db.auth.signOut({scope:'local'});
        return reply({error:'Profil tamamlanamadı. E-posta ve şifrenizle tekrar giriş yaparak devam edin.'},409);
      }
      store.set('hizmetpey-email-registration-'+role,'',{...cookieOptions,maxAge:0});
      return reply({ok:true,redirect:destination(role)});
    }
    if(typeof body.password!=='string'||body.password.length>128)return reply({error:generic},400);
    if(action==='login'){
      const {data,error}=await db.auth.signInWithPassword({email,password:body.password});
      if(error||!data.user)return reply({error:'E-posta veya şifre hatalı; e-posta doğrulamanızı da kontrol edin.'},401);
      if(!await complete(data.user,role)){
        await db.auth.signOut({scope:'local'});
        return reply({error:'Bu uygulamaya erişilemiyor. Kayıt bilgilerinizi tamamlayın veya destek alın.'},403);
      }
      return reply({ok:true,redirect:destination(role)});
    }
    if(!validPassword(body.password))return reply({error:'Şifre en az 10 karakter, büyük/küçük harf ve rakam içermeli.'},400);
    const application=parseApplication(body);
    if(!application||!application.email)return reply({error:'Kayıt bilgilerini kontrol edin.'},400);
    const valid=await validSelection(application);
    if(!valid)return reply({error:'Adres, bölge veya kategori seçimi geçersiz.'},400);
    // Password proof permits resuming confirmed but incomplete registrations after a lost response.
    const proof=isolatedAuth();
    const resumed=await proof.auth.signInWithPassword({email,password:body.password});
    let user:User|null=resumed.data.user;
    if(resumed.data.session)await proof.auth.signOut({scope:'local'});
    const {data:phoneOwners,error:phoneError}=await adminSupabase().from('users').select('id')
      .in('phone',phoneLookupVariants(application.phone));
    if(phoneError)throw new Error('Identity check unavailable');
    if(phoneOwners?.some(owner=>owner.id!==user?.id))return reply({ok:true,requiresOtp:true});
    if(!user){
      const signup=await isolatedAuth().auth.signUp({email,password:body.password,options:{data:{full_name:application.fullName}}});
      if(signup.error||!signup.data.user)return reply({error:generic},400);
      user=signup.data.user;
      // Confirmations must be enabled. Never silently grant access with an auto-confirmed signup.
      if(signup.data.session)return reply({error:'Kayıt doğrulama yapılandırması uygun değil.'},503);
    }
    const {error:beginError}=await adminSupabase().rpc('email_auth_begin',{
      p_user_id:user.id,p_purpose:role,p_application:{...application,email},
    });
    if(beginError)return reply({ok:true,requiresOtp:true});
    if(user.email_confirmed_at&&resumed.data.user){
      const {data,error}=await db.auth.signInWithPassword({email,password:body.password});
      if(!error&&data.user&&await complete(data.user,role))
        return reply({ok:true,requiresOtp:false,redirect:destination(role)});
      await db.auth.signOut({scope:'local'});
      return reply({error:generic},409);
    }
    const response=reply({ok:true,requiresOtp:true});
    response.cookies.set('hizmetpey-email-registration-'+role,
      sealRegistration({uid:user.id,email,role,expires:Date.now()+900000}),{...cookieOptions,maxAge:900});
    return response;
  }catch{return reply({error:'Kimlik hizmetine şu anda ulaşılamıyor. Daha sonra tekrar deneyin.'},503);}
}
export async function emailRecoveryCallback(request:Request,role:Role){
  if(!sameOriginJson(request,safeAuthOrigin(process.env.EMAIL_AUTH_ORIGIN)))return reply({error:'Geçersiz istek.'},403);
  const deny=()=>reply({error:'Sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir ileti isteyin.'},400);
  const body=await request.json().catch(()=>null);
  const token=body?.token_hash;
  if(body?.type!=='recovery'||typeof token!=='string'||!token||token.length>1000)return deny();
  try{
    if(!await limit('callback',digest(token)))return deny();
    const db=isolatedAuth();
    const {data,error}=await db.auth.verifyOtp({token_hash:token,type:'recovery'});
    if(error||!data.user||!data.session||!await ready(data.user,role)){
      if(data.session)await db.auth.signOut({scope:'local'});
      return deny();
    }
    const response=reply({ok:true});
    response.headers.set('Referrer-Policy','no-referrer');
    response.cookies.set(recoveryCookie,seal({uid:data.user.id,access:data.session.access_token,
      refresh:data.session.refresh_token,nonce:randomUUID(),expires:Date.now()+600000,role}),cookieOptions);
    return response;
  }catch{return deny();}
}
