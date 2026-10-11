import {NextRequest,NextResponse} from 'next/server';
import {signUpWithPassword} from '@/lib/account-password';
import {completeCustomerApplication,customerIntentCookie,parseCustomerApplication,
  sealCustomerApplication,validCustomerSelection} from '@/lib/customer-onboarding';

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>null);
  const application=parseCustomerApplication(body);
  if(!application)return NextResponse.json({error:'Kayıt bilgilerini kontrol edin.'},{status:400});
  try{if(!await validCustomerSelection(application))
    return NextResponse.json({error:'Adres seçimi geçersiz.'},{status:400});}
  catch{return NextResponse.json({error:'Adres seçenekleri doğrulanamıyor.'},{status:503});}
  const result=await signUpWithPassword({phone:application.phone,password:body?.password,fullName:application.fullName});
  if(!result.ok)return NextResponse.json(result,{status:400,headers:{'Cache-Control':'no-store'}});
  if(!result.requiresOtp){
    try{await completeCustomerApplication(result.userId,application);}
    catch{return NextResponse.json({error:'Profil bilgileri kaydedilemedi.'},{status:503});}
    return NextResponse.json({ok:true,requiresOtp:false,redirect:'/hizmetler'},{headers:{'Cache-Control':'no-store'}});
  }
  const response=NextResponse.json({ok:true,requiresOtp:true},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(customerIntentCookie,sealCustomerApplication(application),{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',
    path:'/api/auth',maxAge:900,
  });
  return response;
}
