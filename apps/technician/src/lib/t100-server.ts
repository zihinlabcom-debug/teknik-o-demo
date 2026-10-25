import 'server-only';
import {adminSupabase} from './account-supabase';import {requireRole,requireId} from './operation-guard';
import {t100Rpc,t100State,T100Error,type T100Db} from '../../../../src/lib/t100-rpc';
export async function technicianT100State(requestId:string){requireId(requestId);const a=await requireRole('technician');return t100State(adminSupabase() as unknown as T100Db,requestId,a.id);}
export async function technicianT100Cancel(jobId:string,input:Record<string,unknown>){
 requireId(jobId);const a=await requireRole('technician');
 if(input.action==='funding_review'){
  if(Object.keys(input).some(k=>!['action','costId'].includes(k))||typeof input.costId!=='string')throw new T100Error(400,'invalid_input','Ek maliyet gerekli.');requireId(input.costId);
  const db=adminSupabase();const{data:job,error}=await db.from('service_jobs').select('service_request_id').eq('id',jobId).eq('technician_id',a.id).maybeSingle();
  if(error||!job)throw new T100Error(403,'forbidden','İş sahipliği doğrulanamadı.');
  const state=await t100State(db as unknown as T100Db,job.service_request_id,a.id);
  if(!state.funding?.parts.some(p=>p.costId===input.costId&&!p.secured))throw new T100Error(409,'funding_changed','Ek ödeme koşulları değişti.');
  await t100Rpc(db as unknown as T100Db,'t103_open_funding_review',{p_cost_id:input.costId,p_technician_id:a.id});
  return{message:'İnceleme başvurusu açıldı. Hizmet otomatik sonlandırılmadı; ceza puanı uygulanmadı.'};
 }

 if(Object.keys(input).some(k=>!['action','version','reason'].includes(k))||input.action!=='cancel'||typeof input.version!=='string'||typeof input.reason!=='string')
 throw new T100Error(400,'invalid_input','İptal onayı ve gerekçe gerekli.');
 const db=adminSupabase() as unknown as T100Db;
 await t100Rpc(db,'t100_technician_cancel',{p_job_id:jobId,p_technician_id:a.id,p_version:input.version,p_reason:input.reason});
 return {message:'Atamanız iptal edildi. Müşteri talebi korunarak yeniden dağıtım başlatıldı.'};
}
