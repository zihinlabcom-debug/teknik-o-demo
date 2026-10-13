import {NextResponse} from 'next/server';
import {safeAuthOrigin} from '@/lib/email-auth-policy';
// No token in this GET request or its server logs; browser retains URL fragment.
export async function GET(){
  try{
    const origin=safeAuthOrigin(process.env.ADMIN_AUTH_ORIGIN);
    return NextResponse.redirect(new URL('/sifre-yenile-admin',origin),{
      headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'},
    });
  }catch{return new NextResponse(null,{status:503});}
}
