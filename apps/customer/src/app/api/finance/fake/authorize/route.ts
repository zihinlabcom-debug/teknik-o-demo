import {NextResponse} from 'next/server';
import {authorizeAndReleaseFakePayment} from '@/lib/finance/sandbox-finance-server';
import {assertSandboxEnabled,assertSameOrigin,parseFakeAuthorization,FinanceInputError} from '@/lib/finance/sandbox-contract';
import {operationErrorResponse} from '@/lib/operation-error';

async function readBoundedJson(req:Request,maxBytes:number):Promise<unknown>{
  const reader=req.body?.getReader();
  if(!reader) throw new FinanceInputError('invalid_body',400,'İstek boş.');
  const parts:Uint8Array[]=[];let total=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;
    total+=value.byteLength;
    if(total>maxBytes) throw new FinanceInputError('request_too_large',413,'Test isteği çok büyük.');
    parts.push(value);
  }}finally{try{await reader.cancel();}catch{}}
  const combined=new Uint8Array(total);let offset=0;
  for(const part of parts){combined.set(part,offset);offset+=part.length;}
  try{return JSON.parse(new TextDecoder().decode(combined));}
  catch{throw new FinanceInputError('invalid_body',400,'Geçersiz JSON.');}
}

export async function POST(req:Request){
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  try{
    assertSandboxEnabled(process.env);
    assertSameOrigin(req.url,req.headers.get('origin'));
    if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      throw new FinanceInputError('invalid_content_type',415,'JSON isteği gerekli.');
    // Stream bounded by actual bytes; forged Content-Length cannot bypass the limit.
    const result=await authorizeAndReleaseFakePayment(parseFakeAuthorization(await readBoundedJson(req,2048)));
    return NextResponse.json(result,{status:result.reconciliationRequired?202:200,headers});
  }catch(error){
    if(error instanceof FinanceInputError)
      return NextResponse.json({error:error.message,code:error.code},{status:error.statusCode,headers});
    const response=operationErrorResponse(error);
    return NextResponse.json(response.body,{status:response.status,headers});
  }
}
