import 'server-only';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {adminSupabase,serverSupabase} from './account-supabase';
import {sealAdminSession} from './admin-session';

const denied={ok:false as const,error:'Giriş bilgileri geçersiz.'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function safePasswordMatch(submitted:string,configured:string){
  const left=createHash('sha256').update(submitted).digest();
  const right=createHash('sha256').update(configured).digest();
  return timingSafeEqual(left,right);
}

export async function loginAdminWithPassword(password:unknown,clientIp:string){
  const configured=process.env.ADMIN_SHARED_PASSWORD;
  const principalId=process.env.ADMIN_SHARED_USER_ID;
  if(typeof password!=='string'||password.length>1024||!configured||configured.length<16||
    !principalId||!uuid.test(principalId))return denied;
  const fingerprint=createHmac('sha256',configured).update(clientIp.slice(0,128)||'unknown').digest('hex');
  const db=adminSupabase();
  const {data:allowed,error:limitError}=await db.rpc('admin_login_rate_limit',{
    p_fingerprint:fingerprint,p_action:'check',
  });
  if(limitError||allowed!==true)return denied;
  if(!safePasswordMatch(password,configured)){
    await db.rpc('admin_login_rate_limit',{p_fingerprint:fingerprint,p_action:'failure'});
    return denied;
  }
  const {data:principal,error:principalError}=await db.from('users')
    .select('id,role,is_active').eq('id',principalId).maybeSingle();
  if(principalError||principal?.role!=='admin'||principal.is_active!==true){
    await db.rpc('admin_login_rate_limit',{p_fingerprint:fingerprint,p_action:'failure'});
    return denied;
  }
  const {data:authUser,error:authError}=await db.auth.admin.getUserById(principalId);
  const email=authUser?.user?.email;
  if(authError||!email||authUser.user.id!==principalId){
    await db.rpc('admin_login_rate_limit',{p_fingerprint:fingerprint,p_action:'failure'});
    return denied;
  }
  const {data:link,error:linkError}=await db.auth.admin.generateLink({type:'magiclink',email});
  if(linkError||link?.user?.id!==principalId||!link.properties.hashed_token)return denied;
  const session=await serverSupabase({writeCookies:true,adminSession:true});
  const {data:verified,error:verifyError}=await session.auth.verifyOtp({
    token_hash:link.properties.hashed_token,type:'magiclink',
  });
  if(verifyError||verified?.user?.id!==principalId){await session.auth.signOut();return denied;}
  const marker=sealAdminSession(principalId,verified.session?.access_token??'');
  if(!marker){await session.auth.signOut();return denied;}
  await db.rpc('admin_login_rate_limit',{p_fingerprint:fingerprint,p_action:'success'});
  return {ok:true as const,redirect:'/admin',marker};
}
