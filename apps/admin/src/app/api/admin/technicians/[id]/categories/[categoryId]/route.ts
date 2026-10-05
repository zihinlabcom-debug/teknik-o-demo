import {NextResponse} from 'next/server';
import {adminChangeTechnicianCategory} from '@/lib/technician-management';
import {operationErrorResponse} from '@/lib/operation-server';

export async function POST(request:Request,{params}:{params:Promise<{id:string;categoryId:string}>}){
  try{
    const body=await request.json().catch(()=>null);
    if(body?.action!=='approve'&&body?.action!=='reject')return NextResponse.json(
      {error:'Geçersiz işlem.'},{status:400,headers:{'Cache-Control':'no-store'}});
    const {id,categoryId}=await params;
    return NextResponse.json(await adminChangeTechnicianCategory(id,categoryId,body.action),
      {headers:{'Cache-Control':'no-store'}});
  }catch(error){const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
