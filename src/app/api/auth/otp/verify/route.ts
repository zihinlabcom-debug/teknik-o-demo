import {NextResponse} from 'next/server';
import {verifyOtp} from '@/lib/account-otp';
import type {PendingCookie} from '@/lib/account-supabase';

export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.phone!=='string'||typeof body.token!=='string')
    return NextResponse.json({error:'Geçersiz istek.'},{status:400});
  const pendingCookies:PendingCookie[]=[];
  const result=await verifyOtp(
    {phone:body.phone,token:body.token},
    values=>pendingCookies.push(...values),
  );
  const response=NextResponse.json(result,{status:result.ok?200:400});
  pendingCookies.forEach(({name,value,options})=>response.cookies.set(name,value,options));
  return response;
}
