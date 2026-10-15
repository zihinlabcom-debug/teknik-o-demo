import {FinanceInputError,assertSameOrigin,sandboxUUID} from '../sandbox-contract';
import type {IyzicoPaymentCard} from './iyzico-types';

const allowedCardKeys=new Set(['intentId','cardHolderName','cardNumber','expireMonth','expireYear','cvc']);

function object(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new FinanceInputError('invalid_body',400,'Geçersiz ödeme isteği.');
  return value as Record<string,unknown>;
}
function text(value:unknown,max:number):string{
  if(typeof value!=='string'||value.trim().length===0||value.length>max)
    throw new FinanceInputError('invalid_body',400,'Geçersiz ödeme isteği.');
  return value.trim();
}
export function parseIyzicoIntentBody(value:unknown):Readonly<{intentId:string}>{
  const body=object(value);
  if(Object.keys(body).length!==1||typeof body.intentId!=='string'||!sandboxUUID.test(body.intentId))
    throw new FinanceInputError('invalid_body',400,'Geçersiz ödeme isteği.');
  return {intentId:body.intentId};
}
export function parseIyzicoAuthorizeBody(value:unknown):Readonly<{
  intentId:string;paymentCard:IyzicoPaymentCard;
}>{
  const body=object(value),keys=Object.keys(body);
  if(keys.length!==6||keys.some(key=>!allowedCardKeys.has(key))||
      typeof body.intentId!=='string'||!sandboxUUID.test(body.intentId))
    throw new FinanceInputError('invalid_body',400,'Geçersiz ödeme isteği.');
  const cardNumber=text(body.cardNumber,32).replace(/[ -]/g,'');
  const expireMonth=text(body.expireMonth,2),expireYear=text(body.expireYear,4),cvc=text(body.cvc,4);
  if(!/^\d{12,19}$/.test(cardNumber)||!/^(0[1-9]|1[0-2])$/.test(expireMonth)||
      !/^\d{4}$/.test(expireYear)||!/^\d{3,4}$/.test(cvc))
    throw new FinanceInputError('invalid_card',400,'Sandbox kart bilgileri geçersiz.');
  return {intentId:body.intentId,paymentCard:{cardHolderName:text(body.cardHolderName,200),
    cardNumber,expireMonth,expireYear,cvc,registerCard:'0'}};
}
export function assertIyzicoRequest(request:Request):void{
  assertSameOrigin(request.url,request.headers.get('origin'));
  if(request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='application/json')
    throw new FinanceInputError('invalid_content_type',415,'JSON isteği gerekli.');
}
export async function readIyzicoJson(request:Request,maxBytes=4096):Promise<unknown>{
  const declared=request.headers.get('content-length');
  if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maxBytes))
    throw new FinanceInputError('body_too_large',413,'Ödeme isteği güvenlik sınırını aştı.');
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>maxBytes)
    throw new FinanceInputError('body_too_large',413,'Ödeme isteği güvenlik sınırını aştı.');
  try{return JSON.parse(raw) as unknown;}
  catch{throw new FinanceInputError('invalid_body',400,'Geçersiz ödeme isteği.');}
}
export function requestIp(request:Request):string{
  const candidate=(request.headers.get('x-forwarded-for')?.split(',')[0]??
    request.headers.get('x-real-ip')??'127.0.0.1').trim();
  return /^[0-9a-fA-F:.]{2,64}$/.test(candidate)?candidate:'127.0.0.1';
}
