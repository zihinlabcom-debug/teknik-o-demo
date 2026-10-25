import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {t100Rpc,type T100Db} from './t100-rpc';
import {processT100Finalization,processT103Finalization} from './t100-finance-server';
export type T100ProcessingOutcome={state:string;code?:string};
function outcome(value:unknown):T100ProcessingOutcome{if(typeof value==='string')return {state:value};if(value&&typeof value==='object'&&typeof (value as T100ProcessingOutcome).state==='string')return value as T100ProcessingOutcome;throw new Error('processing_failed');}
export async function processRequestFinalization(db:SupabaseClient,requestId:string):Promise<T100ProcessingOutcome>{
 const {data:row,error}=await db.from('t100_finalizations').select('id,intent_id,state,action,multi_payment').eq('service_request_id',requestId).maybeSingle();
 if(error)throw new Error('database_unavailable');if(!row)return {state:'not_found'};if(row.state!=='pending')return {state:String(row.state)};
 // No compatibility settlement for old unfunded requests. New creation is guarded atomically.
 if(!row.intent_id)return {state:'blocked',code:'payment_intent_required'};
 const {data:intent,error:intentError}=await db.from('finance_payment_intents').select('provider,status').eq('id',row.intent_id).maybeSingle();
 if(intentError)throw new Error('database_unavailable');if(!intent)return {state:'blocked',code:'payment_intent_required'};
 if(['pending_authorization','authorization_failed'].includes(intent.status)){
  if(row.action==='distribute')return {state:'blocked',code:'provider_state_unavailable'};
  return outcome(await t100Rpc(db as unknown as T100Db,'t100_finalize_unstarted_authorization',{p_id:row.id}));
 }
 if(row.multi_payment)return outcome(await processT103Finalization(db as unknown as T100Db,String(row.id),String(intent.provider)));
 return outcome(await processT100Finalization(db as unknown as T100Db,String(row.id),String(intent.provider)));
}
export async function runT100Tick(db:SupabaseClient){
 const rpc=db as unknown as T100Db;
 await t100Rpc(rpc,'t100_expire_finance_reservations',{});await t100Rpc(rpc,'t100_completion_tick',{p_limit:50});
 const queue=await t100Rpc(rpc,'t100_pending_finance_queue',{p_limit:50});if(!Array.isArray(queue))throw new Error('t100_queue_read_failed');
 const result={checked:queue.length,verified:0,pending:0,unknown:0,blocked:0,failed:0,executionDisabled:0,errors:0,deferred:0,unresolved:0};
 for(const row of queue){let code:string|null=null;
  try{const value=await processRequestFinalization(db,String(row.service_request_id));
   if(value.state==='verified')result.verified++;else if(value.state==='unknown')result.unknown++;else if(value.state==='failed')result.failed++;else if(value.state==='blocked'){result.blocked++;code=value.code??'provider_state_unavailable';}else if(value.state==='execution_disabled'){result.executionDisabled++;code='execution_disabled';}else result.pending++;
  }catch{result.errors++;code='processing_failed';}
  if(code){try{await t100Rpc(rpc,'t100_defer_finalization',{p_id:row.id,p_code:code});result.deferred++;}catch{result.errors++;}}
 }
 result.unresolved=result.checked-result.verified;return result;
}
