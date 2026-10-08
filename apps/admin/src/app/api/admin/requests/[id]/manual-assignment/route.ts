import {NextResponse} from 'next/server';
import {adminManualAssignServiceJob,operationErrorResponse} from '@/lib/operation-server';

export async function POST(
  req:Request,
  {params}:{params:Promise<{id:string}>}
){
  try{
    const origin=req.headers.get('origin');
    if(!origin||origin!==new URL(req.url).origin){
      return NextResponse.json(
        {error:'İstek kaynağı doğrulanamadı.',code:'invalid_origin'},
        {status:403,headers:{'Cache-Control':'no-store'}}
      );
    }
    const body=await req.json().catch(()=>null) as Record<string,unknown>|null;

    if(
      !body ||
      typeof body.technicianId!=='string' ||
      typeof body.reason!=='string' ||
      typeof body.idempotencyKey!=='string'
    ){
      return NextResponse.json(
        {error:'Geçersiz istek.',code:'invalid_body'},
        {status:400,headers:{'Cache-Control':'no-store'}}
      );
    }

    const {id}=await params;

    const result=await adminManualAssignServiceJob(
      id,
      body.technicianId,
      body.reason,
      body.idempotencyKey
    );

    return NextResponse.json(
      result,
      {headers:{'Cache-Control':'no-store'}}
    );
  }catch(error){
    const result=operationErrorResponse(error);
    return NextResponse.json(
      result.body,
      {status:result.status,headers:{'Cache-Control':'no-store'}}
    );
  }
}