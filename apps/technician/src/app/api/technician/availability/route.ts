import {NextResponse} from 'next/server';
import {setOwnTechnicianAvailability} from '@/lib/technician-management';
import {operationErrorResponse} from '@/lib/operation-server';

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>null) as Record<string,unknown>|null;
    if(!body||typeof body.isAvailable!=='boolean')return NextResponse.json(
      {error:'Geçersiz istek.',code:'invalid_body'},{status:400,headers:{'Cache-Control':'no-store'}});
    const result=await setOwnTechnicianAvailability(body.isAvailable);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
