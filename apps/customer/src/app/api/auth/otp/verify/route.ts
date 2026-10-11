import {NextRequest,NextResponse} from 'next/server';
import {verifyOtp} from '@/lib/account-otp';
import {completeCustomerApplication,customerIntentCookie,openCustomerApplication} from '@/lib/customer-onboarding';

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.phone!=='string'||typeof body.token!=='string')
    return NextResponse.json({error:'Geçersiz istek.'},{status:400});
  const intent=request.cookies.get(customerIntentCookie)?.value;
  const application=intent?openCustomerApplication(intent,body.phone):null;
  if(intent&&!application)return NextResponse.json({error:'Kayıt süresi doldu. Bilgileri yeniden girin.'},{status:400});
  const result=await verifyOtp({phone:body.phone,token:body.token,expectedRole:'customer',
    ...(application?{onVerified:(userId:string)=>completeCustomerApplication(userId,application)}:{})});
  const response=NextResponse.json(result,{status:result.ok?200:400,headers:{'Cache-Control':'no-store'}});
  if(result.ok&&application)response.cookies.delete({name:customerIntentCookie,path:'/api/auth'});
  return response;
}
