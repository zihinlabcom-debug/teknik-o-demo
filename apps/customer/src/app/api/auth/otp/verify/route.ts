import {NextResponse} from 'next/server';
import {verifyOtp} from '@/lib/account-otp';

export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.phone!=='string'||typeof body.token!=='string')
    return NextResponse.json({error:'Geçersiz istek.'},{status:400});
  const result=await verifyOtp({phone:body.phone,token:body.token,expectedRole:'customer'});
  return NextResponse.json(result,{status:result.ok?200:400});
}
