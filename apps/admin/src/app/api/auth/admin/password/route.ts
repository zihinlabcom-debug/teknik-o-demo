import {NextResponse} from 'next/server';
import {loginAdminWithPassword} from '@/lib/admin-password-auth';
import {adminSessionCookie} from '@/lib/admin-session';

export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  try{
    const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||
      request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
    const result=await loginAdminWithPassword(body?.password,ip);
    if(!result.ok)return NextResponse.json(result,{status:401,headers:{'Cache-Control':'no-store'}});
    const response=NextResponse.json({ok:true,redirect:result.redirect},
      {headers:{'Cache-Control':'no-store'}});
    response.cookies.set(adminSessionCookie,result.marker,{httpOnly:true,
      secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*60*60});
    return response;
  }catch{return NextResponse.json({ok:false,error:'Giriş bilgileri geçersiz.'},
    {status:401,headers:{'Cache-Control':'no-store'}});}
}
