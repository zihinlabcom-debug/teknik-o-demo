import {NextResponse} from 'next/server';
import {requestOtp} from '@/lib/account-otp';

export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.phone!=='string'||(body.mode!=='signup'&&body.mode!=='login'))
    return NextResponse.json({error:'Geçersiz istek.'},{status:400});
  const result=await requestOtp({phone:body.phone,mode:body.mode,fullName:typeof body.fullName==='string'?body.fullName:undefined,expectedRole:'customer'});
  return NextResponse.json(result,{status:result.ok?200:400});
}
