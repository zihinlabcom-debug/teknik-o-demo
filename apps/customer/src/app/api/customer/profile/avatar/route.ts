import {NextResponse} from 'next/server';
import {uploadCustomerAvatar} from '@/lib/profile-server';
import {operationErrorResponse} from '@/lib/operation-server';

export async function POST(request:Request){
  try{
    const file=(await request.formData()).get('file');
    if(!(file instanceof File))return NextResponse.json({error:'Görsel gerekli.'},{status:400});
    return NextResponse.json(await uploadCustomerAvatar(file),{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});
  }
}
