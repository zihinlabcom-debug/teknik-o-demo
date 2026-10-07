import {NextResponse} from 'next/server';
import {
  createTechnicianAppointment,
  OperationError,
  operationErrorResponse,
} from '@/lib/operation-server';

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;

    let body:unknown;

    try{
      body=await req.json();
    }catch{
      throw new OperationError('invalid_body',400,'Geçersiz istek gövdesi.');
    }

    const startsAt=
      body!==null
      && typeof body==='object'
      && 'startsAt' in body
        ?(body as {startsAt:unknown}).startsAt
        :undefined;

    return NextResponse.json(
      await createTechnicianAppointment(id,startsAt),
      {headers:{'Cache-Control':'no-store'}}
    );
  }catch(error){
    const result=operationErrorResponse(error);

    return NextResponse.json(
      result.body,
      {
        status:result.status,
        headers:{'Cache-Control':'no-store'},
      }
    );
  }
}