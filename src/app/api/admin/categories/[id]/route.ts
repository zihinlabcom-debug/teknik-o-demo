import {NextResponse} from 'next/server';
import {adminSetCategoryDocumentRequirement} from '@/lib/technician-management';
import {operationErrorResponse} from '@/lib/operation-server';

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const body=await request.json().catch(()=>null);
    if(typeof body?.requiresDocument!=='boolean')return NextResponse.json(
      {error:'Geçersiz işlem.'},{status:400,headers:{'Cache-Control':'no-store'}});
    return NextResponse.json(await adminSetCategoryDocumentRequirement((await params).id,body.requiresDocument),
      {headers:{'Cache-Control':'no-store'}});
  }catch(error){const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
