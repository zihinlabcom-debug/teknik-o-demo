import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/account-supabase';
import {appSurface,surfaceHome} from '@/lib/app-surface';
import {adminSessionCookie} from '@/lib/admin-session';

export async function POST(request:Request){
  try{
    const {error}=await (await serverSupabase({writeCookies:true,
      adminSession:appSurface()==='admin'})).auth.signOut();
    if(error)return NextResponse.json({error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},{status:503});
    const response=NextResponse.redirect(new URL(appSurface()==='customer'||appSurface()==='all'?'/giris':surfaceHome(appSurface()),request.url),{status:303});
    response.cookies.delete(adminSessionCookie);
    return response;
  }catch{return NextResponse.json({error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},{status:503});}
}
