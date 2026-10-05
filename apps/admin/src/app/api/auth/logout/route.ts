import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/account-supabase';
import {adminSessionCookie} from '@/lib/admin-session';

export async function POST(request:Request){
  try{
    const {error}=await (await serverSupabase({writeCookies:true,adminSession:true})).auth.signOut();
    if(error)return NextResponse.json({error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},{status:503});
    const response=NextResponse.redirect(new URL('/giris-admin',request.url),{status:303});
    response.cookies.delete(adminSessionCookie);
    return response;
  }catch{return NextResponse.json({error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},{status:503});}
}
