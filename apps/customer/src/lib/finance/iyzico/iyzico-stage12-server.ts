import 'server-only';
import type {FinanceProviderAdapter,FinanceProviderResult} from '../provider-contract';
import {IyzicoOperationManager,type IyzicoManagedResult} from './iyzico-operation-manager';
import {
  stage12IyzicoOperationKeys,type IyzicoStage12Scope,
} from './iyzico-stage12-contract';
import {canonicalTryAmount,type TryAmount} from './iyzico-money';
import type {IyzicoOperationStore} from './iyzico-operation-store';
import type {
  IyzicoAddress,IyzicoAuthorizeInput,IyzicoBuyer,IyzicoCancelInput,IyzicoCaptureInput,
  IyzicoPaymentCard,IyzicoRefundInput,IyzicoRetrieveInput,
} from './iyzico-types';

type Adapter=FinanceProviderAdapter<
  IyzicoAuthorizeInput,IyzicoCaptureInput,IyzicoCancelInput,IyzicoRefundInput,IyzicoRetrieveInput
>;

export type IyzicoStage12Outcome=Readonly<{
  result:FinanceProviderResult;
  coreApplied:boolean;
  distributionStarted:boolean;
  reconciliationRequired:boolean;
}>;

export type Stage12AuthorizePayload=Readonly<{
  paymentCard:IyzicoPaymentCard;
  buyer:IyzicoBuyer;
  shippingAddress:IyzicoAddress;
  billingAddress:IyzicoAddress;
  basketItems:IyzicoAuthorizeInput['basketItems'];
}>;

export type Stage12CapturePayload=Readonly<{jobId:string;ip:string}>;
export type Stage12CancelPayload=Readonly<{
  ip:string;reason?:IyzicoCancelInput['reason'];description?:string;
}>;
export type Stage12RefundPayload=Readonly<{
  refundKey:string;amount:TryAmount;paymentTransactionId:string;ip:string;
  reason?:IyzicoRefundInput['reason'];description?:string;
}>;

export interface IyzicoStage12RepositoryPort {
  finalizationPartContext?(partId:string,customerId:string):Promise<{amount:string;jobId:string;intentId:string;key:string}>;
  cancellationContext?(finalizationId:string,customerId:string):Promise<{amount:string;jobId:string;intentId:string}>;
  assertEnabled(env:Record<string,string|undefined>):Promise<void>;
  scope(intentId:string,customerId:string):Promise<IyzicoStage12Scope>;
  store(scope:IyzicoStage12Scope,jobId?:string):IyzicoOperationStore;
  apply(intentId:string,operationId:string):Promise<unknown>;
  release(serviceRequestId:string,operationId:string):Promise<unknown>;
  issue(scope:IyzicoStage12Scope,code:string):Promise<void>;
}

function resultCode(operation:string,result:FinanceProviderResult):string{
  const suffix=result.outcome==='unknown'?'unknown':'persistence_failed';
  return `iyzico_${operation}_${suffix}`;
}

export class IyzicoStage12Server {
  constructor(
    private readonly adapter:Adapter,
    private readonly repository:IyzicoStage12RepositoryPort,
    private readonly env:Record<string,string|undefined>=process.env,
  ){}

  private async context(intentId:string,customerId:string):Promise<IyzicoStage12Scope>{
    await this.repository.assertEnabled(this.env);
    const scope=await this.repository.scope(intentId,customerId);
    if(scope.intentId!==intentId||scope.customerId!==customerId)
      throw new Error('iyzico_stage12_intent_scope_mismatch');
    return scope;
  }

  private async settle(
    scope:IyzicoStage12Scope,operation:string,managed:IyzicoManagedResult,
  ):Promise<IyzicoStage12Outcome>{
    if(managed.result.outcome==='unknown'){
      await this.repository.issue(scope,resultCode(operation,managed.result));
      return Object.freeze({result:managed.result,coreApplied:false,
        distributionStarted:false,reconciliationRequired:true});
    }
    try{
      await this.repository.apply(scope.intentId,managed.result.operationId);
    }catch{
      await this.repository.issue(scope,resultCode(operation,managed.result));
      return Object.freeze({result:managed.result,coreApplied:false,
        distributionStarted:false,reconciliationRequired:true});
    }
    if(operation!=='authorize'||managed.result.outcome!=='succeeded'||scope.purpose==='additional')
      return Object.freeze({result:managed.result,coreApplied:true,
        distributionStarted:false,reconciliationRequired:false});
    try{
      const released=await this.repository.release(
        scope.serviceRequestId,managed.result.operationId,
      ) as {distributionStarted?:unknown};
      if(released?.distributionStarted!==true)throw new Error('distribution_not_confirmed');
      return Object.freeze({result:managed.result,coreApplied:true,
        distributionStarted:true,reconciliationRequired:false});
    }catch{
      await this.repository.issue(scope,'iyzico_distribution_release_failed');
      return Object.freeze({result:managed.result,coreApplied:true,
        distributionStarted:false,reconciliationRequired:true});
    }
  }

  async intentScope(intentId:string,customerId:string):Promise<IyzicoStage12Scope>{
    return this.context(intentId,customerId);
  }

  async authorize(
    intentId:string,customerId:string,payload:Stage12AuthorizePayload,
  ):Promise<IyzicoStage12Outcome>{
    const scope=await this.context(intentId,customerId);
    const keys=stage12IyzicoOperationKeys(scope,'authorize','initial');
    const manager=new IyzicoOperationManager(this.adapter,this.repository.store(scope));
    const managed=await manager.authorize({...keys,amount:scope.amount,currency:scope.currency,
      basketId:scope.basketId,...payload});
    return this.settle(scope,'authorize',managed);
  }

