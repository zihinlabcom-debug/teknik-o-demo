import type {FinanceProviderAdapter,FinanceProviderOperation,FinanceProviderResult} from '../provider-contract';
import type {IyzicoSandboxConfig} from './iyzico-config-contract';
import {IyzicoError} from './iyzico-errors';
import {canonicalTryAmount,tryAmountToMinorUnits} from './iyzico-money';
import {verifyIyzicoResponseSignature,type IyzicoSignedOperation} from './iyzico-response-signature';
import {IyzicoClient} from './iyzico-client';
import type {IyzicoTransportResponse} from './iyzico-transport';
import type {
  IyzicoAuthorizeInput,IyzicoCancelInput,IyzicoCaptureInput,IyzicoOperationContext,
  IyzicoRefundInput,IyzicoResponse,IyzicoRetrieveInput,
} from './iyzico-types';

type IyzicoInput=IyzicoAuthorizeInput|IyzicoCaptureInput|IyzicoCancelInput|IyzicoRefundInput|IyzicoRetrieveInput;
const idPattern=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const cancelReasons=new Set(['OTHER','FRAUD','BUYER_REQUEST','DOUBLE_PAYMENT']);

function text(value:unknown):string|undefined{
  return typeof value==='string'&&value.length>0?value:undefined;
}
function nonEmpty(value:unknown,max=500):value is string{
  return typeof value==='string'&&value.trim().length>0&&value.length<=max;
}
function validId(value:unknown):value is string{return typeof value==='string'&&idPattern.test(value);}
function isCanonicalAmount(value:unknown):boolean{
  if(typeof value!=='string')return false;
  try{return canonicalTryAmount(value)===value;}catch{return false;}
}
function invalidInput():never{
  throw new IyzicoError('invalid_operation_input','validation',false,'İyzico işlem girdisi geçersiz.');
}
function assertContext(input:IyzicoOperationContext):void{
  if(!validId(input.operationId)||!validId(input.businessOperationKey)||
      !validId(input.conversationId)||input.currency!=='TRY'||
      !isCanonicalAmount(input.amount))invalidInput();
}
export function assertIyzicoOperationInput(operation:FinanceProviderOperation,input:IyzicoInput):void{
  assertContext(input);
  if('authorizationAmount' in input&&input.authorizationAmount!==undefined&&(!isCanonicalAmount(input.authorizationAmount)||tryAmountToMinorUnits(input.authorizationAmount)<tryAmountToMinorUnits(input.amount)))invalidInput();
  if(operation==='authorize'){
    const value=input as IyzicoAuthorizeInput;
    if(!validId(value.basketId)||!Array.isArray(value.basketItems)||value.basketItems.length!==1||
        !value.paymentCard||!value.buyer||!value.shippingAddress||!value.billingAddress)invalidInput();
    const item=value.basketItems[0];
    if(!item||!validId(item.id)||!isCanonicalAmount(item.price)||
        tryAmountToMinorUnits(item.price)!==tryAmountToMinorUnits(value.amount)||
        !nonEmpty(item.name,200)||!nonEmpty(item.category1,200)||
        (item.itemType!=='PHYSICAL'&&item.itemType!=='VIRTUAL'))invalidInput();
    if(!nonEmpty(value.paymentCard.cardHolderName,200)||!nonEmpty(value.paymentCard.cardNumber,32)||
        !nonEmpty(value.paymentCard.expireMonth,2)||!nonEmpty(value.paymentCard.expireYear,4)||
        !nonEmpty(value.paymentCard.cvc,4)||value.paymentCard.registerCard!=='0')invalidInput();
    if(!validId(value.buyer.id)||![value.buyer.name,value.buyer.surname,value.buyer.gsmNumber,
      value.buyer.email,value.buyer.identityNumber,value.buyer.lastLoginDate,value.buyer.registrationDate,
      value.buyer.registrationAddress,value.buyer.ip,value.buyer.city,value.buyer.country].every(v=>nonEmpty(v)))
      invalidInput();
    for(const address of [value.shippingAddress,value.billingAddress])
      if(![address.contactName,address.city,address.country,address.address].every(v=>nonEmpty(v)))invalidInput();
    return;
  }
  if(operation==='retrieve'){
    const value=input as IyzicoRetrieveInput;
    if(!validId(value.basketId)||
        (value.paymentId!==undefined&&!validId(value.paymentId))||
        (value.paymentConversationId!==undefined&&!validId(value.paymentConversationId))||
        (!value.paymentId&&!value.paymentConversationId))invalidInput();
    return;
  }
  if(!('paymentId' in input)||!validId(input.paymentId))invalidInput();
  if(operation==='capture'&&(!('basketId' in input)||!validId(input.basketId)))invalidInput();
  if(operation==='capture'||operation==='cancel'||operation==='refund'){
    if(!('ip' in input)||!nonEmpty(input.ip,64))invalidInput();
  }
  if(operation==='refund'&&(!('paymentTransactionId' in input)||!validId(input.paymentTransactionId)))
    invalidInput();
  if((operation==='cancel'||operation==='refund')&&'reason' in input&&input.reason!==undefined&&
      !cancelReasons.has(input.reason))invalidInput();
  if((operation==='cancel'||operation==='refund')&&'description' in input&&input.description!==undefined&&
      !nonEmpty(input.description,256))invalidInput();
}

