import {createHmac} from 'node:crypto';
import {IyzicoError} from './iyzico-errors';
import {amountForIyzicoSignature} from './iyzico-money';
import {constantTimeHexEqual} from './iyzico-signature';

export type IyzicoSignedOperation='authorize'|'capture'|'refund'|'retrieve';

const fields:Record<IyzicoSignedOperation,readonly string[]>={
  authorize:['paymentId','currency','basketId','conversationId','paidPrice','price'],
  capture:['paymentId','currency','basketId','conversationId','paidPrice','price'],
  retrieve:['paymentId','currency','basketId','conversationId','paidPrice','price'],
  refund:['paymentId','price','currency','conversationId'],
};
const amountFields=new Set(['price','paidPrice']);

export function responseSignaturePayload(operation:IyzicoSignedOperation,response:Record<string,unknown>):string{
  return fields[operation].map(field=>{
    const value=response[field];
    if(value===undefined||value===null||value==='')
      throw new IyzicoError('missing_signature_field','validation',false,`İyzico yanıtında ${field} eksik.`);
    return amountFields.has(field)?amountForIyzicoSignature(value):String(value);
  }).join(':');
}

export function computeIyzicoResponseSignature(
  operation:IyzicoSignedOperation,response:Record<string,unknown>,secretKey:string,
):string{
  return createHmac('sha256',secretKey).update(responseSignaturePayload(operation,response),'utf8').digest('hex');
}

export function verifyIyzicoResponseSignature(
  operation:IyzicoSignedOperation,response:Record<string,unknown>,secretKey:string,
):boolean{
  const provided=typeof response.signature==='string'?response.signature:'';
  if(!provided)return false;
  return constantTimeHexEqual(provided,computeIyzicoResponseSignature(operation,response,secretKey));
}
