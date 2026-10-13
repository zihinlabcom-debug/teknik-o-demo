import {emailRecoveryCallback} from '@/lib/email-auth-route';
export async function POST(request:Request){return emailRecoveryCallback(request,'technician');}
import {NextResponse} from 'next/server';
import {safeAuthOrigin} from '@/lib/email-auth-policy';
// The browser preserves the URL fragment across this fixed redirect.
// No recovery secret is received in this GET request.
export async function GET(){
 return NextResponse.redirect(new URL('/sifre-yenile',safeAuthOrigin(process.env.EMAIL_AUTH_ORIGIN)));
}