function declined(
  operation:FinanceProviderOperation,input:IyzicoOperationContext,response:IyzicoResponse,
  signatureVerified=false,errorCode?:string,
):FinanceProviderResult{
  const providerCode=text(response.errorCode);
  const safeCode=providerCode&&/^[A-Za-z0-9_.:-]{1,100}$/.test(providerCode)?providerCode:undefined;
  return {provider:'iyzico',operation,operationId:input.operationId,conversationId:input.conversationId,
    outcome:'declined',money:{amount:input.amount,currency:input.currency},signatureVerified,
    retryable:response.retryable===true,errorCode:errorCode||safeCode||'provider_declined'};
}
function providerErrorCode(response:IyzicoResponse,fallback:string):string{
  const providerCode=text(response.errorCode);
  return providerCode&&/^[A-Za-z0-9_.:-]{1,100}$/.test(providerCode)?providerCode:fallback;
}
function unknown(
  operation:FinanceProviderOperation,input:IyzicoOperationContext,errorCode:string,retryable=false,
):FinanceProviderResult{
  return {provider:'iyzico',operation,operationId:input.operationId,conversationId:input.conversationId,
    outcome:'unknown',money:{amount:input.amount,currency:input.currency},signatureVerified:false,
    retryable,errorCode};
}
function paymentTransactionId(response:IyzicoResponse):string|undefined{
  const direct=text(response.paymentTransactionId);if(direct)return direct;
  if(!Array.isArray(response.itemTransactions)||response.itemTransactions.length!==1)return undefined;
  const item=response.itemTransactions[0];
  return item&&typeof item==='object'?text((item as Record<string,unknown>).paymentTransactionId):undefined;
}

type SignedOptions=Readonly<{
  expectedPaymentId?:string;
  expectedPrice?:string;
  expectedBasketId?:string;
  expectedTransactionId?:string;
  requireTransactionId?:boolean;
  requirePaidPrice?:boolean;
  requireFraudApproval?:boolean;
  retrieve?:boolean;
  expectedPhase?:'PRE_AUTH'|'POST_AUTH';
}>;

export class IyzicoSandboxAdapter implements FinanceProviderAdapter<
  IyzicoAuthorizeInput,IyzicoCaptureInput,IyzicoCancelInput,IyzicoRefundInput,IyzicoRetrieveInput
