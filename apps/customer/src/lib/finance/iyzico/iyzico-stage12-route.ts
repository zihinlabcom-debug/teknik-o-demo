import {NextResponse} from 'next/server';
import {FinanceInputError} from '../sandbox-contract';
import {IyzicoStage12Error} from './iyzico-stage12-contract';

export function iyzicoRouteResponse(body:unknown,status=200){
  return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export function iyzicoRouteError(error:unknown){
  if(error instanceof FinanceInputError)return iyzicoRouteResponse({error:error.message},error.statusCode);
  if(error instanceof IyzicoStage12Error)return iyzicoRouteResponse({error:'İyzico Sandbox akışı kapalı.'},404);
  return iyzicoRouteResponse({error:'Ödeme sonucu doğrulanamadı. İşlemi tekrarlamadan durumu kontrol edin.'},503);
}
export function publicOutcome(value:{
  result:{outcome:string;operationId:string;errorCode?:string};
  coreApplied:boolean;distributionStarted:boolean;reconciliationRequired:boolean;
}){
  return {outcome:value.result.outcome,operationId:value.result.operationId,
    errorCode:value.result.errorCode,coreApplied:value.coreApplied,
    distributionStarted:value.distributionStarted,reconciliationRequired:value.reconciliationRequired};
}