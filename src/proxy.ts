import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {authorizePath,isAccountRole} from '@/lib/account-auth';

export async function proxy(request:NextRequest){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return NextResponse.redirect(new URL('/giris?error=account',request.url));
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
    console.info('[stage1-auth] proxy request',{
      path:request.nextUrl.pathname,
      requestCookieCount:request.cookies.getAll().length,
      requestCookieNames:request.cookies.getAll().map(cookie=>cookie.name),
    });
    const {data:{user},error:userError}=await db.auth.getUser();
    console.info('[stage1-auth] proxy user',{
      path:request.nextUrl.pathname,
      hasUser:Boolean(user),
      hasUserError:Boolean(userError),
    });
    let account=null;
    if(user&&!userError){
      const {data,error}=await db.from('users').select('id,role,is_test,is_active').eq('id',user.id).maybeSingle();
      if(!error&&data&&isAccountRole(data.role)&&typeof data.is_test==='boolean'&&typeof data.is_active==='boolean')account=data;
    }
    const decision=authorizePath(request.nextUrl.pathname,account);
    if(!decision.allowed){
      const redirect=NextResponse.redirect(new URL(decision.redirect,request.url));
      response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
      return redirect;
    }
    return response;
  }catch{return NextResponse.redirect(new URL('/giris?error=account',request.url));}
}

export const config={matcher:[
  '/admin/:path*','/usta/:path*','/musteri/:path*','/hizmetler/:path*',
  '/kategoriler/:path*','/dashboard/:path*','/iletisim/:path*','/teshis/:path*',
]};