>{
  constructor(private readonly config:IyzicoSandboxConfig,private readonly client:IyzicoClient){}

  private normalizeSigned(
    operation:IyzicoSignedOperation,input:IyzicoOperationContext,
    transport:IyzicoTransportResponse,options:SignedOptions,
  ):FinanceProviderResult{
    const response=transport.body;
    if(transport.trust!=='pinned_https_sandbox')
      return unknown(operation,input,'untrusted_provider_transport');
    if(response.status==='failure'){
      if(transport.httpStatus>=500)return unknown(operation,input,'provider_http_error',true);
      if(response.conversationId!==input.conversationId)return unknown(operation,input,'conversation_mismatch');
      // iyzico error responses do not carry the signed payment fields required by the
      // documented response-HMAC contract. Persist them as unknown rather than an
      // unverified terminal decline; explicit reconciliation can safely retry a read.
      return unknown(operation,input,providerErrorCode(response,'unverified_provider_failure'),
        response.retryable===true);
    }
    if(transport.httpStatus<200||transport.httpStatus>=300)
      return unknown(operation,input,'provider_http_error',transport.httpStatus>=500);
    if(response.status!=='success')return unknown(operation,input,'invalid_provider_status');
    if(response.conversationId!==input.conversationId)return unknown(operation,input,'conversation_mismatch');
    if(!verifyIyzicoResponseSignature(operation,response,this.config.secretKey))
      return unknown(operation,input,'invalid_response_signature');

    const paymentId=text(response.paymentId);
    if(!paymentId)return unknown(operation,input,'missing_provider_reference');
    if(options.expectedPaymentId&&paymentId!==options.expectedPaymentId)
      return unknown(operation,input,'payment_reference_mismatch');
    if(options.expectedBasketId&&response.basketId!==options.expectedBasketId)
      return unknown(operation,input,'basket_reference_mismatch');

    const transactionId=paymentTransactionId(response);
    if(options.requireTransactionId&&!transactionId)
      return unknown(operation,input,'missing_provider_reference');
    if(options.expectedTransactionId&&transactionId!==options.expectedTransactionId)
      return unknown(operation,input,'transaction_reference_mismatch');

    try{
      if(response.currency!==input.currency||canonicalTryAmount(String(response.price))!==(options.expectedPrice??input.amount))
        return unknown(operation,input,'provider_amount_mismatch');
      if(options.requirePaidPrice&&canonicalTryAmount(String(response.paidPrice))!==input.amount)
        return unknown(operation,input,'provider_amount_mismatch');
    }catch{return unknown(operation,input,'invalid_provider_amount');}

    if(options.retrieve){
      const state=text(response.paymentStatus);
      if(state==='FAILURE')return declined(operation,input,response,true,'provider_payment_failed');
      if(state!=='SUCCESS')return unknown(operation,input,'unresolved_payment_status');
    }
    if(options.requireFraudApproval){
      const fraud=Number(response.fraudStatus);
      if(fraud===-1)return declined(operation,input,response,true,'provider_fraud_declined');
      if(fraud!==1)return unknown(operation,input,'provider_fraud_review');
    }
    const phase=text(response.phase);
    // Official response HMAC omits phase/paymentStatus/fraudStatus. These fields are trusted only
    // together with the redirect-disabled, pinned Sandbox HTTPS transport above.
    if(options.expectedPhase&&phase!==options.expectedPhase)
      return unknown(operation,input,'provider_phase_mismatch');
    if(options.retrieve&&phase!=='PRE_AUTH'&&phase!=='POST_AUTH')
      return unknown(operation,input,'invalid_provider_phase');
    return {provider:'iyzico',operation,operationId:input.operationId,conversationId:input.conversationId,
      outcome:'succeeded',money:{amount:input.amount,currency:input.currency},paymentId,
      paymentTransactionId:transactionId,hostReference:text(response.hostReference),signatureVerified:true,
      providerPhase:phase==='PRE_AUTH'||phase==='POST_AUTH'?phase:undefined,retryable:false};
  }

  private normalizeCancel(input:IyzicoCancelInput,transport:IyzicoTransportResponse):FinanceProviderResult{
    const response=transport.body;
    if(transport.trust!=='pinned_https_sandbox')
      return unknown('cancel',input,'untrusted_provider_transport');
    if(response.status==='failure'){
      if(transport.httpStatus>=500)return unknown('cancel',input,'provider_http_error',true);
      if(response.conversationId!==input.conversationId)return unknown('cancel',input,'conversation_mismatch');
      return unknown('cancel',input,providerErrorCode(response,'unverified_provider_failure'),
        response.retryable===true);
    }
    if(transport.httpStatus<200||transport.httpStatus>=300)
      return unknown('cancel',input,'provider_http_error',transport.httpStatus>=500);
    if(response.status!=='success')return unknown('cancel',input,'invalid_provider_status');
    if(response.conversationId!==input.conversationId)return unknown('cancel',input,'conversation_mismatch');
    if(response.paymentId!==input.paymentId)return unknown('cancel',input,'payment_reference_mismatch');
    try{
      if(response.currency!==input.currency||canonicalTryAmount(String(response.price))!==input.amount)
        return unknown('cancel',input,'provider_amount_mismatch');
    }catch{return unknown('cancel',input,'invalid_provider_amount');}
    // iyzico does not document a response-signature formula for /payment/cancel.
    // Reconciliation must confirm the provider state before this can become succeeded.
    return unknown('cancel',input,'unsigned_cancel_response');
  }

  private async safely(
    operation:FinanceProviderOperation,input:IyzicoInput,call:()=>Promise<IyzicoTransportResponse>,
    normalize:(response:IyzicoTransportResponse)=>FinanceProviderResult,
  ):Promise<FinanceProviderResult>{
    try{
      assertIyzicoOperationInput(operation,input);
      return normalize(await call());
    }catch(error){
      if(error instanceof IyzicoError)return unknown(operation,input,error.code,error.retryable);
      return unknown(operation,input,'iyzico_unexpected_error');
    }
  }

  authorize(input:IyzicoAuthorizeInput){
    return this.safely('authorize',input,()=>this.client.authorize(input),response=>
      this.normalizeSigned('authorize',input,response,{expectedBasketId:input.basketId,
        requireTransactionId:true,requirePaidPrice:true,requireFraudApproval:true,expectedPhase:'PRE_AUTH'}));
  }
  capture(input:IyzicoCaptureInput){
    return this.safely('capture',input,()=>this.client.capture(input),response=>
      this.normalizeSigned('capture',input,response,{expectedPrice:input.authorizationAmount,expectedPaymentId:input.paymentId,
        expectedBasketId:input.basketId,requirePaidPrice:true,expectedPhase:'POST_AUTH'}));
  }
  cancel(input:IyzicoCancelInput){
    return this.safely('cancel',input,()=>this.client.cancel(input),response=>this.normalizeCancel(input,response));
  }
  refund(input:IyzicoRefundInput){
    return this.safely('refund',input,()=>this.client.refund(input),response=>
      this.normalizeSigned('refund',input,response,{expectedPaymentId:input.paymentId,
        expectedTransactionId:input.paymentTransactionId,requireTransactionId:true}));
  }
  retrieve(input:IyzicoRetrieveInput){
    return this.safely('retrieve',input,()=>this.client.retrieve(input),response=>
      this.normalizeSigned('retrieve',input,response,{expectedPrice:input.authorizationAmount,expectedPaymentId:input.paymentId,
        expectedBasketId:input.basketId,requirePaidPrice:true,requireFraudApproval:true,retrieve:true}));
  }
}
