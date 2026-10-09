import {NextResponse} from 'next/server';
import {customerDecideAdditionalCost} from '@/lib/stage10-server';
import {operationErrorResponse} from '@/lib/operation-server';
import {parseStage10Json} from '@/lib/stage10-http';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params; const body=await parseStage10Json(request);
    if(typeof body.accept!=='boolean'||typeof body.version!=='number')return NextResponse.json({error:'Geçersiz karar.'},{status:400});
    return NextResponse.json(await customerDecideAdditionalCost(id,body.accept,body.version),{headers:{'Cache-Control':'no-store'}});
  }catch(error){const result=operationErrorResponse(error);return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
