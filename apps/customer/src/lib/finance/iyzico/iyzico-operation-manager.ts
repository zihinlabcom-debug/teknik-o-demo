import type {
  FinanceProviderAdapter,FinanceProviderOperation,FinanceProviderResult,
} from '../provider-contract';
import {assertIyzicoOperationInput} from './iyzico-adapter';
import {describeIyzicoOperation,type IyzicoManagedInput,type IyzicoOperationDescriptor}
  from './iyzico-operation-fingerprint';
import type {
  IyzicoOperationRecord,IyzicoOperationStore,IyzicoTerminalResult,
} from './iyzico-operation-store';
import type {
  IyzicoAuthorizeInput,IyzicoCancelInput,IyzicoCaptureInput,IyzicoRefundInput,IyzicoRetrieveInput,
} from './iyzico-types';

export type IyzicoNextAction='none'|'wait'|'reconcile'|'manual_review';
export type IyzicoManagedResult=Readonly<{
  result:FinanceProviderResult;
  replayed:boolean;
  source:'provider'|'cache'|'single_flight'|'reconciliation'|'guard';
  nextAction:IyzicoNextAction;
  automaticReplayAllowed:false;
}>;

type Adapter=FinanceProviderAdapter<
  IyzicoAuthorizeInput,IyzicoCaptureInput,IyzicoCancelInput,IyzicoRefundInput,IyzicoRetrieveInput
>;
type InFlight=Readonly<{fingerprint:string;promise:Promise<IyzicoManagedResult>}>;

function unknownResult(
  descriptor:IyzicoOperationDescriptor,errorCode:string,
):FinanceProviderResult{
  return {provider:'iyzico',operation:descriptor.operation,operationId:descriptor.operationId,
    conversationId:descriptor.conversationId,outcome:'unknown',
    money:Object.freeze({...descriptor.money}),signatureVerified:false,retryable:false,errorCode};
}

function actionFor(result:FinanceProviderResult):IyzicoNextAction{
  if(result.outcome!=='unknown')return 'none';
  if(result.operation==='authorize'||result.operation==='capture')return 'reconcile';
  return 'manual_review';
}

function managed(
  result:FinanceProviderResult,replayed:boolean,source:IyzicoManagedResult['source'],
  nextAction=actionFor(result),
):IyzicoManagedResult{
  return Object.freeze({result,replayed,source,nextAction,automaticReplayAllowed:false});
}

function recordResult(record:IyzicoOperationRecord,errorCode:string):FinanceProviderResult{
  return record.result??unknownResult(record,errorCode);
}

function conflictCode(reason:'operation_id'|'business_operation'|'conversation_id'):string{
  if(reason==='business_operation')return 'business_operation_already_claimed';
  if(reason==='conversation_id')return 'conversation_id_already_claimed';
  return 'idempotency_payload_mismatch';
}

export class IyzicoOperationManager {
  private readonly inFlight=new Map<string,InFlight>();

  constructor(private readonly adapter:Adapter,private readonly store:IyzicoOperationStore){}

  get durability(){return this.store.durability;}

  inspect(operationId:string){return this.store.get(operationId);}

  private call(operation:FinanceProviderOperation,input:IyzicoManagedInput):Promise<FinanceProviderResult>{
    switch(operation){
      case 'authorize':return this.adapter.authorize(input as IyzicoAuthorizeInput);
      case 'capture':return this.adapter.capture(input as IyzicoCaptureInput);
      case 'cancel':return this.adapter.cancel(input as IyzicoCancelInput);
      case 'refund':return this.adapter.refund(input as IyzicoRefundInput);
      case 'retrieve':return this.adapter.retrieve(input as IyzicoRetrieveInput);
    }
  }

  private async dispatch(
    descriptor:IyzicoOperationDescriptor,input:IyzicoManagedInput,claimToken:string,
  ):Promise<IyzicoManagedResult>{
    let result:FinanceProviderResult;
    try{result=await this.call(descriptor.operation,input);}
    catch{result=unknownResult(descriptor,'iyzico_unexpected_error');}
    try{
      const finalized=await this.store.finalize(descriptor.operationId,claimToken,result);
      return managed(recordResult(finalized,'operation_result_missing'),false,'provider');
    }catch{
      return managed(unknownResult(descriptor,'operation_persistence_failed'),false,'guard','manual_review');
    }
  }

  private async execute(
    operation:FinanceProviderOperation,input:IyzicoManagedInput,
  ):Promise<IyzicoManagedResult>{
    assertIyzicoOperationInput(operation,input);
    const descriptor=describeIyzicoOperation(operation,input);
    const local=this.inFlight.get(descriptor.operationId);
    if(local){
      if(local.fingerprint!==descriptor.fingerprint)
        return managed(unknownResult(descriptor,'idempotency_payload_mismatch'),true,'guard','manual_review');
      const completed=await local.promise;
      return managed(completed.result,true,'single_flight',completed.nextAction);
    }

    const claim=await this.store.claim(descriptor);
    if(claim.kind==='conflict')
      return managed(unknownResult(descriptor,conflictCode(claim.reason)),true,'guard','manual_review');
    if(claim.kind==='existing'){
      const current=this.inFlight.get(descriptor.operationId);
      if(current&&current.fingerprint===descriptor.fingerprint){
        const completed=await current.promise;
        return managed(completed.result,true,'single_flight',completed.nextAction);
      }
      if(claim.record.state==='in_flight')
        return managed(recordResult(claim.record,'operation_in_progress'),true,'guard','wait');
      return managed(recordResult(claim.record,'operation_result_missing'),true,'cache');
    }

    const promise=this.dispatch(descriptor,input,claim.claimToken);
    this.inFlight.set(descriptor.operationId,{fingerprint:descriptor.fingerprint,promise});
    try{return await promise;}
    finally{
      if(this.inFlight.get(descriptor.operationId)?.promise===promise)
        this.inFlight.delete(descriptor.operationId);
    }
  }