  async capture(
    intentId:string,customerId:string,payload:Stage12CapturePayload,
  ):Promise<IyzicoStage12Outcome>{
    const scope=await this.context(intentId,customerId);
    if(!scope.paymentId)throw new Error('iyzico_stage12_payment_reference_missing');
    const keys=stage12IyzicoOperationKeys(scope,'capture',payload.jobId);
    const manager=new IyzicoOperationManager(
      this.adapter,this.repository.store(scope,payload.jobId),
    );
    const managed=await manager.capture({...keys,amount:scope.amount,currency:scope.currency,
      paymentId:scope.paymentId,basketId:scope.basketId,ip:payload.ip});
    return this.settle(scope,'capture',managed);
  }

  async captureCancellation(intentId:string,customerId:string,finalizationId:string,ip:string):Promise<IyzicoStage12Outcome>{
    const scope=await this.context(intentId,customerId);
    if(!scope.paymentId||!this.repository.cancellationContext)throw new Error('t100_cancellation_context_missing');
    const context=await this.repository.cancellationContext(finalizationId,customerId);
    const amount=canonicalTryAmount(context.amount);
    if(context.intentId!==intentId||Number(amount)!==Math.min(100,Number(scope.amount))||!context.jobId)
      throw new Error('t100_cancellation_context_mismatch');
    const keys=stage12IyzicoOperationKeys(scope,'capture',finalizationId);
    const manager=new IyzicoOperationManager(this.adapter,this.repository.store(scope,context.jobId));
    const managed=await manager.capture({...keys,amount,authorizationAmount:scope.amount,currency:scope.currency,paymentId:scope.paymentId,
      basketId:scope.basketId,ip});
    return this.settle(scope,'capture',managed);
  }

  async capturePart(intentId:string,customerId:string,partId:string,ip:string):Promise<IyzicoStage12Outcome>{
    const scope=await this.context(intentId,customerId);
    if(!scope.paymentId||!this.repository.finalizationPartContext)throw new Error('t103_part_context_missing');
    const part=await this.repository.finalizationPartContext(partId,customerId);
    if(part.intentId!==intentId||part.key!==partId)throw new Error('t103_part_context_mismatch');
    const amount=canonicalTryAmount(part.amount),keys=stage12IyzicoOperationKeys(scope,'capture',partId);
    const manager=new IyzicoOperationManager(this.adapter,this.repository.store(scope,part.jobId));
    const managed=await manager.capture({...keys,amount,authorizationAmount:scope.amount,currency:scope.currency,paymentId:scope.paymentId,basketId:scope.basketId,ip});
    return this.settle(scope,'capture',managed);
  }

  async cancel(
    intentId:string,customerId:string,payload:Stage12CancelPayload,
  ):Promise<IyzicoStage12Outcome>{
    const scope=await this.context(intentId,customerId);
    if(!scope.paymentId)throw new Error('iyzico_stage12_payment_reference_missing');
    const keys=stage12IyzicoOperationKeys(scope,'cancel','terminal');
    const manager=new IyzicoOperationManager(this.adapter,this.repository.store(scope));
    const managed=await manager.cancel({...keys,amount:scope.amount,currency:scope.currency,
      paymentId:scope.paymentId,...payload});
    return this.settle(scope,'cancel',managed);
  }

  async refund(
    intentId:string,customerId:string,payload:Stage12RefundPayload,
  ):Promise<IyzicoStage12Outcome>{
    const scope=await this.context(intentId,customerId);
    if(!scope.paymentId)throw new Error('iyzico_stage12_payment_reference_missing');
    const keys=stage12IyzicoOperationKeys(scope,'refund',payload.refundKey);
    const manager=new IyzicoOperationManager(this.adapter,this.repository.store(scope));
    const managed=await manager.refund({...keys,amount:payload.amount,currency:scope.currency,
      paymentId:scope.paymentId,paymentTransactionId:payload.paymentTransactionId,
      ip:payload.ip,reason:payload.reason,description:payload.description});
    return this.settle(scope,'refund',managed);
  }

  async reconcileAuthorization(intentId:string,customerId:string):Promise<IyzicoStage12Outcome>{
    const scope=await this.context(intentId,customerId);
    const operationId=stage12IyzicoOperationKeys(scope,'authorize','initial').operationId;
    return this.reconcile(intentId,customerId,operationId);
  }

  // Read-only provider evidence retrieval; no settlement or payment replay.
  async reconcileEvidence(
    intentId:string,customerId:string,originalOperationId:string,
  ):Promise<IyzicoManagedResult>{
    const scope=await this.context(intentId,customerId);
    const store=this.repository.store(scope);
    const original=await store.get(originalOperationId);
    if(!original||original.state!=='unknown'||
        (original.operation!=='authorize'&&original.operation!=='capture'))
      throw new Error('iyzico_stage12_operation_not_reconcilable');
    const partial=original.operation==='capture'&&original.money.amount!==scope.amount;
    const keys=stage12IyzicoOperationKeys(scope,'retrieve',partial?originalOperationId+':price-v2':originalOperationId);
    const manager=new IyzicoOperationManager(this.adapter,store);
    const managed=await manager.reconcile(originalOperationId,{
      ...keys,amount:original.money.amount,currency:original.money.currency,...(partial?{authorizationAmount:scope.amount}:{}),
      basketId:original.basketId??scope.basketId,
      ...(original.paymentId?{paymentId:original.paymentId}:
        {paymentConversationId:original.conversationId}),
    });
    return managed;
  }
  async reconcile(intentId:string,customerId:string,originalOperationId:string):Promise<IyzicoStage12Outcome>{
    const scope=await this.context(intentId,customerId);
    const managed=await this.reconcileEvidence(intentId,customerId,originalOperationId);
    return this.settle(scope,managed.result.operation,managed);
  }
}
