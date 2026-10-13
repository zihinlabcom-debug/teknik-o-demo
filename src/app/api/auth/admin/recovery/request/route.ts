import {NextResponse} from 'next/server';
import {requestAdminPasswordRecovery} from '@/lib/admin-recovery';
import {safeAuthOrigin,sameOriginJson} from '@/lib/email-auth-policy';
export async function POST(request:Request){
  try{
    if(!sameOriginJson(request,safeAuthOrigin(process.env.ADMIN_AUTH_ORIGIN)))
      return NextResponse.json({error:'Geçersiz istek.'},{status:403});
    const body=await request.json().catch(()=>null);
    return await requestAdminPasswordRecovery(body?.email,safeAuthOrigin(process.env.ADMIN_AUTH_ORIGIN));
  }catch{return NextResponse.json({error:'Güvenli kurtarma hizmeti kullanılamıyor.'},{status:503});}
}
