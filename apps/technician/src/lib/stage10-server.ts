import 'server-only';
import {adminSupabase} from './account-supabase';
import {requireId,requireRole,failDb} from './operation-guard';
import {OperationError} from './operation-error';
import {removeUnlinkedEvidence,removeUploadedEvidence,uploadCaseEvidence} from './case-evidence';

function text(value:unknown,min:number,max:number,label:string){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new OperationError('invalid_input',400,`${label} ${min}-${max} karakter olmalıdır.`);return value.trim();}
function failStage10Db(error:{message?:string}|null,context:string):never{const raw=error?.message??'';if(/does not own|not related|not assigned|access denied|active technician required/i.test(raw))throw new OperationError('forbidden',403,'Bu işlem için yetkiniz yok.');if(/not found/i.test(raw))throw new OperationError('not_found',404,'Kayıt bulunamadı.');if(/conflict|already open|window expired|closed service|not available|cannot|required/i.test(raw))throw new OperationError('invalid_state',409,'İşlem mevcut durumda yapılamaz.');if(/^invalid /i.test(raw))throw new OperationError('invalid_input',400,'İstek bilgileri geçerli değil.');failDb(error,context);}
function failPreflight(error:{message?:string}|null):never{const raw=error?.message??'';if(/does not own|not related|not assigned|not eligible/i.test(raw))throw new OperationError('forbidden',403,'Bu hizmet için işlem yetkiniz yok.');if(/window expired|closed service|required|not available|already open/i.test(raw))throw new OperationError('invalid_state',409,'Bu hizmet mevcut durumda işleme uygun değil.');failDb(error,'İşlem uygunluğu');}
async function preflight(action:'complaint'|'additional_cost',actorId:string,input:{requestId?:string;jobId?:string}){const {error}=await adminSupabase().rpc('stage10_preflight_case_action',{p_action:action,p_actor_id:actorId,p_request_id:input.requestId??null,p_job_id:input.jobId??null});if(error)failPreflight(error);}

export async function technicianStage10Overview(){
  const account=await requireRole('technician');const db=adminSupabase();
  const [jobResult,costResult,complaintResult,correctionResult]=await Promise.all([
    db.from('service_jobs').select('id,service_request_id,status,assigned_at').eq('technician_id',account.id).order('created_at',{ascending:false}),
    db.from('service_additional_cost_requests').select('id,service_request_id,job_id,requested_amount,reason,status,version,created_at').eq('technician_id',account.id).order('created_at',{ascending:false}),
    db.from('service_complaints').select('id,service_request_id,status,created_at').eq('applicant_user_id',account.id).order('created_at',{ascending:false}),
    db.from('warranty_correction_assignments').select('id,warranty_claim_id,assignment_kind,status,cost_responsibility,offered_at').eq('technician_id',account.id).order('offered_at',{ascending:false}),
  ]);if(jobResult.error)failDb(jobResult.error,'Usta işleri');if(costResult.error)failDb(costResult.error,'Ek maliyet kayıtları');if(complaintResult.error)failDb(complaintResult.error,'Şikâyet kayıtları');if(correctionResult.error)failDb(correctionResult.error,'Garanti düzeltmeleri');return {jobs:jobResult.data??[],costs:costResult.data??[],complaints:complaintResult.data??[],corrections:correctionResult.data??[]};
}

export async function createTechnicianComplaint(input:{requestId:unknown;description:unknown;idempotencyKey:unknown;files:File[]}){
  const account=await requireRole('technician');const requestId=text(input.requestId,36,36,'Talep numarası');requireId(requestId);
  const description=text(input.description,20,1000,'Açıklama');const idempotencyKey=text(input.idempotencyKey,8,128,'İşlem anahtarı');
  await preflight('complaint',account.id,{requestId});
  const uploaded=await uploadCaseEvidence(input.files,account.id,'complaint');
  const {data,error}=await adminSupabase().rpc('stage10_create_complaint',{p_request_id:requestId,p_applicant_id:account.id,p_description:description,p_idempotency_key:idempotencyKey,p_evidence:uploaded});
  if(error){await removeUploadedEvidence(uploaded);failStage10Db(error,'Şikâyet başvurusu');}await removeUnlinkedEvidence(uploaded,String(data),'complaint');return {id:data,message:'Şikâyetiniz inceleniyor.'};
}

export async function createTechnicianAdditionalCost(input:{jobId:unknown;amount:unknown;reason:unknown;idempotencyKey:unknown;files:File[]}){
  const account=await requireRole('technician');const jobId=text(input.jobId,36,36,'İş numarası');requireId(jobId);
  const amount=Number(input.amount);if(!Number.isFinite(amount)||amount<=0||amount>1000000)throw new OperationError('invalid_amount',400,'Geçerli bir ek maliyet tutarı girin.');
  const reason=text(input.reason,20,1000,'Gerekçe');const idempotencyKey=text(input.idempotencyKey,8,128,'İşlem anahtarı');
  await preflight('additional_cost',account.id,{jobId});
  const uploaded=await uploadCaseEvidence(input.files,account.id,'additional_cost');
  const {data,error}=await adminSupabase().rpc('stage10_create_additional_cost',{p_job_id:jobId,p_technician_id:account.id,p_amount:amount,p_reason:reason,p_idempotency_key:idempotencyKey,p_evidence:uploaded});
  if(error){await removeUploadedEvidence(uploaded);failStage10Db(error,'Ek maliyet talebi');}await removeUnlinkedEvidence(uploaded,String(data),'additional_cost');return {id:data,status:'pending_admin'};
}

export async function respondWarrantyCorrection(id:string,action:'accept'|'decline'|'complete'){
  requireId(id);const account=await requireRole('technician');const db=adminSupabase();
  const result=action==='complete'
    ?await db.rpc('stage10_complete_warranty_correction',{p_assignment_id:id,p_technician_id:account.id})
    :await db.rpc('stage10_technician_respond_warranty_correction',{p_assignment_id:id,p_technician_id:account.id,p_accept:action==='accept'});
  if(result.error)failStage10Db(result.error,'Garanti düzeltme işlemi');return {status:result.data};
}

export async function technicianOperationContract(requestId:string){
  requireId(requestId);const account=await requireRole('technician');const {data,error}=await adminSupabase().rpc('stage10_operation_contract',{p_request_id:requestId,p_actor_id:account.id});if(error)failStage10Db(error,'Operasyon durumu');return data as {stage:string;assignmentSource:string|null;appointmentState:string|null;terminal:boolean;adminInterventionRequired:boolean;effectiveTotal:number|null;currency:string;permissions:Record<string,boolean>};
}
