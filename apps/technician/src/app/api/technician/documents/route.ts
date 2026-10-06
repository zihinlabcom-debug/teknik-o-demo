import {NextResponse} from 'next/server';
import {uploadTechnicianDocument} from '@/lib/technician-documents';
import {operationErrorResponse} from '@/lib/operation-server';

export async function POST(request:Request){
  try{
    const form=await request.formData();
    const file=form.get('file');
    const categoryId=form.get('categoryId');
    if(!(file instanceof File)||typeof categoryId!=='string')return NextResponse.json(
      {error:'Belge ve kategori gerekli.'},{status:400,headers:{'Cache-Control':'no-store'}});
    const result=await uploadTechnicianDocument(file,categoryId);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
