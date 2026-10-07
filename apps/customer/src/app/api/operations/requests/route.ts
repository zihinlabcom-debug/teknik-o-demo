import {NextResponse} from 'next/server';
import {createCustomerServiceRequest,operationErrorResponse} from '@/lib/operation-server';

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>null) as null|Record<string,unknown>;
    if(!body) return NextResponse.json({error:'Geçersiz istek.',code:'invalid_body'},{status:400,headers:{'Cache-Control':'no-store'}});
    const requestedServiceMode=body.requestedServiceMode===undefined?'immediate':body.requestedServiceMode;
    if(requestedServiceMode!=='immediate'&&requestedServiceMode!=='scheduled')
      return NextResponse.json({error:'Geçersiz hizmet zamanı seçimi.',code:'invalid_service_mode'},{status:400,headers:{'Cache-Control':'no-store'}});
    const rawRequestedServiceDate=body.requestedServiceDate;
    if(rawRequestedServiceDate!==undefined&&rawRequestedServiceDate!==null&&typeof rawRequestedServiceDate!=='string')
      return NextResponse.json({error:'Geçersiz hizmet tarihi.',code:'invalid_service_date'},{status:400,headers:{'Cache-Control':'no-store'}});
    const result=await createCustomerServiceRequest({
      conversationToken:typeof body.conversationToken==='string'?body.conversationToken:'',
      requestedServiceMode,
      requestedServiceDate:typeof rawRequestedServiceDate==='string'?rawRequestedServiceDate:null,
    });
    return NextResponse.json(result,{status:201,headers:{'Cache-Control':'no-store'}});
  }catch(error){
    const result=operationErrorResponse(error);
    return NextResponse.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});
  }
}
