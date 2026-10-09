import {NextResponse} from 'next/server';
import {createCustomerWarranty} from '@/lib/stage10-server';
import {operationErrorResponse} from '@/lib/operation-server';
import {parseStage10Multipart} from '@/lib/stage10-http';

export async function POST(request:Request){
  try{
    const form=await parseStage10Multipart(request);
    const files=form.getAll('evidence').filter((item):item is File=>item instanceof File&&item.size>0);
    const result=await createCustomerWarranty({requestId:form.get('requestId'),description:form.get('description'),idempotencyKey:form.get('idempotencyKey'),files});
    return NextResponse.json(result,{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){const result=operationErrorResponse(error);return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}
}
