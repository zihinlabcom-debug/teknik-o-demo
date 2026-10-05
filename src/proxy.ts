import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {authorizePath,isAccountRole,requiredRole} from '@/lib/account-auth';
import {appSurface,surfaceAllowsPath,surfaceHome} from '@/lib/app-surface';

export async function proxy(request:NextRequest){
  const surface=appSurface();
  const path=request.nextUrl.pathname;
  if(path==='/'&&surface!=='all'&&surface!=='customer')
    return NextResponse.redirect(new URL(surfaceHome(surface),request.url));
  if(!surfaceAllowsPath(path,surface))
    return path.startsWith('/api/')?new NextResponse(null,{status:404}):
      NextResponse.redirect(new URL(surfaceHome(surface),request.url));
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return requiredRole(path)?NextResponse.redirect(new URL(surfaceHome(surface),request.url)):
    NextResponse.next({request});
  let response=NextResponse.next({request});
  const db=createServerClient(url,key,{cookies:{
    getAll(){return request.cookies.getAll();},
    setAll(values){
      values.forEach(({name,value})=>request.cookies.set(name,value));
      response=NextResponse.next({request});
      values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
    },
  }});
  try{
    const {data:{user},error:userError}=await db.auth.getUser();
    let account=null;
    if(user&&!userError){
      const {data,error}=await db.from('users').select('id,role,is_test,is_active').eq('id',user.id).maybeSingle();
      if(!error&&data&&isAccountRole(data.role)&&typeof data.is_test==='boolean'&&typeof data.is_active==='boolean')account=data;
    }
    const decision=authorizePath(path,account);
    if(!decision.allowed){
      const redirect=NextResponse.redirect(new URL(decision.redirect,request.url));
      response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
      return redirect;
    }
    return response;
  }catch{return requiredRole(path)?NextResponse.redirect(new URL(surfaceHome(surface),request.url)):
    NextResponse.next({request});}
}

export const config={matcher:['/((?!_next|.*\\..*).*)']};
