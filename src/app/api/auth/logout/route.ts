import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/account-supabase';
import {appSurface,surfaceHome} from '@/lib/app-surface';

export async function POST(request:Request){
  try{
    const {error}=await (await serverSupabase({writeCookies:true})).auth.signOut();
    if(error)return NextResponse.json({error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},{status:503});
    return NextResponse.redirect(new URL(appSurface()==='customer'||appSurface()==='all'?'/giris':surfaceHome(appSurface()),request.url),{status:303});
  }catch{return NextResponse.json({error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},{status:503});}
}
