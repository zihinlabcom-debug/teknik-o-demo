import {NextResponse} from 'next/server';
import {createCustomerServiceRequest,operationErrorResponse} from '@/lib/operation-server';

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>null) as null|Record<string,unknown>;
    if(!body) return NextResponse.json({error:'Geçersiz istek.',code:'invalid_body'},{status:400,headers:{'Cache-Control':'no-store'}});
    const result=await createCustomerServiceRequest({
      conversationToken:typeof body.conversationToken==='string'?body.conversationToken:'',
    });
    return NextResponse.json(result,{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});
  }
}
