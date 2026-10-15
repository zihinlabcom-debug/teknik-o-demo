import {randomUUID} from 'node:crypto';
import type {FinanceProviderResult} from '../provider-contract';
import type {IyzicoOperationDescriptor} from './iyzico-operation-fingerprint';

export type IyzicoOperationState='in_flight'|'succeeded'|'declined'|'unknown';
export type IyzicoTerminalResult=FinanceProviderResult&Readonly<{outcome:'succeeded'|'declined'}>;

export type IyzicoOperationRecord=IyzicoOperationDescriptor&Readonly<{
  state:IyzicoOperationState;
  revision:number;
  createdAt:string;
  updatedAt:string;
  leaseExpiresAt:string;
  result?:FinanceProviderResult;
  resolutionEvidenceOperationId?:string;
}>;

export type IyzicoOperationClaim=
  |Readonly<{kind:'claimed';record:IyzicoOperationRecord;claimToken:string}>
  |Readonly<{kind:'existing';record:IyzicoOperationRecord}>
  |Readonly<{
    kind:'conflict';
    reason:'operation_id'|'business_operation'|'conversation_id';
    record:IyzicoOperationRecord;
  }>;

export interface IyzicoOperationStore {
  readonly durability:'process-local'|'durable';
  claim(descriptor:IyzicoOperationDescriptor):Promise<IyzicoOperationClaim>;
  get(operationId:string):Promise<IyzicoOperationRecord|undefined>;
  finalize(operationId:string,claimToken:string,result:FinanceProviderResult):Promise<IyzicoOperationRecord>;
  markInterruptedUnknown(
    operationId:string,expectedRevision:number,result:FinanceProviderResult,
  ):Promise<IyzicoOperationRecord>;
  resolveUnknown(
    operationId:string,expectedRevision:number,evidenceOperationId:string,result:IyzicoTerminalResult,
  ):Promise<IyzicoOperationRecord>;
}

type InternalRecord=IyzicoOperationRecord&Readonly<{claimToken:string}>;

function operationKey(
  descriptor:Pick<IyzicoOperationDescriptor,'provider'|'environment'|'operationId'>,
):string{
  return `${descriptor.provider}:${descriptor.environment}:${descriptor.operationId}`;
}

function businessKey(
  descriptor:Pick<IyzicoOperationDescriptor,'provider'|'environment'|'operation'|'businessOperationKey'>,
):string{
  return `${descriptor.provider}:${descriptor.environment}:${descriptor.operation}:${descriptor.businessOperationKey}`;
}

function conversationKey(
  descriptor:Pick<IyzicoOperationDescriptor,'provider'|'environment'|'conversationId'>,
):string{
  return `${descriptor.provider}:${descriptor.environment}:${descriptor.conversationId}`;
}

function frozenResult(result:FinanceProviderResult):FinanceProviderResult{
  return Object.freeze({...result,money:Object.freeze({...result.money})});
}

function publicRecord(record:InternalRecord):IyzicoOperationRecord{
  const {claimToken:_claimToken,...safe}=record;
  return Object.freeze({...safe,money:Object.freeze({...safe.money}),
    ...(safe.result?{result:frozenResult(safe.result)}:{})});
}

function assertResultMatches(record:InternalRecord,result:FinanceProviderResult):void{
  if(result.provider!==record.provider||result.operation!==record.operation||
      result.operationId!==record.operationId||result.conversationId!==record.conversationId||
      result.money.currency!==record.money.currency||result.money.amount!==record.money.amount)
    throw new Error('operation_result_identity_mismatch');
}

function isTerminal(result:FinanceProviderResult):result is IyzicoTerminalResult{
  return result.outcome==='succeeded'||result.outcome==='declined';
}

function sameProviderEvidence(result:IyzicoTerminalResult,evidence:FinanceProviderResult):boolean{
  return result.outcome===evidence.outcome&&result.signatureVerified===true&&
    evidence.signatureVerified===true&&result.paymentId===evidence.paymentId&&
    result.paymentTransactionId===evidence.paymentTransactionId&&
    result.hostReference===evidence.hostReference&&result.providerPhase===evidence.providerPhase;
}

/**
 * Process-local reference implementation for deterministic tests only.
 * It deliberately does not claim restart or multi-host durability.
 */
export class InMemoryIyzicoOperationStore implements IyzicoOperationStore {
  readonly durability='process-local' as const;
  private readonly records=new Map<string,InternalRecord>();
  private readonly businessOperations=new Map<string,string>();
  private readonly conversations=new Map<string,string>();

  constructor(
    private readonly now:()=>Date=()=>new Date(),
    private readonly token:()=>string=()=>randomUUID(),
    private readonly leaseDurationMs=300_000,
  ){}

