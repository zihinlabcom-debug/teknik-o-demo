import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {accountDestination,acceptsAccountRole,normalizePhone,type AccountRole} from './account-auth';
import {adminSupabase,currentAccount,publicSupabaseConfig,serverSupabase} from './account-supabase';

type AuthResult={ok:true;redirect:string}|{ok:false;error:string};
type SignupResult={ok:true;userId:string;requiresOtp:boolean;resumed:boolean}|{ok:false;error:string};

export function validPassword(value:unknown):value is string{
  return typeof value==='string'&&value.length>=10&&value.length<=128&&
    /[a-z]/.test(value)&&/[A-Z]/.test(value)&&/[0-9]/.test(value);
}

export async function loginWithPassword(phoneInput:unknown,password:unknown,expectedRole:AccountRole):Promise<AuthResult>{
  const phone=typeof phoneInput==='string'?normalizePhone(phoneInput):null;
  if(!phone||typeof password!=='string'||password.length>128)
    return {ok:false,error:'Telefon numarası veya şifre hatalı.'};
  try{
    const db=await serverSupabase({writeCookies:true});
    const {data,error}=await db.auth.signInWithPassword({phone,password});
    if(error||!data.user)return {ok:false,error:'Telefon numarası veya şifre hatalı.'};
    const {data:account,error:accountError}=await db.from('users')
      .select('role,is_active').eq('id',data.user.id).maybeSingle();
    if(accountError||!account||account.is_active!==true||!acceptsAccountRole(account.role,expectedRole)){
      await db.auth.signOut({scope:'local'});
      return {ok:false,error:'Bu hesap bu uygulamada kullanılamaz.'};
    }
    return {ok:true,redirect:accountDestination(expectedRole)};
  }catch{return {ok:false,error:'Giriş hizmetine şu anda ulaşılamıyor.'};}
}

export async function signUpWithPassword(input:{phone:unknown;password:unknown;fullName:unknown}):Promise<SignupResult>{
  const phone=typeof input.phone==='string'?normalizePhone(input.phone):null;
  const fullName=typeof input.fullName==='string'?input.fullName.trim():'';
  if(!phone||fullName.length<2||fullName.length>200||!validPassword(input.password))
    return {ok:false,error:'Kayıt bilgilerini ve şifre kurallarını kontrol edin.'};
  try{
    const db=await serverSupabase({writeCookies:true});
    const {data,error}=await db.auth.signUp({phone,password:input.password,options:{channel:'sms',data:{full_name:fullName}}});
    if(!error&&data.user)return {ok:true,userId:data.user.id,requiresOtp:!data.session,resumed:false};
    const {data:resume,error:resumeError}=await db.auth.signInWithPassword({phone,password:input.password});
    if(resumeError||!resume.user)
      return {ok:false,error:'Kayıt oluşturulamadı. Telefon numarasını ve şifreyi kontrol edin.'};
    return {ok:true,userId:resume.user.id,requiresOtp:false,resumed:true};
  }catch{return {ok:false,error:'Kayıt hizmetine şu anda ulaşılamıyor.'};}
}

export async function verifyCurrentPassword(userId:string,password:unknown){
  if(typeof password!=='string'||password.length>128)return false;
  const admin=adminSupabase();
  const {data:authAccount,error}=await admin.auth.admin.getUserById(userId);
  const phone=authAccount.user?.phone?normalizePhone(authAccount.user.phone):null;
  if(error||!phone)return false;
  const {url,key}=publicSupabaseConfig();
  const verifier=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error:loginError}=await verifier.auth.signInWithPassword({phone,password});
  return !loginError&&data.user?.id===userId;
}

export async function beginPhoneChange(newPhoneInput:unknown,currentPassword:unknown,expectedRole:AccountRole){
  const account=await currentAccount();
  const newPhone=typeof newPhoneInput==='string'?normalizePhone(newPhoneInput):null;
  if(!account||account.role!==expectedRole)return {ok:false as const,error:'Aktif oturum gerekli.'};
  if(!newPhone)return {ok:false as const,error:'Geçerli bir yeni telefon numarası girin.'};
  if(!await verifyCurrentPassword(account.id,currentPassword))
    return {ok:false as const,error:'Mevcut şifre hatalı.'};
  const db=await serverSupabase({writeCookies:true});
  const {error}=await db.auth.updateUser({phone:newPhone,current_password:String(currentPassword)});
  return error?{ok:false as const,error:'Telefon doğrulaması başlatılamadı.'}:{ok:true as const,phone:newPhone};
}

export async function confirmPhoneChange(newPhoneInput:unknown,tokenInput:unknown,expectedRole:AccountRole){
  const account=await currentAccount();
  const phone=typeof newPhoneInput==='string'?normalizePhone(newPhoneInput):null;
  const token=typeof tokenInput==='string'?tokenInput.trim():'';
  if(!account||account.role!==expectedRole)return {ok:false as const,error:'Aktif oturum gerekli.'};
  if(!phone||!/^[0-9]{6,10}$/.test(token))return {ok:false as const,error:'Doğrulama bilgilerini kontrol edin.'};
  const db=await serverSupabase({writeCookies:true});
  const {data,error}=await db.auth.verifyOtp({phone,token,type:'phone_change'});
  if(error||data.user?.id!==account.id||normalizePhone(data.user.phone??'')!==phone){
    const {data:verified,error:lookupError}=await adminSupabase().auth.admin.getUserById(account.id);
    if(lookupError||!verified.user.phone_confirmed_at||normalizePhone(verified.user.phone??'')!==phone)
      return {ok:false as const,error:'Doğrulama kodu geçersiz veya süresi dolmuş.'};
  }
  const {error:updateError}=await adminSupabase().rpc('sync_verified_account_phone',{
    p_actor_id:account.id,p_phone:phone,
  });
  return updateError?{ok:false as const,error:'Telefon profil kaydı güncellenemedi.'}:{ok:true as const};
}

export async function beginPasswordChange(expectedRole:AccountRole){
  const account=await currentAccount();
  if(!account||account.role!==expectedRole)return {ok:false as const,error:'Aktif oturum gerekli.'};
  const {error}=await (await serverSupabase({writeCookies:true})).auth.reauthenticate();
  return error?{ok:false as const,error:'SMS doğrulaması başlatılamadı.'}:{ok:true as const};
}

export async function confirmPasswordChange(password:unknown,nonceInput:unknown,expectedRole:AccountRole){
  const account=await currentAccount();
  const nonce=typeof nonceInput==='string'?nonceInput.trim():'';
  if(!account||account.role!==expectedRole)return {ok:false as const,error:'Aktif oturum gerekli.'};
  if(!validPassword(password)||!/^[0-9]{6,10}$/.test(nonce))
    return {ok:false as const,error:'Kod veya yeni şifre kurallara uygun değil.'};
  const {error}=await (await serverSupabase({writeCookies:true})).auth.updateUser({password,nonce});
  return error?{ok:false as const,error:'Şifre değiştirilemedi. Kodun süresini kontrol edin.'}:{ok:true as const};
}
