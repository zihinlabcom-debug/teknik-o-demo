import {NextResponse} from 'next/server';
import {completeTechnicianJob,operationErrorResponse} from '@/lib/operation-server';

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
  try{const {id}=await params; return NextResponse.json(await completeTechnicianJob(id),{headers:{'Cache-Control':'no-store'}});}
  catch(error){const result=operationErrorResponse(error); return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
