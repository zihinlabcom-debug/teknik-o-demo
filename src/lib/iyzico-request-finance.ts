import 'server-only';
import {OperationError} from './operation-error';
import {isSandboxPendingRequestMode} from '../../apps/customer/src/lib/finance/sandbox-contract';
import {isIyzicoSandboxPendingRequestMode,assertIyzicoStage12Enabled,type IyzicoRuntimeStatus} from '../../apps/customer/src/lib/finance/iyzico/iyzico-stage12-contract';

type Rpc=(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>;
type Price={currency:'TRY';subtotal:number;serviceFee:number;totalAmount:number;breakdown:unknown};
export type IyzicoPendingRequest={
  id:string;quoteId:string;totalAmount:number;currency:'TRY';paymentIntentId:string;
  paymentStatus:string;paymentProvider:'iyzico';distributionStarted:false;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Null preserves the existing path outside the explicitly enabled test scope.
 * The database gate is authoritative; an environment flag alone grants no access.
 */
export async function createIyzicoPendingRequest({rpc,accountId,isTest,price,args,fingerprint,env=process.env}:{
  rpc:Rpc;accountId:string;isTest:boolean;price:Price;args:Record<string,unknown>;
  fingerprint:string;env?:Record<string,string|undefined>;
}):Promise<IyzicoPendingRequest|null>{
  if(!isTest)return null;
  try{
    if(!isIyzicoSandboxPendingRequestMode(env))return null;
    if(isSandboxPendingRequestMode(env))
      throw new OperationError('finance_provider_conflict',503,'Finans test sağlayıcısı yapılandırması geçersiz.');
  }catch(error){
    if(error instanceof OperationError)throw error;
    throw new OperationError('finance_environment_unavailable',503,'Finans test ortamı doğrulanamadı.');
  }
  const gate=await rpc('finance_gate_required_for_customer',{p_customer_id:accountId});
  if(gate.error||typeof gate.data!=='boolean')
    throw new OperationError('finance_gate_unavailable',503,'Finans geçidi doğrulanamadı.');
  if(!gate.data)return null;
  const runtime=await rpc('finance_iyzico_integration_status',{});
  try{
    if(runtime.error||!runtime.data||typeof runtime.data!=='object')throw new Error();
    assertIyzicoStage12Enabled(env,runtime.data as IyzicoRuntimeStatus);
  }catch{
    throw new OperationError('finance_environment_unavailable',503,'Finans test ortamı doğrulanamadı.');
  }
  if(!/^[a-f0-9]{64}$/.test(fingerprint))
    throw new OperationError('invalid_conversation',400,'Geçersiz hizmet değerlendirmesi.');
  const {data,error}=await rpc('create_iyzico_payment_pending_service_request_v3',{
    ...args,p_customer_id:accountId,p_requested_service_mode:'immediate',p_requested_service_date:null,
    p_currency:price.currency,p_subtotal:price.subtotal,p_service_fee:price.serviceFee,
    p_total_amount:price.totalAmount,p_breakdown:price.breakdown,
    // Same server-derived key as the existing customer application bridge.
    p_payment_idempotency_key:'pending:'+fingerprint,
  });
  if(error)throw new OperationError('finance_request_failed',503,'Ödeme bekleyen talep doğrulanamadı. İşlemi tekrarlamadan durumunu kontrol edin.');
  const result=data as Partial<IyzicoPendingRequest>|null;
  if(!result||!uuid.test(result.id??'')||!uuid.test(result.quoteId??'')||
      !uuid.test(result.paymentIntentId??'')||result.currency!=='TRY'||
      result.totalAmount!==price.totalAmount||result.paymentProvider!=='iyzico'||
      result.distributionStarted!==false||typeof result.paymentStatus!=='string'||!result.paymentStatus)
    throw new OperationError('finance_response_unverified',503,'Ödeme bekleyen talep yanıtı doğrulanamadı. İşlemi tekrarlamadan durumunu kontrol edin.');
  return result as IyzicoPendingRequest;
}
