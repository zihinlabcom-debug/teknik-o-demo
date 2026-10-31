import 'server-only';
import {safeAuthOrigin} from './email-auth-policy';
import type {T100State} from './t100-contract';
export type T100Db={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:{message?:string;code?:string}|null}>};
export class T100Error extends Error{constructor(public status:number,public code:string,message:string){super(message);}}
export async function t100Rpc(db:T100Db,name:string,args:Record<string,unknown>):Promise<unknown>{
 const {data,error}=await db.rpc(name,args);
 if(error){
  const m=error.message??'';
  if(/forbidden|owner mismatch/i.test(m))throw new T100Error(403,'forbidden','Bu hizmet işlemi için yetkiniz yok.');
  if(/not found|missing/i.test(m))throw new T100Error(404,'not_found','Hizmet kaydı bulunamadı.');
  if(/T10[023]|T111|conflict|reserved|not available|verified|authorization|review/i.test(m))
   throw new T100Error(409,'state_changed','İşlem koşulları değişti veya inceleme gerekiyor. Güncel durumu kontrol edin.');
  throw new T100Error(503,'unavailable','Hizmet işlemi şu anda tamamlanamıyor.');
 }
 return data;
}
export async function t100State(db:T100Db,requestId:string,actorId:string):Promise<T100State>{
 const data=await t100Rpc(db,'t100_request_state',{p_request_id:requestId,p_actor_id:actorId});
 if(!data||typeof data!=='object'||(data as T100State).requestId!==requestId)throw new T100Error(503,'invalid_state','Hizmet durumu doğrulanamadı.');
 return data as T100State;
}
export function assertT100Origin(request:Request,configuredOrigin?:string){
 const origin=request.headers.get('origin');
 let expected:string;
 try{expected=configuredOrigin===undefined?new URL(request.url).origin:safeAuthOrigin(configuredOrigin);}
 catch{throw new T100Error(503,'invalid_origin_configuration','Güvenli istek kaynağı yapılandırılamadı.');}
 // Only server-controlled configuration can override Next's internal URL; never Host/Forwarded headers.
 if(!origin||origin!==expected||
  request.headers.get('sec-fetch-site')&&request.headers.get('sec-fetch-site')!=='same-origin')
 throw new T100Error(403,'invalid_origin','Geçersiz istek kaynağı.');
}
export function t100PublicError(error:unknown){
 if(error instanceof T100Error)return Response.json({error:error.message,code:error.code},{status:error.status,headers:{'Cache-Control':'no-store'}});
 return null;
}
