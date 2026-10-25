import 'server-only';
import {t100Rpc,type T100Db} from './t100-rpc';
import {createIyzicoStage12Server} from '../../apps/customer/src/lib/finance/iyzico/iyzico-stage12-factory';
import {stage12IyzicoOperationKeys} from '../../apps/customer/src/lib/finance/iyzico/iyzico-stage12-contract';
import {canonicalTryAmount} from '../../apps/customer/src/lib/finance/iyzico/iyzico-money';
type Claim={claimed:boolean;reservation:string;id:string;requestId:string;jobId:string;intentId:string;customerId:string;action:string;amount:string;intentStatus:string};
export async function processT100Finalization(db:T100Db,id:string,provider:string,ip='127.0.0.1'){
 if(provider==='fake')return t100Rpc(db,'t100_process_fake_finalization',{p_id:id});
 // New live/Sandbox execution stays opt-in. Local development never uses provider credentials implicitly.
 if(provider!=='iyzico'||process.env.T100_IYZICO_EXECUTION_ENABLED!=='true')return {state:'execution_disabled'};
 const claim=await t100Rpc(db,'t100_claim_finalization',{p_id:id}) as Claim;
 if(!claim.claimed)return claim;
 let expectedOperationId='t100-unresolved';
 try{
  const server=createIyzicoStage12Server();
  const scope=await server.intentScope(claim.intentId,claim.customerId);
  const operation=claim.action==='distribute'||claim.action==='cancel'&&Number(claim.amount)>0?'capture':['captured','partially_refunded'].includes(claim.intentStatus)?'refund':'cancel';
  const discriminator=operation==='capture'?(claim.action==='cancel'?claim.id:claim.jobId):operation==='refund'?claim.id:'terminal';
  expectedOperationId=stage12IyzicoOperationKeys(scope,operation,discriminator).operationId;
  await t100Rpc(db,'t100_bind_finance_operation',{p_id:id,p_reservation:claim.reservation,p_operation_id:expectedOperationId});
  let result;
  if(claim.action==='distribute'){
   result=await server.capture(claim.intentId,claim.customerId,{jobId:claim.jobId,ip});
  }else if(claim.action==='cancel'&&Number(claim.amount)>0){
   result=await server.captureCancellation(claim.intentId,claim.customerId,claim.id,ip);
  }else if(['authorized','capture_failed','requires_review'].includes(claim.intentStatus)){
   result=await server.cancel(claim.intentId,claim.customerId,{ip,reason:'BUYER_REQUEST',description:'T100 full authorization cancellation'});
  }else if(['captured','partially_refunded'].includes(claim.intentStatus)){
   const context=await t100Rpc(db,'finance_iyzico_refund_context',{p_intent_id:claim.intentId,p_customer_id:claim.customerId}) as {remainingAmount:string;paymentTransactionId:string};
   if(Number(context.remainingAmount)<=0||Number(context.remainingAmount)>Number(claim.amount))throw new Error('full_refund_amount_mismatch');
   result=await server.refund(claim.intentId,claim.customerId,{refundKey:claim.id,amount:canonicalTryAmount(context.remainingAmount),paymentTransactionId:context.paymentTransactionId,ip,reason:'BUYER_REQUEST'});
  }else{
   // Pending/failed authorizations need no provider mutation, but must be finalized by a verified DB no-op path.
   throw new Error('t100_provider_state_requires_review');
  }
  const outcome=result.coreApplied?result.result.outcome:'unknown';
  return await t100Rpc(db,'t100_record_finance_result',{p_id:id,p_reservation:claim.reservation,p_operation_id:result.result.operationId,p_outcome:outcome});
 }catch{
  // A crash after a provider call must never return the job to an executable queue.
  await t100Rpc(db,'t100_record_finance_result',{p_id:id,p_reservation:claim.reservation,p_operation_id:expectedOperationId,p_outcome:'unknown'}).catch(()=>undefined);
  return {state:'unknown'};
 }
}

/** One durable parent, one independently reserved provider operation per payment part. */
export async function processT103Finalization(db:T100Db,id:string,provider:string,ip='127.0.0.1'){
 if(provider==='fake')return t100Rpc(db,'t103_process_fake_parts',{p_id:id});
 if(provider!=='iyzico'||process.env.T100_IYZICO_EXECUTION_ENABLED!=='true')return {state:'execution_disabled'};
 const parent=await t100Rpc(db,'t100_claim_finalization',{p_id:id}) as Claim;
 if(!parent.claimed)return parent;
 const parts=await t100Rpc(db,'t103_finance_plan',{p_id:id}) as Array<{id:string;intentId:string;operation:string;amount:string;state:string}>;
 if(!Array.isArray(parts)||!parts.length)throw new Error('t103_financial_plan_missing');
 let state='running';
 for(const part of parts){
  if(part.state==='verified')continue;
  if(part.state!=='pending')return {state:part.state};
  const claim=await t100Rpc(db,'t103_claim_part',{p_id:part.id,p_parent_reservation:parent.reservation}) as {claimed:boolean;reservation:string;intentId:string;customerId:string;operation:string;amount:string;state?:string};
  if(!claim.claimed)return {state:claim.state??'blocked'};
  if(claim.operation==='no_op'){
   state=String(await t100Rpc(db,'t103_finalize_noop_part',{p_id:part.id,p_reservation:claim.reservation}));
   if(['unknown','failed','blocked'].includes(state))return {state};continue;
  }
  let operationId:string|null=null;
  try{
   const server=createIyzicoStage12Server(),scope=await server.intentScope(claim.intentId,claim.customerId);
   if(!['capture','cancel','refund'].includes(claim.operation))throw new Error('t103_invalid_part_operation');
   const operation=claim.operation as 'capture'|'cancel'|'refund';
   operationId=stage12IyzicoOperationKeys(scope,operation,operation==='cancel'?'terminal':part.id).operationId;
   await t100Rpc(db,'t103_bind_part_operation',{p_id:part.id,p_reservation:claim.reservation,p_operation_id:operationId});
   let result;
   if(operation==='capture')result=await server.capturePart(claim.intentId,claim.customerId,part.id,ip);
   else if(operation==='cancel')result=await server.cancel(claim.intentId,claim.customerId,{ip,reason:'BUYER_REQUEST',description:'T103 authorization closure'});
   else{
    const context=await t100Rpc(db,'finance_iyzico_refund_context',{p_intent_id:claim.intentId,p_customer_id:claim.customerId}) as {remainingAmount:string;paymentTransactionId:string};
    if(canonicalTryAmount(context.remainingAmount)!==canonicalTryAmount(claim.amount))throw new Error('t103_full_refund_mismatch');
    result=await server.refund(claim.intentId,claim.customerId,{refundKey:part.id,amount:canonicalTryAmount(claim.amount),paymentTransactionId:context.paymentTransactionId,ip,reason:'BUYER_REQUEST'});
   }
   if(result.result.operationId!==operationId)throw new Error('t103_provider_identity_mismatch');
   state=String(await t100Rpc(db,'t103_record_part_result',{p_id:part.id,p_reservation:claim.reservation,p_operation_id:operationId,p_outcome:result.coreApplied?result.result.outcome:'unknown'}));
   if(['unknown','failed','blocked'].includes(state))return {state};
  }catch{
   await t100Rpc(db,'t103_record_part_result',{p_id:part.id,p_reservation:claim.reservation,p_operation_id:operationId,p_outcome:'unknown'}).catch(()=>undefined);
   return {state:'unknown'};
  }
 }
 return {state};
}