  async claim(descriptor:IyzicoOperationDescriptor):Promise<IyzicoOperationClaim>{
    const recordKey=operationKey(descriptor);
    const existing=this.records.get(recordKey);
    if(existing){
      const record=publicRecord(existing);
      return existing.operation!==descriptor.operation||
          existing.businessOperationKey!==descriptor.businessOperationKey||
          existing.fingerprint!==descriptor.fingerprint?
        {kind:'conflict',reason:'operation_id',record}:{kind:'existing',record};
    }

    const semanticOwnerKey=this.businessOperations.get(businessKey(descriptor));
    if(semanticOwnerKey){
      const owner=this.records.get(semanticOwnerKey);
      if(!owner)throw new Error('business_operation_index_corrupt');
      return {kind:'conflict',reason:'business_operation',record:publicRecord(owner)};
    }
    const conversationOwnerKey=this.conversations.get(conversationKey(descriptor));
    if(conversationOwnerKey){
      const owner=this.records.get(conversationOwnerKey);
      if(!owner)throw new Error('conversation_index_corrupt');
      return {kind:'conflict',reason:'conversation_id',record:publicRecord(owner)};
    }

    const now=this.now();
    const timestamp=now.toISOString();
    const leaseExpiresAt=new Date(now.getTime()+this.leaseDurationMs).toISOString();
    const claimToken=this.token();
    const internal=Object.freeze({...descriptor,money:Object.freeze({...descriptor.money}),
      state:'in_flight' as const,revision:1,createdAt:timestamp,updatedAt:timestamp,leaseExpiresAt,
      claimToken}) as InternalRecord;
    this.records.set(recordKey,internal);
    this.businessOperations.set(businessKey(descriptor),recordKey);
    this.conversations.set(conversationKey(descriptor),recordKey);
    return {kind:'claimed',record:publicRecord(internal),claimToken};
  }

  async get(operationId:string):Promise<IyzicoOperationRecord|undefined>{
    const record=this.records.get(`iyzico:sandbox:${operationId}`);
    return record?publicRecord(record):undefined;
  }

  async finalize(
    operationId:string,claimToken:string,result:FinanceProviderResult,
  ):Promise<IyzicoOperationRecord>{
    const recordKey=`iyzico:sandbox:${operationId}`;
    const current=this.records.get(recordKey);
    if(!current||current.claimToken!==claimToken||current.state!=='in_flight')
      throw new Error('operation_claim_lost');
    assertResultMatches(current,result);
    const updated=Object.freeze({...current,state:result.outcome,revision:current.revision+1,
      updatedAt:this.now().toISOString(),result:frozenResult(result)} as InternalRecord);
    this.records.set(recordKey,updated);
    return publicRecord(updated);
  }

  async markInterruptedUnknown(
    operationId:string,expectedRevision:number,result:FinanceProviderResult,
  ):Promise<IyzicoOperationRecord>{
    const recordKey=`iyzico:sandbox:${operationId}`;
    const current=this.records.get(recordKey);
    if(!current||current.state!=='in_flight'||current.revision!==expectedRevision)
      throw new Error('operation_interruption_conflict');
    if(this.now().getTime()<Date.parse(current.leaseExpiresAt))
      throw new Error('operation_lease_active');
    if(result.outcome!=='unknown')throw new Error('interrupted_operation_must_be_unknown');
    assertResultMatches(current,result);
    const updated=Object.freeze({...current,state:'unknown' as const,revision:current.revision+1,
      updatedAt:this.now().toISOString(),result:frozenResult(result)} as InternalRecord);
    this.records.set(recordKey,updated);
    return publicRecord(updated);
  }

  async resolveUnknown(
    operationId:string,expectedRevision:number,evidenceOperationId:string,result:IyzicoTerminalResult,
  ):Promise<IyzicoOperationRecord>{
    const recordKey=`iyzico:sandbox:${operationId}`;
    const current=this.records.get(recordKey);
    const evidence=this.records.get(`iyzico:sandbox:${evidenceOperationId}`);
    if(!current||current.state!=='unknown'||current.revision!==expectedRevision)
      throw new Error('operation_resolution_conflict');
    if(!evidence||evidence.operation!=='retrieve'||!evidence.result||
        !isTerminal(evidence.result)||evidence.state!==evidence.result.outcome)
      throw new Error('operation_resolution_evidence_missing');
    if(current.operation!=='authorize'&&current.operation!=='capture')
      throw new Error('operation_resolution_not_supported');
    assertResultMatches(current,result);
    if(!sameProviderEvidence(result,evidence.result)||
        evidence.money.amount!==current.money.amount||
        evidence.money.currency!==current.money.currency||
        evidence.basketId!==current.basketId)
      throw new Error('operation_resolution_evidence_mismatch');
    if(current.operation==='authorize'&&
        (evidence.paymentConversationId!==current.conversationId||
         result.outcome==='succeeded'&&result.providerPhase!=='PRE_AUTH'))
      throw new Error('authorization_resolution_evidence_mismatch');
    if(current.operation==='capture'&&
        (evidence.paymentId!==current.paymentId||result.outcome!=='succeeded'||
         result.providerPhase!=='POST_AUTH'))
      throw new Error('capture_resolution_evidence_mismatch');

    const updated=Object.freeze({...current,state:result.outcome,revision:current.revision+1,
      updatedAt:this.now().toISOString(),result:frozenResult(result),
      resolutionEvidenceOperationId:evidenceOperationId} as InternalRecord);
    this.records.set(recordKey,updated);
    return publicRecord(updated);
  }

  snapshot():readonly IyzicoOperationRecord[]{
    return Object.freeze([...this.records.values()].map(publicRecord));
  }
}
