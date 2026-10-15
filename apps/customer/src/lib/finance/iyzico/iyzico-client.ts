import type {IyzicoTransportResponse} from './iyzico-transport';
import {IYZICO_ENDPOINTS} from './iyzico-transport';
import type {
  IyzicoAuthorizeInput,IyzicoCancelInput,IyzicoCaptureInput,IyzicoRefundInput,IyzicoRetrieveInput,
} from './iyzico-types';

export interface IyzicoTransportLike {
  post(path:string,payload:Record<string,unknown>):Promise<IyzicoTransportResponse>;
}

export class IyzicoClient {
  constructor(private readonly transport:IyzicoTransportLike){}

  authorize(input:IyzicoAuthorizeInput){
    return this.transport.post(IYZICO_ENDPOINTS.authorize,{
      locale:'tr',conversationId:input.conversationId,price:input.amount,paidPrice:input.amount,
      currency:input.currency,installment:1,basketId:input.basketId,paymentChannel:'WEB',
      paymentGroup:'PRODUCT',paymentCard:input.paymentCard,buyer:input.buyer,
      shippingAddress:input.shippingAddress,billingAddress:input.billingAddress,
      basketItems:input.basketItems,
    });
  }

  capture(input:IyzicoCaptureInput){
    return this.transport.post(IYZICO_ENDPOINTS.capture,{locale:'tr',conversationId:input.conversationId,
      paymentId:input.paymentId,paidPrice:input.amount,currency:input.currency,ip:input.ip});
  }

  cancel(input:IyzicoCancelInput){
    const body:Record<string,unknown>={locale:'tr',conversationId:input.conversationId,
      paymentId:input.paymentId,ip:input.ip};
    if(input.reason)body.reason=input.reason;
    if(input.description)body.description=input.description;
    return this.transport.post(IYZICO_ENDPOINTS.cancel,body);
  }

  refund(input:IyzicoRefundInput){
    const body:Record<string,unknown>={locale:'tr',conversationId:input.conversationId,
      paymentTransactionId:input.paymentTransactionId,price:input.amount,currency:input.currency,ip:input.ip};
    if(input.reason)body.reason=input.reason;
    if(input.description)body.description=input.description;
    return this.transport.post(IYZICO_ENDPOINTS.refund,body);
  }

  retrieve(input:IyzicoRetrieveInput){
    const body:Record<string,unknown>={locale:'tr',conversationId:input.conversationId};
    if(input.paymentId)body.paymentId=input.paymentId;
    if(input.paymentConversationId)body.paymentConversationId=input.paymentConversationId;
    return this.transport.post(IYZICO_ENDPOINTS.retrieve,body);
  }
}
