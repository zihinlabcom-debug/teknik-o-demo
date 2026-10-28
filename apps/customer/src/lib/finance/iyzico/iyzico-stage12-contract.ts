import 'server-only';
import {createHash} from 'node:crypto';
import type {FinanceProviderOperation} from '../provider-contract';
import type {TryAmount} from './iyzico-money';

export class IyzicoStage12Error extends Error {
  constructor(readonly code:string){super(code);}
}

export type IyzicoRuntimeStatus=Readonly<{
  enabled:boolean;
  gateMode:string;
  provider:string;
  environment:string;
}>;

export type IyzicoStage12Scope=Readonly<{
  intentId:string;
  purpose?:'initial'|'additional';
  serviceRequestId:string;
  customerId:string;
  quoteId:string;
  amount:TryAmount;
  currency:'TRY';
  basketId:string;
  intentStatus:string;
  paymentId?:string;
}>;

export function assertIyzicoStage12Environment(env:Record<string,string|undefined>):void{
  const previewOrLocalDev=env.VERCEL_ENV==='preview'||
    (env.VERCEL_ENV===undefined&&env.NODE_ENV==='development');
  let projectUrl:URL|undefined;
  try{projectUrl=new URL(env.NEXT_PUBLIC_SUPABASE_URL??'');}catch{}
  // Preserve the legacy Staging gate; the isolated test project has an exact HTTPS URL.
  const approvedProject=projectUrl?.hostname==='ygrvtndujbmeatexjdej.supabase.co'||
    projectUrl?.href==='https://ysbaycbflopdmzwfhhnc.supabase.co/';
  if(env.STAGE12_IYZICO_SANDBOX_ENABLED!=='true'||env.APP_ENV!=='staging'||
      !previewOrLocalDev||!approvedProject)
    throw new IyzicoStage12Error('iyzico_stage12_disabled');
}

export function isIyzicoSandboxPendingRequestMode(env:Record<string,string|undefined>):boolean{
  const flag=env.STAGE12_IYZICO_SANDBOX_ENABLED;
  if(flag===undefined||flag==='false')return false;
  assertIyzicoStage12Environment(env);
  return true;
}

export function assertIyzicoStage12Enabled(
  env:Record<string,string|undefined>,runtime:IyzicoRuntimeStatus,
):void{
  assertIyzicoStage12Environment(env);
  if(runtime.enabled!==true||runtime.gateMode!=='test_only'||
      runtime.provider!=='iyzico'||runtime.environment!=='sandbox')
    throw new IyzicoStage12Error('iyzico_stage12_disabled');
}

function safePart(value:string):void{
  if(!/^[A-Za-z0-9:_-]{1,128}$/.test(value))
    throw new IyzicoStage12Error('invalid_server_operation_scope');
}

/** Deterministic, server-issued identifiers. No browser value is used verbatim. */
export function stage12IyzicoOperationKeys(
  scope:IyzicoStage12Scope,operation:FinanceProviderOperation,discriminator:string,
):Readonly<{operationId:string;businessOperationKey:string;conversationId:string}>{
  safePart(scope.intentId);safePart(discriminator);
  const digest=createHash('sha256')
    .update(`${scope.intentId}|${operation}|${discriminator}`,'utf8').digest('hex');
  return Object.freeze({
    operationId:`hp-${operation}-${digest.slice(0,32)}`,
    businessOperationKey:`${operation}:${scope.intentId}:${digest.slice(0,16)}`,
    conversationId:`hp-${operation}-${digest.slice(32)}`,
  });
}
