import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {adminSessionCookie,adminSessionHeader,validAdminSession} from '@/lib/admin-session';
import {adminRouteAccess} from './lib/admin-route-access';
import {safeAuthOrigin} from '@/lib/email-auth-policy';

export async function proxy(request:NextRequest){
  const path=request.nextUrl.pathname;
  const protectedPage=path==='/admin'||path.startsWith('/admin/');
  const protectedApi=path.startsWith('/api/admin/');
  if(!protectedPage&&!protectedApi)return NextResponse.next({request});
  const deny=(status:number)=>protectedApi?
    NextResponse.json({error:'Bu işlem için yetkiniz yok.'},{status,headers:{'Cache-Control':'no-store'}}):
    NextResponse.redirect(new URL('/giris-admin',safeAuthOrigin(process.env.ADMIN_AUTH_ORIGIN)));
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return deny(503);
  let response=NextResponse.next({request});
  const marker=request.cookies.get(adminSessionCookie)?.value;
  const db=createServerClient(url,key,{global:{headers:marker?{[adminSessionHeader]:marker}:{}},cookieOptions:{httpOnly:true,
    secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/'},cookies:{
    getAll(){return request.cookies.getAll();},
    setAll(values){
      values.forEach(({name,value})=>request.cookies.set(name,value));
      response=NextResponse.next({request});
      values.forEach(({name,value,options})=>response.cookies.set(name,value,
        {...options,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/'}));
    },
  }});
  try{
    const {data:{user},error:userError}=await db.auth.getUser();
    let role:string|null=null;
    let isActive=false;
    let markerValid=false;
    if(user&&!userError){
      const {data,error}=await db.from('users').select('role,is_active').eq('id',user.id).maybeSingle();
      if(!error&&data){
        role=typeof data.role==='string'?data.role:null;
        isActive=data.is_active===true;
        if(role==='admin'&&isActive&&user.email_confirmed_at&&user.email){
          const {data:{session}}=await db.auth.getSession();
          markerValid=validAdminSession(request.cookies.get(adminSessionCookie)?.value,
            user.id,session?.access_token);
          if(markerValid){
            const {data:authorized,error:authorizationError}=await db.rpc('is_app_admin');
            markerValid=!authorizationError&&authorized===true;
          }
        }
      }
    }
    const decision=adminRouteAccess(role,isActive,markerValid);
    if(!decision.allowed){
      const denied=deny(decision.status);
      response.cookies.getAll().forEach(cookie=>denied.cookies.set(cookie));
      return denied;
    }
    return response;
  }catch{return deny(503);}
}

export const config={matcher:['/admin/:path*','/api/admin/:path*']};
