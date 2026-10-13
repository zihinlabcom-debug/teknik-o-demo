import 'server-only';
import {createHash,createHmac} from 'node:crypto';
import {adminSupabase,serverSupabase} from './account-supabase';
import {adminSessionSecret,sealAdminSession,tokenSessionId} from './admin-session';
import {normalizeEmail} from './email-auth-policy';

const denied={ok:false as const,error:'E-posta veya şifre geçersiz.'};
function fingerprint(secret:string,dimension:'ip'|'email',value:string){
  return createHmac('sha256',secret).update(`admin-login.v2:${dimension}:${value}`).digest('hex');
}
export async function loginAdminWithPassword(emailInput:unknown,passwordInput:unknown,clientIp:string){
  const email=normalizeEmail(emailInput);
  const secret=adminSessionSecret();
  if(!secret||!email||typeof passwordInput!=='string'||!passwordInput||passwordInput.length>128)return denied;
  let session:Awaited<ReturnType<typeof serverSupabase>>|null=null;
  try{
    const admin=adminSupabase();
    const keys=[fingerprint(secret,'ip',clientIp.slice(0,128)||'unknown'),fingerprint(secret,'email',email)];
    for(const key of keys){
      const {data,error}=await admin.rpc('admin_login_rate_limit',{p_fingerprint:key,p_action:'check'});
      if(error||data!==true)return denied;
    }
    const failure=async()=>{
      await Promise.all(keys.map(key=>admin.rpc('admin_login_rate_limit',{
        p_fingerprint:key,p_action:'failure',
      })));
    };
    session=await serverSupabase({writeCookies:true,adminSession:true});
    const {data,error}=await session.auth.signInWithPassword({email,password:passwordInput});
    if(error||!data.user||!data.session){await failure();return denied;}
    // Require an actual Auth verification, not client metadata or profile email.
    const verified=await session.auth.getUser();
    const user=verified.data.user;
    if(verified.error||!user||user.id!==data.user.id||!user.email_confirmed_at||
      normalizeEmail(user.email)!==email){await session.auth.signOut({scope:'local'});await failure();return denied;}
    const {data:principal,error:principalError}=await admin.from('users')
      .select('id,role,is_active').eq('id',user.id).maybeSingle();
    if(principalError||principal?.id!==user.id||principal.role!=='admin'||principal.is_active!==true){
      await session.auth.signOut({scope:'local'});await failure();return denied;
    }
    const marker=sealAdminSession(user.id,data.session.access_token);
    if(!marker){await session.auth.signOut({scope:'local'});return denied;}
    // A login is not accepted when the shared limiter cannot record its success.
    for(const key of keys){
      const {error:successError}=await admin.rpc('admin_login_rate_limit',{
        p_fingerprint:key,p_action:'success',
      });
      if(successError){await session.auth.signOut({scope:'local'});return denied;}
    }
    const sessionId=tokenSessionId(data.session.access_token);
    const {data:authorized,error:authorizationError}=await admin.rpc('admin_authorize_session',{
      p_user_id:user.id,p_session_id:sessionId,
      p_marker_hash:createHash('sha256').update(marker).digest('hex'),
    });
    if(authorizationError||authorized!==true){
      await session.auth.signOut({scope:'local'});return denied;
    }
    return {ok:true as const,redirect:'/admin',marker};
  }catch{
    if(session)await session.auth.signOut({scope:'local'}).catch(()=>{});
    return denied;
  }
}
