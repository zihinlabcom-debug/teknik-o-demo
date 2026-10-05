import {adminSupabase,serverSupabase} from './account-supabase';
import {accountDestination,normalizePhone,phoneLookupVariants,testOtpAllowed,testOtpEnvironment} from './account-auth';

type Mode='signup'|'login';
type OtpResult={ok:true;delivery:'sms'|'test';redirect?:string}|{ok:false;error:string};

function environment(){return {nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV,
  appEnv:process.env.APP_ENV,enabled:process.env.TEST_OTP_ENABLED};}

async function knownAccount(phone:string){
  const db=adminSupabase();
  const variants=phoneLookupVariants(phone);
  if(!variants.length)return null;
  const {data,error}=await db.from('users').select('id,email,is_test,is_active').in('phone',variants).limit(2);
  if(error)throw new Error('Account lookup failed');
  if(data?.length!==1||data[0].is_active!==true)return null;
  return data[0] as {id:string;email:string|null;is_test:boolean;is_active:true};
}

async function testAccount(phone:string){
  const account=await knownAccount(phone);
  return account?.is_test===true&&account.email?account as typeof account & {email:string;is_test:true}:null;
}

export async function requestOtp(input:{phone:string;mode:Mode;fullName?:string}):Promise<OtpResult>{
  const phone=normalizePhone(input.phone);
  if(!phone)return {ok:false,error:'Geçerli bir cep telefonu numarası girin.'};
  if(input.mode!=='signup'&&input.mode!=='login')return {ok:false,error:'Geçersiz işlem.'};
  if(input.mode==='signup'&&(!input.fullName?.trim()||input.fullName.trim().length>200))return {ok:false,error:'Ad soyad girin.'};
  try{
    const account=input.mode==='login'||testOtpEnvironment(environment())?await knownAccount(phone):null;
    if(input.mode==='login'&&!account)return {ok:false,error:'Hesap bulunamadı veya doğrulama başlatılamadı.'};
    if(testOtpEnvironment(environment())&&account?.is_test&&account.email)return {ok:true,delivery:'test'};
    const db=await serverSupabase();
    const {error}=await db.auth.signInWithOtp({phone,options:{
      shouldCreateUser:input.mode==='signup',
      ...(input.mode==='signup'?{data:{full_name:input.fullName!.trim()}}:{}),
    }});
    if(error)return {ok:false,error:'SMS doğrulaması başlatılamadı. Sağlayıcı yapılandırmasını kontrol edin.'};
    return {ok:true,delivery:'sms'};
  }catch{return {ok:false,error:'Doğrulama hizmetine şu anda ulaşılamıyor.'};}
}

export async function verifyOtp(input:{phone:string;token:string}):Promise<OtpResult>{
  const phone=normalizePhone(input.phone);
  const token=input.token.trim();
  if(!phone||!/^\d{4,10}$/.test(token))return {ok:false,error:'Geçerli bir doğrulama kodu girin.'};
  try{
    const db=await serverSupabase({writeCookies:true});
    let userId:string|undefined;
    if(testOtpEnvironment(environment())){
      const account=await testAccount(phone);
      if(account){
        if(!testOtpAllowed({...environment(),configuredCode:process.env.TEST_OTP_CODE,submittedCode:token,isTest:true}))
          return {ok:false,error:'Doğrulama kodu geçersiz.'};
        const admin=adminSupabase();
        const {data:link,error:linkError}=await admin.auth.admin.generateLink({type:'magiclink',email:account.email});
        if(linkError||!link||link.user.id!==account.id)return {ok:false,error:'Test hesabı doğrulanamadı.'};
        const {data,error}=await db.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'});
        if(error||!data.user||data.user.id!==account.id){await db.auth.signOut();return {ok:false,error:'Test hesabı doğrulanamadı.'};}
        userId=data.user.id;
      }
    }
    if(!userId){
      const {data,error}=await db.auth.verifyOtp({phone,token,type:'sms'});
      if(error||!data.user)return {ok:false,error:'Doğrulama kodu geçersiz veya süresi dolmuş.'};
      userId=data.user.id;
    }
    const {data:profile,error:profileError}=await db.from('users').select('role,is_active').eq('id',userId).maybeSingle();
    if(profileError||!profile||profile.is_active!==true||!['customer','technician','admin'].includes(profile.role)){
      await db.auth.signOut();
      return {ok:false,error:'Hesap profili doğrulanamadı. Destek ile iletişime geçin.'};
    }
    return {ok:true,delivery:'sms',redirect:accountDestination(profile.role)};
  }catch{return {ok:false,error:'Doğrulama hizmetine şu anda ulaşılamıyor.'};}
}
