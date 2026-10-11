import {NextResponse} from 'next/server';
import {loginWithPassword} from '@/lib/account-password';

export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  const result=await loginWithPassword(body?.phone,body?.password,'technician');
  return NextResponse.json(result,{status:result.ok?200:401,headers:{'Cache-Control':'no-store'}});
}
