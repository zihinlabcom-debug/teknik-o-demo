import 'server-only';
import {adminSupabase} from '@/lib/account-supabase';
import {canonicalTryAmount} from './iyzico-money';
import {
  assertIyzicoStage12Enabled,type IyzicoRuntimeStatus,type IyzicoStage12Scope,
} from './iyzico-stage12-contract';
import {
  SupabaseIyzicoOperationStore,type IyzicoOperationScope,type IyzicoRpcClient,
} from './supabase-iyzico-operation-store';

type RpcResult=Readonly<{data:unknown;error:Readonly<{message?:string}>|null}>;

function object(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new Error('iyzico_stage12_invalid_database_response');
  return value as Record<string,unknown>;
}

function rpcClient():IyzicoRpcClient{
  return adminSupabase() as unknown as IyzicoRpcClient;
}

async function rpc(db:IyzicoRpcClient,name:string,args:Record<string,unknown>):Promise<unknown>{
  const {data,error}=await db.rpc(name,args) as RpcResult;
  if(error)throw new Error(`iyzico_stage12_${name}_failed`);
  return data;
}

export class IyzicoStage12Repository {
  constructor(private readonly db:IyzicoRpcClient=rpcClient()){}

  async runtime():Promise<IyzicoRuntimeStatus>{
    const raw=object(await rpc(this.db,'finance_iyzico_integration_status',{}));
    if(typeof raw.enabled!=='boolean'||typeof raw.gateMode!=='string'||
        typeof raw.provider!=='string'||typeof raw.environment!=='string')
      throw new Error('iyzico_stage12_invalid_runtime_status');
    return Object.freeze({enabled:raw.enabled,gateMode:raw.gateMode,
      provider:raw.provider,environment:raw.environment});
  }

  async scope(intentId:string,customerId:string):Promise<IyzicoStage12Scope>{
    const raw=object(await rpc(this.db,'finance_iyzico_intent_context',{
      p_intent_id:intentId,p_customer_id:customerId,
    }));
    for(const field of ['intentId','serviceRequestId','customerId','quoteId','basketId','intentStatus'])
      if(typeof raw[field]!=='string')throw new Error('iyzico_stage12_invalid_intent_context');
    if(raw.currency!=='TRY'||typeof raw.amount!=='string')
      throw new Error('iyzico_stage12_invalid_intent_context');
    return Object.freeze({
      intentId:raw.intentId as string,serviceRequestId:raw.serviceRequestId as string,
      customerId:raw.customerId as string,quoteId:raw.quoteId as string,
      amount:canonicalTryAmount(raw.amount),currency:'TRY',basketId:raw.basketId as string,
      intentStatus:raw.intentStatus as string,
      ...(typeof raw.paymentId==='string'?{paymentId:raw.paymentId}:{}),
    });
  }

  store(scope:IyzicoStage12Scope,jobId?:string){
    const operationScope:IyzicoOperationScope={
      intentId:scope.intentId,serviceRequestId:scope.serviceRequestId,
      customerId:scope.customerId,...(jobId?{jobId}:{}),
    };
    return new SupabaseIyzicoOperationStore(this.db,operationScope);
  }

  async apply(intentId:string,operationId:string):Promise<unknown>{
    return rpc(this.db,'finance_apply_iyzico_operation',{
      p_intent_id:intentId,p_operation_id:operationId,
    });
  }

  async release(serviceRequestId:string,operationId:string):Promise<unknown>{
    return rpc(this.db,'finance_release_iyzico_sandbox_request',{
      p_request_id:serviceRequestId,p_operation_id:operationId,
    });
  }

  async issue(scope:IyzicoStage12Scope,code:string):Promise<void>{
    await rpc(this.db,'finance_iyzico_mark_manual_review',{
      p_intent_id:scope.intentId,p_code:code,p_detail:{source:'iyzico_stage12_server'},
    });
  }

  async assertEnabled(env:Record<string,string|undefined>):Promise<void>{
    assertIyzicoStage12Enabled(env,await this.runtime());
  }
}
