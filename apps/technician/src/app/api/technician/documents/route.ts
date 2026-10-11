import {NextResponse} from 'next/server';
import {uploadTechnicianDocument} from '@/lib/technician-documents';
import {operationErrorResponse} from '@/lib/operation-server';
import {currentAccount} from '@/lib/account-supabase';
import {verifyCurrentPassword} from '@/lib/account-password';

export async function POST(request:Request){
  try{
    const form=await request.formData();
    const file=form.get('file');
    const categoryId=form.get('categoryId');
    const currentPassword=form.get('currentPassword');
    const account=await currentAccount();
    if(!account||account.role!=='technician')return NextResponse.json({error:'Aktif usta oturumu gerekli.'},{status:401});
    if(!(file instanceof File)||typeof categoryId!=='string'||typeof currentPassword!=='string')return NextResponse.json(
      {error:'Belge, kategori ve mevcut şifre gerekli.'},{status:400,headers:{'Cache-Control':'no-store'}});
    if(!await verifyCurrentPassword(account.id,currentPassword))return NextResponse.json(
      {error:'Mevcut şifre hatalı.'},{status:403,headers:{'Cache-Control':'no-store'}});
    const result=await uploadTechnicianDocument(file,categoryId);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
