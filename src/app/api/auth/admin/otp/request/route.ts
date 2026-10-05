import {NextResponse} from 'next/server';
import {requestOtp} from '@/lib/account-otp';

export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.phone!=='string')return NextResponse.json({error:'Geçersiz istek.'},{status:400});
  const result=await requestOtp({phone:body.phone,mode:'login',expectedRole:'admin'});
  return NextResponse.json(result,{status:result.ok?200:400,headers:{'Cache-Control':'no-store'}});
}
