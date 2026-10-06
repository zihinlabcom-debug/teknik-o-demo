import {NextRequest,NextResponse} from 'next/server';
import {verifyOtp} from '@/lib/account-otp';
import {completeTechnicianApplication,openTechnicianApplication,technicianIntentCookie} from '@/lib/technician-onboarding';

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>null);
  if(!body||typeof body.phone!=='string'||typeof body.token!=='string')
    return NextResponse.json({error:'Geçersiz istek.'},{status:400});
  const intent=request.cookies.get(technicianIntentCookie)?.value;
  const application=intent?openTechnicianApplication(intent,body.phone):null;
  if(intent&&!application)return NextResponse.json({error:'Başvuru süresi doldu. Bilgileri yeniden girin.'},{status:400});
  const result=await verifyOtp({phone:body.phone,token:body.token,expectedRole:'technician',
    ...(application?{onVerified:(userId:string)=>completeTechnicianApplication(userId,application)}:{})});
  const response=NextResponse.json(result,{status:result.ok?200:400,headers:{'Cache-Control':'no-store'}});
  if(result.ok)response.cookies.delete({name:technicianIntentCookie,path:'/api/auth/technician/otp'});
  return response;
}
