import {NextResponse} from 'next/server';
import {technicianDocumentLink} from '@/lib/technician-documents';
import {operationErrorResponse} from '@/lib/operation-server';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const link=await technicianDocumentLink((await params).id);
    return NextResponse.redirect(link,{status:302,headers:{'Cache-Control':'private, no-store',
      'Referrer-Policy':'no-referrer'}});
  }catch(error){const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
