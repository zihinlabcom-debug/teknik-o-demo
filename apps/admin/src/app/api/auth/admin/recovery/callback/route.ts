import {NextResponse} from 'next/server';
import {acceptAdminRecovery} from '@/lib/admin-recovery';
import {safeAuthOrigin,sameOriginJson} from '@/lib/email-auth-policy';
export async function POST(request:Request){
  try{
    if(!sameOriginJson(request,safeAuthOrigin(process.env.ADMIN_AUTH_ORIGIN)))
      return NextResponse.json({error:'Geçersiz istek.'},{status:403});
    const body=await request.json().catch(()=>null);
    return await acceptAdminRecovery(body?.token_hash,body?.type);
  }catch{return NextResponse.json({error:'Güvenli kurtarma hizmeti kullanılamıyor.'},{status:503});}
}
