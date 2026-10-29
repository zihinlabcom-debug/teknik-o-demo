import type {IyzicoSandboxConfig} from './iyzico-config-contract';
import {IYZICO_SANDBOX_ORIGIN} from './iyzico-config-contract';
import {IyzicoError} from './iyzico-errors';
import {createIyzicoAuthorization,createIyzicoRandomKey} from './iyzico-signature';

export const IYZICO_ENDPOINTS=Object.freeze({
  authorize:'/payment/preauth',capture:'/payment/postauth',cancel:'/payment/cancel',
  refund:'/payment/refund',retrieve:'/payment/detail',
});
const allowedPaths:ReadonlySet<string>=new Set(Object.values(IYZICO_ENDPOINTS));

export type IyzicoTransportResponse=Readonly<{
  httpStatus:number;
  body:Record<string,unknown>;
  trust:'pinned_https_sandbox';
}>;

export type IyzicoFetch=typeof fetch;

function responseTooLarge():IyzicoError{
  return new IyzicoError('iyzico_response_too_large','unknown',false,
    'İyzico yanıtı güvenlik sınırını aştı.');
}

async function readBoundedResponseBody(
  response:Response,maxResponseBytes:number,signal:AbortSignal,
):Promise<string>{
  if(!response.body)return '';
  const reader=response.body.getReader();
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let totalBytes=0;
  let raw='';
  let rejectOnAbort:((reason?:unknown)=>void)|undefined;
  const aborted=new Promise<never>((_resolve,reject)=>{rejectOnAbort=reject;});
  const onAbort=()=>rejectOnAbort?.(new DOMException('Aborted','AbortError'));
  if(signal.aborted)onAbort();
  else signal.addEventListener('abort',onAbort,{once:true});

  try{
    while(true){
      const {done,value}=await Promise.race([reader.read(),aborted]);
      if(done)break;
      totalBytes+=value.byteLength;
      if(totalBytes>maxResponseBytes)throw responseTooLarge();
      raw+=decoder.decode(value,{stream:true});
    }
    raw+=decoder.decode();
    return raw;
  }catch(error){
    try{await reader.cancel();}catch{/* Preserve the original payment outcome error. */}
    throw error;
  }finally{
    signal.removeEventListener('abort',onAbort);
    reader.releaseLock();
  }
}

export class IyzicoHttpTransport{
  constructor(
    private readonly config:IyzicoSandboxConfig,
    private readonly fetchImpl:IyzicoFetch=fetch,
    private readonly randomKeyFactory:()=>string=createIyzicoRandomKey,
  ){}

  async post(path:string,payload:Record<string,unknown>):Promise<IyzicoTransportResponse>{
    // Recheck before signing/fetching, including transports created before the flag changed.
    if(process.env.T100_SIMULATION_ONLY==='true')
      throw new IyzicoError('iyzico_simulation_only','configuration',false,'Simülasyonda sağlayıcı erişimi kapalı.');
    if(this.config.baseUrl!==IYZICO_SANDBOX_ORIGIN||!allowedPaths.has(path))
      throw new IyzicoError('sandbox_endpoint_denied','configuration',false,'İyzico Sandbox endpointi reddedildi.');
    const serializedRequest=JSON.stringify(payload);
    const randomKey=this.randomKeyFactory();
    const signed=createIyzicoAuthorization(this.config,randomKey,path,serializedRequest);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),this.config.timeoutMs);
    try{
      const response=await this.fetchImpl(`${this.config.baseUrl}${path}`,{
        method:'POST',signal:controller.signal,headers:{
          'content-type':'application/json','accept':'application/json',
          'authorization':signed.authorization,'x-iyzi-rnd':signed.randomKey,
        },body:serializedRequest,cache:'no-store',redirect:'error',
      });
      const declared=response.headers.get('content-length');
      if(declared&&/^\d+$/.test(declared)&&Number(declared)>this.config.maxResponseBytes)
        throw responseTooLarge();
      const raw=await readBoundedResponseBody(response,this.config.maxResponseBytes,controller.signal);
      let parsed:unknown;
      try{parsed=JSON.parse(raw);}catch(error){
        throw new IyzicoError('iyzico_invalid_json','unknown',false,'İyzico yanıtı doğrulanamadı.',{cause:error});
      }
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))
        throw new IyzicoError('iyzico_invalid_response','unknown',false,'İyzico yanıtı doğrulanamadı.');
      return Object.freeze({httpStatus:response.status,body:parsed as Record<string,unknown>,
        trust:'pinned_https_sandbox' as const});
    }catch(error){
      if(error instanceof IyzicoError)throw error;
      throw new IyzicoError('iyzico_transport_unknown','unknown',true,
        'İyzico isteğinin sonucu doğrulanamadı.',{cause:error});
    }finally{clearTimeout(timer);}
  }
}
