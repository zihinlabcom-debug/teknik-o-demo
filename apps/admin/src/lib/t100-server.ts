import 'server-only';import {recoverT100Finance} from '../../../../src/lib/t100-recovery-server';import {adminSupabase} from './account-supabase';
import {requireRole,requireId} from '../../../../src/lib/operation-guard';
import {t100Rpc,t100State,T100Error,type T100Db} from '../../../../src/lib/t100-rpc';
import {processRequestFinalization} from '../../../../src/lib/t100-service-server';
export async function adminT100Decision(jobId:string,input:Record<string,unknown>){
 requireId(jobId);const a=await requireRole('admin');const db=adminSupabase();
 if(Object.keys(input).some(k=>k!=='decision')||typeof input.decision!=='string'||!['distribute','refund'].includes(input.decision))throw new T100Error(400,'invalid_decision','Geçersiz finans kararı.');
 await t100Rpc(db as unknown as T100Db,'t100_admin_finance_decision',{p_job_id:jobId,p_admin_id:a.id,p_decision:input.decision});
 const {data:job,error}=await db.from('service_jobs').select('service_request_id').eq('id',jobId).single();
 if(error||!job)throw new T100Error(503,'unavailable','Hizmet durumu doğrulanamadı.');
 await processRequestFinalization(db,job.service_request_id);
 return {message:'Karar kaydedildi. Sağlayıcının sonucu ve simüle dağıtım durumu ayrıca izlenir.'};
}
export async function adminT100Cases(requestIds:string[]){
 await requireRole('admin');if(!requestIds.length)return new Map<string,{jobId:string;state:string|null}>();
 const db=adminSupabase();
 const [reports,reviews,finalizations,jobs]=await Promise.all([
 db.from('t100_completion_reports').select('job_id,service_request_id,response,complaint_id,voided_at').in('service_request_id',requestIds),
 db.from('t100_reviews').select('service_request_id,complaint_id').in('service_request_id',requestIds),
 db.from('t100_finalizations').select('service_request_id,state').in('service_request_id',requestIds),
 db.from('service_jobs').select('id,service_request_id,status,assigned_at').in('service_request_id',requestIds).in('status',['assigned','in_progress','completed','cancelled']).order('assigned_at',{ascending:false})]);
 if([reports,reviews,finalizations,jobs].some(r=>r.error))throw new T100Error(503,'unavailable','İnceleme finans durumu okunamadı.');
 const result=new Map<string,{jobId:string;state:string|null}>();
 for(const id of requestIds){
  const held=reports.data?.some(r=>r.service_request_id===id&&r.response==='no'&&r.complaint_id&&!r.voided_at)||reviews.data?.some(r=>r.service_request_id===id&&r.complaint_id);
  const job=jobs.data?.find(j=>j.service_request_id===id);const f=finalizations.data?.find(f=>f.service_request_id===id);
  if(held&&job)result.set(id,{jobId:job.id,state:f?.state??null});
 }
 return result;
}

export async function adminT100State(id:string){requireId(id);const a=await requireRole('admin');return t100State(adminSupabase() as unknown as T100Db,id,a.id);}

export async function adminT100Recovery(jobId:string,input:Record<string,unknown>){
 requireId(jobId);const a=await requireRole('admin');
 if(Object.keys(input).length!==1||input.action!=='recover')throw new T100Error(400,'invalid_action','Geçersiz doğrulama isteği.');
 const result=await recoverT100Finance(adminSupabase(),jobId,a.id);
 return {result,message:'Mevcut finansal kanıt kontrol edildi. Yeni ödeme işlemi gönderilmedi; güncel finans durumunu kontrol edin.'};
}
