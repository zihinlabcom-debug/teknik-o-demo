import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/account-supabase';
import {adminSessionCookie} from '@/lib/admin-session';
import {safeAuthOrigin} from '@/lib/email-auth-policy';

export async function POST(request:Request){
  try{
    const {error}=await (await serverSupabase({writeCookies:true,adminSession:true})).auth.signOut();
    if(error)return NextResponse.json({error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},{status:503});
    const response=NextResponse.redirect(new URL('/giris-admin',safeAuthOrigin(process.env.ADMIN_AUTH_ORIGIN)),{status:303});
    response.cookies.delete(adminSessionCookie);
    response.cookies.delete('tekniko-admin-password-session');
    return response;
  }catch{return NextResponse.json({error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},{status:503});}
}
