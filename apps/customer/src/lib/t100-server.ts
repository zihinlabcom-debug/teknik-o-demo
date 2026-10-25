import 'server-only';
import {adminSupabase} from './account-supabase';import {requireRole,requireId} from './operation-guard';
import {t100Rpc,t100State,T100Error,type T100Db} from '../../../../src/lib/t100-rpc';
import {processRequestFinalization} from '../../../../src/lib/t100-service-server';
export async function customerT100State(id:string){requireId(id);const account=await requireRole('customer');return t100State(adminSupabase() as unknown as T100Db,id,account.id);}
export async function customerT100Action(id:string,input:Record<string,unknown>){
 requireId(id);const account=await requireRole('customer');const db=adminSupabase();const rpc=db as unknown as T100Db;
 if(Object.keys(input).some(k=>!['action','version','reason','answer','jobId','reportVersion','costId','approvalVersion'].includes(k)))throw new T100Error(400,'invalid_input','Geçersiz işlem alanı.');
 const state=await t100State(rpc,id,account.id);
 if(input.action==='retry_authorization'){
  if(typeof input.costId!=='string'||!Number.isInteger(input.approvalVersion))throw new T100Error(400,'invalid_input','Geçerli ek maliyet gerekli.');
  const part=state.funding?.parts.find(p=>p.costId===input.costId&&p.approvalVersion===input.approvalVersion);
  if(!part?.canRetry||part.uncertain)throw new T100Error(409,'payment_unresolved','Önceki ödemenin kesin sonucu doğrulanmadan yeni deneme yapılamaz.');
  await t100Rpc(rpc,'t103_ensure_additional_intent',{p_cost_id:input.costId,p_customer_id:account.id,p_expected_version:input.approvalVersion,p_new_attempt:true});
 }else if(input.action==='cancel'){

  if(typeof input.version!=='string'||typeof input.reason!=='string')throw new T100Error(400,'invalid_input','İptal onayı ve gerekçe gerekli.');
  await t100Rpc(rpc,'t100_customer_cancel',{p_request_id:id,p_customer_id:account.id,p_version:input.version,p_reason:input.reason});
  await processRequestFinalization(db,id);
 }else if(input.action==='review'){
  await t100Rpc(rpc,'t100_open_cancellation_review',{p_request_id:id,p_customer_id:account.id});
  return {redirect:'/musteri/sikayetler?requestId='+encodeURIComponent(id)+'&purpose=cancellation_review'};
 }else if(input.action==='answer'){
  if(!state.jobId||typeof input.jobId!=='string'||input.jobId!==state.jobId||typeof input.reportVersion!=='string'||input.reportVersion!==state.completion?.version)throw new T100Error(409,'completion_changed','Tamamlanma bildirimi değişti. Güncel bildirimi yeniden kontrol edin.');
  if(!state.jobId||typeof input.answer!=='string'||!['yes','no'].includes(input.answer))throw new T100Error(400,'invalid_input','Geçerli yanıt gerekli.');
  const answer=await t100Rpc(rpc,'t100_answer_completion',{p_job_id:state.jobId,p_customer_id:account.id,p_answer:input.answer,p_report_version:input.reportVersion}) as {response:string;resolution:string|null};
  if(answer.response==='no'&&!answer.resolution)return {redirect:'/musteri/sikayetler?requestId='+encodeURIComponent(id)+'&purpose=completion_review'};
  await t100Rpc(rpc,'t100_prepare_finalization',{p_job_id:state.jobId});await processRequestFinalization(db,id);
 }else throw new T100Error(400,'invalid_action','Geçersiz hizmet işlemi.');
 return {state:await t100State(rpc,id,account.id)};
}
