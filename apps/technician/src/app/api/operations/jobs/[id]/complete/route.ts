import {NextResponse} from 'next/server';
import {completeTechnicianJob,operationErrorResponse} from '@/lib/operation-server';
import {requestIp} from '@/lib/finance/iyzico-job-capture';

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;
    const result=await completeTechnicianJob(id,requestIp(req));
    const pending=result.payment?.reconciliationRequired===true||
      (result.payment!==undefined&&result.payment.outcome!=='succeeded');
    return NextResponse.json(result,{status:pending?202:200,headers:{'Cache-Control':'no-store'}});
  }
  catch(error){const result=operationErrorResponse(error); return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
