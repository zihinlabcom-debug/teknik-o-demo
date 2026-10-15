import type {TryAmount} from './iyzico/iyzico-money';

export type FinanceProvider='fake'|'iyzico';
export type FinanceProviderOperation='authorize'|'capture'|'cancel'|'refund'|'retrieve';
export type FinanceProviderOutcome='succeeded'|'declined'|'unknown';
export type FinanceProviderPhase='PRE_AUTH'|'POST_AUTH';

export type FinanceMoney=Readonly<{currency:'TRY';amount:TryAmount}>;

export type FinanceProviderResult=Readonly<{
  provider:FinanceProvider;
  operation:FinanceProviderOperation;
  operationId:string;
  conversationId:string;
  outcome:FinanceProviderOutcome;
  money:FinanceMoney;
  paymentId?:string;
  paymentTransactionId?:string;
  hostReference?:string;
  providerPhase?:FinanceProviderPhase;
  signatureVerified:boolean;
  retryable:boolean;
  errorCode?:string;
}>;

export interface FinanceProviderAdapter<
  AuthorizeInput=unknown,CaptureInput=unknown,CancelInput=unknown,RefundInput=unknown,RetrieveInput=unknown,
>{
  authorize(input:AuthorizeInput):Promise<FinanceProviderResult>;
  capture(input:CaptureInput):Promise<FinanceProviderResult>;
  cancel(input:CancelInput):Promise<FinanceProviderResult>;
  refund(input:RefundInput):Promise<FinanceProviderResult>;
  retrieve(input:RetrieveInput):Promise<FinanceProviderResult>;
}
