import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {t100Rpc,T100Error,type T100Db} from './t100-rpc';
import {createIyzicoStage12Server} from '../../apps/customer/src/lib/finance/iyzico/iyzico-stage12-factory';
/** An explicit admin recovery only consumes bound signed evidence; never retries a payment mutation. */
export async function recoverT100Finance(db:SupabaseClient,jobId:string,adminId:string){
 const {data:f,error}=await db.from('t100_finalizations').select('id,intent_id,state,provider_operation_id,multi_payment').eq('job_id',jobId).maybeSingle();
 if(error)throw new T100Error(503,'unavailable','Finans kaydı okunamadı.');
 if(f?.multi_payment)return recoverT103Finance(db,f.id,adminId);
 if(!f?.intent_id||!f.provider_operation_id||!['unknown','blocked','failed','running'].includes(f.state))throw new T100Error(409,'recovery_not_available','Kurtarma için bağlı finansal işlem gerekli.');
 const {data:o,error:oe}=await db.from('finance_iyzico_operations').select('operation_id,operation,state,signature_verified').eq('intent_id',f.intent_id).eq('operation_id',f.provider_operation_id).maybeSingle();
 if(oe)throw new T100Error(503,'unavailable','İşlem kanıtı okunamadı.');
 if(!o)throw new T100Error(409,'evidence_required','Doğrulanmış sağlayıcı kanıtı gerekiyor.');
 if(!(o.signature_verified&&['succeeded','declined'].includes(o.state))){
  if(o.state!=='unknown'||o.operation!=='capture'||process.env.T100_IYZICO_EXECUTION_ENABLED!=='true')throw new T100Error(409,'evidence_required','Doğrulanmış sağlayıcı kanıtı gerekiyor; ödeme tekrar gönderilmez.');
  const {data:intent,error:ie}=await db.from('finance_payment_intents').select('customer_id,provider,environment').eq('id',f.intent_id).maybeSingle();
  if(ie||!intent||intent.provider!=='iyzico'||intent.environment!=='sandbox')throw new T100Error(409,'evidence_required','Sandbox işlem kapsamı doğrulanamadı.');
  await createIyzicoStage12Server().reconcileEvidence(f.intent_id,intent.customer_id,f.provider_operation_id);
 }
 return t100Rpc(db as unknown as T100Db,'t100_recover_finance_result',{p_id:f.id,p_admin_id:adminId,p_operation_id:f.provider_operation_id});
}

/** Multi-payment recovery reads existing evidence only; it never starts pending charges. */
export async function recoverT103Finance(db:SupabaseClient,finalizationId:string,adminId:string){
 const rpc=db as unknown as T100Db;
 const parts=await t100Rpc(rpc,'t103_finance_plan',{p_id:finalizationId}) as Array<{id:string;intentId:string;operation:string;operationId:string|null;state:string}>;
 if(!Array.isArray(parts))throw new T100Error(503,'unavailable','Finans planı okunamadı.');
 const results=[];
 for(const part of parts){
  if(!['unknown','blocked','failed','running'].includes(part.state)||!part.operationId)continue;
  const{data:o,error}=await db.from('finance_iyzico_operations').select('state,signature_verified').eq('intent_id',part.intentId).eq('operation_id',part.operationId).maybeSingle();
  if(error)throw new T100Error(503,'unavailable','İşlem kanıtı okunamadı.');
  if(!o)continue;
  if(!(o.signature_verified&&['succeeded','declined'].includes(o.state))){
   if(o.state!=='unknown'||part.operation!=='capture'||process.env.T100_IYZICO_EXECUTION_ENABLED!=='true')continue;
   const{data:intent,error:ie}=await db.from('finance_payment_intents').select('customer_id,provider,environment').eq('id',part.intentId).maybeSingle();
   if(ie||!intent||intent.provider!=='iyzico'||intent.environment!=='sandbox')throw new T100Error(409,'evidence_required','Sandbox işlem kapsamı doğrulanamadı.');
   await createIyzicoStage12Server().reconcileEvidence(part.intentId,intent.customer_id,part.operationId);
  }
  const state=await t100Rpc(rpc,'t103_recover_part',{p_id:part.id,p_admin_id:adminId,p_operation_id:part.operationId});results.push({partId:part.id,state});
 }
 return{parts:results,message:'Mevcut kanıtlar kontrol edildi. Yeni tahsilat, iptal veya iade gönderilmedi. Doğrulanamayan ve başlanmamış ödeme parçaları incelemede kalır.'};
}
