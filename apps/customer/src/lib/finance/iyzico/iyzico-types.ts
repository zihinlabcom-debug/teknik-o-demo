import type {TryAmount} from './iyzico-money';

export type IyzicoOperation='authorize'|'capture'|'cancel'|'refund'|'retrieve';
export type IyzicoLocale='tr'|'en';

export type IyzicoOperationContext=Readonly<{
  operationId:string;
  /** Opaque, server-issued key for one logical financial action. Never accept it from a browser. */
  businessOperationKey:string;
  conversationId:string;
  amount:TryAmount;
  currency:'TRY';
}>;

export type IyzicoPaymentCard=Readonly<{
  cardHolderName:string;
  cardNumber:string;
  expireMonth:string;
  expireYear:string;
  cvc:string;
  registerCard:'0';
}>;

export type IyzicoBuyer=Readonly<{
  id:string;name:string;surname:string;gsmNumber:string;email:string;identityNumber:string;
  lastLoginDate:string;registrationDate:string;registrationAddress:string;ip:string;
  city:string;country:string;zipCode?:string;
}>;

export type IyzicoAddress=Readonly<{
  contactName:string;city:string;country:string;address:string;zipCode?:string;
}>;

export type IyzicoBasketItem=Readonly<{
  id:string;price:TryAmount;name:string;category1:string;category2?:string;
  itemType:'PHYSICAL'|'VIRTUAL';
}>;

export type IyzicoAuthorizeInput=IyzicoOperationContext&Readonly<{
  basketId:string;
  paymentCard:IyzicoPaymentCard;
  buyer:IyzicoBuyer;
  shippingAddress:IyzicoAddress;
  billingAddress:IyzicoAddress;
  basketItems:readonly IyzicoBasketItem[];
}>;

export type IyzicoCaptureInput=IyzicoOperationContext&Readonly<{
  paymentId:string;basketId:string;ip:string;
}>;
export type IyzicoCancelInput=IyzicoOperationContext&Readonly<{
  paymentId:string;ip:string;reason?:'OTHER'|'FRAUD'|'BUYER_REQUEST'|'DOUBLE_PAYMENT';description?:string;
}>;
export type IyzicoRefundInput=IyzicoOperationContext&Readonly<{
  paymentId:string;paymentTransactionId:string;ip:string;
  reason?:'OTHER'|'FRAUD'|'BUYER_REQUEST'|'DOUBLE_PAYMENT';description?:string;
}>;
export type IyzicoRetrieveInput=IyzicoOperationContext&Readonly<{
  paymentId?:string;paymentConversationId?:string;basketId:string;
}>;

export type IyzicoResponse=Record<string,unknown>;
