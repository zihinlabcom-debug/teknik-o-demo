import {NextResponse} from 'next/server';
import {adminChangeTechnician} from '@/lib/technician-management';
import {operationErrorResponse} from '@/lib/operation-server';

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
    if(!body||typeof body.action!=='string')return NextResponse.json(
      {error:'Geçersiz istek.',code:'invalid_body'},{status:400,headers:{'Cache-Control':'no-store'}});
    const {id}=await params;
    const result=await adminChangeTechnician(id,{
      action:body.action,
      categoryId:typeof body.categoryId==='string'?body.categoryId:undefined,
      cityId:typeof body.cityId==='number'?body.cityId:undefined,
      districtId:typeof body.districtId==='number'?body.districtId:undefined,
      documentId:typeof body.documentId==='string'?body.documentId:undefined,
    });
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
