import {createHash} from 'node:crypto';
import type {FinanceMoney,FinanceProviderOperation} from '../provider-contract';
import type {
  IyzicoAuthorizeInput,IyzicoCancelInput,IyzicoCaptureInput,IyzicoRefundInput,IyzicoRetrieveInput,
} from './iyzico-types';

export type IyzicoManagedInput=
  IyzicoAuthorizeInput|IyzicoCaptureInput|IyzicoCancelInput|IyzicoRefundInput|IyzicoRetrieveInput;

export type IyzicoOperationDescriptor=Readonly<{
  provider:'iyzico';
  environment:'sandbox';
  operation:FinanceProviderOperation;
  operationId:string;
  businessOperationKey:string;
  conversationId:string;
  fingerprint:string;
  money:FinanceMoney;
  basketId?:string;
  paymentId?:string;
  paymentTransactionId?:string;
  paymentConversationId?:string;
}>;

type SafeFingerprintPayload=Readonly<{
  version:'iyzico-operation-v1';
  operation:FinanceProviderOperation;
  businessOperationKey:string;
  conversationId:string;
  amount:string;
  currency:'TRY';
  basketId:string;
  itemIds:readonly string[];
  itemPrices:readonly string[];
  paymentId:string;
  paymentTransactionId:string;
  paymentConversationId:string;
  reason:string;
}>;

function safePayload(operation:FinanceProviderOperation,input:IyzicoManagedInput):SafeFingerprintPayload{
  const authorize=operation==='authorize'?input as IyzicoAuthorizeInput:undefined;
  const capture=operation==='capture'?input as IyzicoCaptureInput:undefined;
  const cancel=operation==='cancel'?input as IyzicoCancelInput:undefined;
  const refund=operation==='refund'?input as IyzicoRefundInput:undefined;
  const retrieve=operation==='retrieve'?input as IyzicoRetrieveInput:undefined;
  return {
    version:'iyzico-operation-v1',operation,businessOperationKey:input.businessOperationKey,
    conversationId:input.conversationId,
    amount:input.amount,currency:input.currency,
    basketId:authorize?.basketId??capture?.basketId??retrieve?.basketId??'',
    itemIds:authorize?.basketItems.map(item=>item.id)??[],
    itemPrices:authorize?.basketItems.map(item=>item.price)??[],
    paymentId:capture?.paymentId??cancel?.paymentId??refund?.paymentId??retrieve?.paymentId??'',
    paymentTransactionId:refund?.paymentTransactionId??'',
    paymentConversationId:retrieve?.paymentConversationId??'',
    reason:cancel?.reason??refund?.reason??'',
  };
}

export function fingerprintIyzicoOperation(
  operation:FinanceProviderOperation,input:IyzicoManagedInput,
):string{
  return createHash('sha256').update(JSON.stringify(safePayload(operation,input)),'utf8').digest('hex');
}

export function describeIyzicoOperation(
  operation:FinanceProviderOperation,input:IyzicoManagedInput,
):IyzicoOperationDescriptor{
  const descriptor:IyzicoOperationDescriptor={
    provider:'iyzico',environment:'sandbox',operation,operationId:input.operationId,
    businessOperationKey:input.businessOperationKey,
    conversationId:input.conversationId,fingerprint:fingerprintIyzicoOperation(operation,input),
    money:Object.freeze({amount:input.amount,currency:input.currency}),
    ...('basketId' in input&&input.basketId?{basketId:input.basketId}:{}),
    ...('paymentId' in input&&input.paymentId?{paymentId:input.paymentId}:{}),
    ...('paymentTransactionId' in input&&input.paymentTransactionId?
      {paymentTransactionId:input.paymentTransactionId}:{}),
    ...('paymentConversationId' in input&&input.paymentConversationId?
      {paymentConversationId:input.paymentConversationId}:{}),
  };
  return Object.freeze(descriptor);
}