  authorize(input:IyzicoAuthorizeInput){return this.execute('authorize',input);}
  capture(input:IyzicoCaptureInput){return this.execute('capture',input);}
  cancel(input:IyzicoCancelInput){return this.execute('cancel',input);}
  refund(input:IyzicoRefundInput){return this.execute('refund',input);}
  retrieve(input:IyzicoRetrieveInput){return this.execute('retrieve',input);}

  /**
   * Explicit operator/recovery action after the caller has proved the original owner is gone.
   * This never replays the provider mutation; a durable implementation must add a stale lease check.
   */
  async recoverInterrupted(
    operationId:string,expectedRevision:number,
  ):Promise<IyzicoManagedResult>{
    const original=await this.store.get(operationId);
    if(!original)throw new Error('original_operation_not_found');
    if(this.inFlight.has(operationId))
      return managed(recordResult(original,'operation_in_progress'),true,'guard','wait');
    if(original.state!=='in_flight')
      return managed(recordResult(original,'operation_result_missing'),true,'cache');
    const interrupted=unknownResult(original,'interrupted_before_confirmation');
    try{
      const recovered=await this.store.markInterruptedUnknown(operationId,expectedRevision,interrupted);
      return managed(recordResult(recovered,'operation_result_missing'),false,'guard');
    }catch{
      const current=await this.store.get(operationId);
      if(current&&current.state==='in_flight')
        return managed(recordResult(current,'operation_in_progress'),true,'guard','wait');
      if(current&&current.state!=='in_flight')
        return managed(recordResult(current,'operation_result_missing'),true,'cache');
      return managed(interrupted,false,'guard','manual_review');
    }
  }

  async reconcile(
    originalOperationId:string,input:IyzicoRetrieveInput,
  ):Promise<IyzicoManagedResult>{
    assertIyzicoOperationInput('retrieve',input);
    const original=await this.store.get(originalOperationId);
    const retrieveDescriptor=describeIyzicoOperation('retrieve',input);
    if(!original)
      return managed(unknownResult(retrieveDescriptor,'original_operation_not_found'),false,'guard','manual_review');
    if(original.state==='in_flight')
      return managed(recordResult(original,'operation_in_progress'),true,'guard','wait');
    if(original.state!=='unknown')
      return managed(recordResult(original,'operation_result_missing'),true,'cache');
    if(input.operationId===originalOperationId)
      return managed(unknownResult(original,'reconciliation_operation_id_required'),false,'guard','manual_review');
    if(original.operation!=='authorize'&&original.operation!=='capture')
      return managed(recordResult(original,'reconciliation_not_supported'),true,'guard','manual_review');
    if(input.amount!==original.money.amount||input.currency!==original.money.currency||
        input.basketId!==original.basketId||
        (original.operation==='capture'&&input.paymentId!==original.paymentId)||
        (original.operation==='authorize'&&
          input.paymentConversationId!==original.conversationId))
      return managed(unknownResult(original,'reconciliation_input_mismatch'),false,'guard','manual_review');

    const retrieved=await this.retrieve(input);
    let resolution:IyzicoTerminalResult|undefined;
    const evidence=retrieved.result;
    if(evidence.outcome==='succeeded'&&evidence.signatureVerified&&
        ((original.operation==='authorize'&&evidence.providerPhase==='PRE_AUTH')||
         (original.operation==='capture'&&evidence.providerPhase==='POST_AUTH'))){
      resolution={...evidence,outcome:'succeeded',operation:original.operation,operationId:original.operationId,
        conversationId:original.conversationId,money:original.money};
    }else if(original.operation==='authorize'&&evidence.outcome==='declined'&&evidence.signatureVerified){
      resolution={...evidence,outcome:'declined',operation:original.operation,operationId:original.operationId,
        conversationId:original.conversationId,money:original.money};
    }
    if(!resolution){
      const incompatiblePhase=evidence.outcome==='succeeded'&&
        (evidence.providerPhase==='PRE_AUTH'||evidence.providerPhase==='POST_AUTH');
      return managed(unknownResult(original,incompatiblePhase?'reconciliation_phase_mismatch':
        evidence.errorCode??'reconciliation_unresolved'),false,'reconciliation',
        incompatiblePhase?'manual_review':'reconcile');
    }
    try{
      const resolved=await this.store.resolveUnknown(
        original.operationId,original.revision,input.operationId,resolution,
      );
      return managed(recordResult(resolved,'operation_result_missing'),false,'reconciliation');
    }catch{
      const current=await this.store.get(original.operationId);
      if(current&&(current.state==='succeeded'||current.state==='declined'))
        return managed(recordResult(current,'operation_result_missing'),true,'reconciliation');
      return managed(unknownResult(original,'reconciliation_persistence_failed'),false,
        'reconciliation','manual_review');
    }
  }
}
