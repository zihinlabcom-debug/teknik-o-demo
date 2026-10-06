import {NextResponse} from 'next/server';
import {serverSupabase} from '@/lib/account-supabase';

export async function POST(request:Request){
  try{
    const db=await serverSupabase({writeCookies:true});
    const {error}=await db.auth.signOut();

    if(error){
      return NextResponse.json(
        {error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},
        {status:503}
      );
    }

    return NextResponse.redirect(
      new URL('/giris-usta',request.url),
      {status:303}
    );
  }catch{
    return NextResponse.json(
      {error:'Oturum kapatılamadı. Lütfen tekrar deneyin.'},
      {status:503}
    );
  }
}
