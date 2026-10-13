import {NextResponse} from 'next/server';
import {loginAdminWithPassword} from '@/lib/admin-password-auth';
import {adminSessionCookie} from '@/lib/admin-session';
import {sameOriginJson,safeAuthOrigin} from '@/lib/email-auth-policy';

export async function POST(request:Request){
  try{
    if(!sameOriginJson(request,safeAuthOrigin(process.env.ADMIN_AUTH_ORIGIN)))
      return NextResponse.json({error:'Geçersiz istek.'},{status:403});
    const body=await request.json().catch(()=>null);
    const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||
      request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const result=await loginAdminWithPassword(body?.email,body?.password,ip);
    if(!result.ok)return NextResponse.json(result,{status:401,headers:{'Cache-Control':'no-store'}});
    const response=NextResponse.json({ok:true,redirect:result.redirect},{headers:{'Cache-Control':'no-store'}});
    response.cookies.set(adminSessionCookie,result.marker,{httpOnly:true,
      secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*60*60});
    // Retired shared-password marker cannot authenticate any longer.
    response.cookies.delete('tekniko-admin-password-session');
    return response;
  }catch{return NextResponse.json({error:'Yönetici girişi kullanılamıyor.'},
    {status:503,headers:{'Cache-Control':'no-store'}});}
}
