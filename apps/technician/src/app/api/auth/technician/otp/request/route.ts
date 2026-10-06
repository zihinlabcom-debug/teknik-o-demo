import {NextRequest,NextResponse} from 'next/server';
import {requestOtp} from '@/lib/account-otp';
import {openTechnicianApplication,parseTechnicianApplication,sealTechnicianApplication,technicianIntentCookie,validTechnicianSelection} from '@/lib/technician-onboarding';

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>null);
  if(body?.mode==='login'&&typeof body.phone==='string'){
    const result=await requestOtp({phone:body.phone,mode:'login',expectedRole:'technician'});
    return NextResponse.json(result,{status:result.ok?200:400,headers:{'Cache-Control':'no-store'}});
  }
  if(body?.mode!=='signup')return NextResponse.json({error:'Geçersiz istek.'},{status:400});
  const application=parseTechnicianApplication(body);
  if(!application)return NextResponse.json({error:'Başvuru bilgilerini kontrol edin.'},{status:400});
  try{if(!await validTechnicianSelection(application))
    return NextResponse.json({error:'Hizmet kategorisi veya bölge seçimi geçersiz.'},{status:400});}
  catch{return NextResponse.json({error:'Başvuru seçenekleri doğrulanamıyor.'},{status:503});}
  const prior=openTechnicianApplication(request.cookies.get(technicianIntentCookie)?.value,application.phone);
  const result=await requestOtp({phone:application.phone,fullName:application.fullName,
    mode:'signup',expectedRole:'technician',allowProvisionalCustomer:!!prior});
  if(!result.ok)return NextResponse.json(result,{status:400});
  const response=NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(technicianIntentCookie,sealTechnicianApplication(application),{
    httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',
    path:'/api/auth/technician/otp',maxAge:600,
  });
  return response;
}
