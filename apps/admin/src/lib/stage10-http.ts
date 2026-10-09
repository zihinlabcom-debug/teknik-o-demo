import {OperationError} from '../../../../src/lib/operation-error';

export const STAGE10_JSON_MAX_BYTES=64*1024;

function boundedBody(request:Request,maxBytes:number){
  const declared=request.headers.get('content-length');
  if(declared!==null){const parsed=Number(declared);if(!Number.isSafeInteger(parsed)||parsed<0)throw new OperationError('invalid_content_length',400,'Geçersiz istek boyutu.');if(parsed>maxBytes)throw new OperationError('request_too_large',413,'İstek boyutu izin verilen sınırı aşıyor.');}
  if(!request.body)throw new OperationError('invalid_body',400,'İstek gövdesi gerekli.');
  let total=0;
  return request.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){total+=chunk.byteLength;if(total>maxBytes)throw new OperationError('request_too_large',413,'İstek boyutu izin verilen sınırı aşıyor.');controller.enqueue(chunk);}}));
}

export async function parseStage10Json(request:Request,maxBytes=STAGE10_JSON_MAX_BYTES){
  const contentType=request.headers.get('content-type')??'';
  if(!/^application\/json(?:\s*;|$)/i.test(contentType))throw new OperationError('invalid_content_type',415,'JSON istek gövdesi gerekli.');
  const body=boundedBody(request,maxBytes);
  try{const value=JSON.parse(await new Response(body).text());if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value as Record<string,unknown>;}
  catch(error){if(error instanceof OperationError)throw error;throw new OperationError('invalid_body',400,'Geçersiz JSON gövdesi.');}
}
