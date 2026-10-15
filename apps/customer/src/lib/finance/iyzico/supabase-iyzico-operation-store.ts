import 'server-only';
import type {FinanceProviderResult} from '../provider-contract';
import type {IyzicoOperationDescriptor} from './iyzico-operation-fingerprint';
import type {
  IyzicoOperationClaim,IyzicoOperationRecord,IyzicoOperationStore,IyzicoTerminalResult,
} from './iyzico-operation-store';

type RpcError=Readonly<{message?:string}>;
export type IyzicoRpcClient=Readonly<{
  rpc(name:string,args:Record<string,unknown>):Promise<Readonly<{data:unknown;error:RpcError|null}>>;
}>;

export type IyzicoOperationScope=Readonly<{
  intentId:string;
  serviceRequestId:string;
  customerId:string;
  jobId?:string;
}>;

function object(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new Error('iyzico_operation_store_invalid_response');
  return value as Record<string,unknown>;
}

function record(value:unknown):IyzicoOperationRecord{
  const raw=object(value),money=object(raw.money);
  if(raw.provider!=='iyzico'||raw.environment!=='sandbox'||
      !['authorize','capture','cancel','refund','retrieve'].includes(String(raw.operation))||
      typeof raw.operationId!=='string'||typeof raw.businessOperationKey!=='string'||
      typeof raw.conversationId!=='string'||typeof raw.fingerprint!=='string'||
      !['in_flight','succeeded','declined','unknown'].includes(String(raw.state))||
      typeof raw.revision!=='number'||typeof raw.createdAt!=='string'||
      typeof raw.updatedAt!=='string'||typeof raw.leaseExpiresAt!=='string'||
      typeof money.amount!=='string'||money.currency!=='TRY')
    throw new Error('iyzico_operation_store_invalid_record');
  const result=raw.result===undefined?undefined:object(raw.result) as FinanceProviderResult;
  return Object.freeze({...raw,money:Object.freeze({...money}),
    ...(result?{result:Object.freeze({...result,
      money:Object.freeze({...object(result.money)})})}:{}),
  }) as IyzicoOperationRecord;
}

function assertIdentity(descriptor:IyzicoOperationDescriptor,result:FinanceProviderResult):void{
  if(result.provider!==descriptor.provider||result.operation!==descriptor.operation||
      result.operationId!==descriptor.operationId||
      result.conversationId!==descriptor.conversationId||
      result.money.amount!==descriptor.money.amount||
      result.money.currency!==descriptor.money.currency)
    throw new Error('operation_result_identity_mismatch');
}

export class SupabaseIyzicoOperationStore implements IyzicoOperationStore {
  readonly durability='durable' as const;
  constructor(private readonly db:IyzicoRpcClient,private readonly scope:IyzicoOperationScope){}

  private async call(name:string,args:Record<string,unknown>):Promise<unknown>{
    const {data,error}=await this.db.rpc(name,args);
    if(error)throw new Error(`iyzico_store_${name}_failed`);
    return data;
  }

  async claim(descriptor:IyzicoOperationDescriptor):Promise<IyzicoOperationClaim>{
    const value=object(await this.call('finance_iyzico_claim_operation',{
      p_intent_id:this.scope.intentId,
      p_service_request_id:this.scope.serviceRequestId,
      p_customer_id:this.scope.customerId,
      p_job_id:this.scope.jobId??null,
      p_operation:descriptor.operation,
      p_operation_id:descriptor.operationId,
      p_business_operation_key:descriptor.businessOperationKey,
      p_conversation_id:descriptor.conversationId,
      p_fingerprint:descriptor.fingerprint,
      p_amount:descriptor.money.amount,
      p_currency:descriptor.money.currency,
      p_basket_id:descriptor.basketId??null,
      p_payment_id:descriptor.paymentId??null,
      p_payment_transaction_id:descriptor.paymentTransactionId??null,
      p_payment_conversation_id:descriptor.paymentConversationId??null,
    }));
    const stored=record(value.record);
    if(value.kind==='claimed'&&typeof value.claimToken==='string')
      return {kind:'claimed',record:stored,claimToken:value.claimToken};
    if(value.kind==='existing')return {kind:'existing',record:stored};
    if(value.kind==='conflict'&&
        ['operation_id','business_operation','conversation_id'].includes(String(value.reason)))
      return {kind:'conflict',reason:value.reason as
        'operation_id'|'business_operation'|'conversation_id',record:stored};
    throw new Error('iyzico_operation_store_invalid_claim');
  }

  async get(operationId:string):Promise<IyzicoOperationRecord|undefined>{
    const value=await this.call('finance_iyzico_get_operation',{p_operation_id:operationId});
    return value===null?undefined:record(value);
  }

  async finalize(
    operationId:string,claimToken:string,result:FinanceProviderResult,
  ):Promise<IyzicoOperationRecord>{
    const existing=await this.get(operationId);
    if(!existing)throw new Error('operation_not_found');
    assertIdentity(existing,result);
    return record(await this.call('finance_iyzico_finalize_operation',{
      p_operation_id:operationId,p_claim_token:claimToken,p_outcome:result.outcome,
      p_payment_id:result.paymentId??null,
      p_payment_transaction_id:result.paymentTransactionId??null,
      p_host_reference:result.hostReference??null,
      p_provider_phase:result.providerPhase??null,
      p_signature_verified:result.signatureVerified,p_retryable:result.retryable,
      p_error_code:result.errorCode??null,
    }));
  }

  async markInterruptedUnknown(
    operationId:string,expectedRevision:number,result:FinanceProviderResult,
  ):Promise<IyzicoOperationRecord>{
    const existing=await this.get(operationId);
    if(!existing)throw new Error('operation_not_found');
    assertIdentity(existing,result);
    if(result.outcome!=='unknown')throw new Error('interrupted_operation_must_be_unknown');
    return record(await this.call('finance_iyzico_mark_interrupted_unknown',{
      p_operation_id:operationId,p_expected_revision:expectedRevision,
      p_error_code:result.errorCode??'interrupted_before_confirmation',
    }));
  }

  async resolveUnknown(
    operationId:string,expectedRevision:number,evidenceOperationId:string,
    result:IyzicoTerminalResult,
  ):Promise<IyzicoOperationRecord>{
    const existing=await this.get(operationId);
    if(!existing)throw new Error('operation_not_found');
    assertIdentity(existing,result);
    return record(await this.call('finance_iyzico_resolve_unknown',{
      p_operation_id:operationId,p_expected_revision:expectedRevision,
      p_evidence_operation_id:evidenceOperationId,p_outcome:result.outcome,
    }));
  }
}
