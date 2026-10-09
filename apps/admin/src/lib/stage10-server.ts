import 'server-only';
import {adminSupabase} from './account-supabase';
import {requireId,requireRole,failDb} from '../../../../src/lib/operation-guard';
import {OperationError} from '../../../../src/lib/operation-error';
import {complaintPageRange,finalizeComplaintPage} from './stage10-pagination';

function valueText(value:unknown,min:number,max:number,label:string){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new OperationError('invalid_input',400,`${label} ${min}-${max} karakter olmalıdır.`);return value.trim();}
function version(value:unknown){const n=Number(value);if(!Number.isInteger(n)||n<1)throw new OperationError('invalid_version',400,'Geçersiz sürüm.');return n;}
function failStage10Db(error:{message?:string}|null,context:string):never{const raw=error?.message??'';if(/active admin required|access denied|not related|not assigned/i.test(raw))throw new OperationError('forbidden',403,'Bu işlem için yetkiniz yok.');if(/not found/i.test(raw))throw new OperationError('not_found',404,'Kayıt bulunamadı.');if(/conflict|already|closed service|not open|must decline|cannot|required|not eligible/i.test(raw))throw new OperationError('invalid_state',409,'İşlem mevcut durumda yapılamaz.');if(/^invalid /i.test(raw))throw new OperationError('invalid_input',400,'İstek bilgileri geçerli değil.');failDb(error,context);}

export async function adminStage10Overview({openPage=1,resolvedPage=1}:{openPage?:number;resolvedPage?:number}={}){
  await requireRole('admin');const db=adminSupabase();
  const openRange=complaintPageRange(openPage),resolvedRange=complaintPageRange(resolvedPage);
  const [costResult,openResult,resolvedResult,warrantyResult,correctionResult]=await Promise.all([
    db.from('service_additional_cost_requests').select('id,service_request_id,job_id,technician_id,requested_amount,reason,status,version,admin_reason,final_total,created_at').order('created_at',{ascending:false}).limit(200),
    db.from('service_complaints').select('id,service_request_id,applicant_user_id,applicant_role,description,status,ai_category,ai_priority,ai_recommendation,version,created_at,resolved_at').eq('status','under_review').order('created_at',{ascending:true}).order('id',{ascending:true}).range(openRange.from,openRange.to),
    db.from('service_complaints').select('id,service_request_id,applicant_user_id,applicant_role,description,status,ai_category,ai_priority,ai_recommendation,version,created_at,resolved_at').eq('status','resolved').order('created_at',{ascending:false}).order('id',{ascending:false}).range(resolvedRange.from,resolvedRange.to),
    db.from('service_warranty_claims').select('id,service_request_id,customer_id,original_job_id,warranty_class,warranty_days,description,status,version,customer_reason,internal_reason,created_at').order('created_at',{ascending:false}).limit(200),
    db.from('warranty_correction_assignments').select('id,warranty_claim_id,technician_id,assignment_kind,status,cost_responsibility,offered_at').order('offered_at',{ascending:false}).limit(200),
  ]);
  for(const [result,label] of [[costResult,'Ek maliyet kayıtları'],[openResult,'Açık şikâyet kayıtları'],[resolvedResult,'Sonuçlanan şikâyet kayıtları'],[warrantyResult,'Garanti kayıtları'],[correctionResult,'Garanti düzeltmeleri']] as const)if(result.error)failDb(result.error,label);
  const open=finalizeComplaintPage(openResult.data??[]),resolved=finalizeComplaintPage(resolvedResult.data??[]);
  const complaintIds=[...open.items,...resolved.items].map(item=>item.id),warrantyIds=(warrantyResult.data??[]).map(item=>item.id),costIds=(costResult.data??[]).map(item=>item.id);
  const evidenceSelect='id,complaint_id,warranty_claim_id,additional_cost_request_id,original_file_name,evidence_kind,created_at';
  const [complaintEvidence,warrantyEvidence,costEvidence]=await Promise.all([
    complaintIds.length?db.from('service_case_evidence').select(evidenceSelect).in('complaint_id',complaintIds).order('created_at',{ascending:true}):Promise.resolve({data:[],error:null}),
    warrantyIds.length?db.from('service_case_evidence').select(evidenceSelect).in('warranty_claim_id',warrantyIds).order('created_at',{ascending:true}):Promise.resolve({data:[],error:null}),
    costIds.length?db.from('service_case_evidence').select(evidenceSelect).in('additional_cost_request_id',costIds).order('created_at',{ascending:true}):Promise.resolve({data:[],error:null}),
  ]);
  for(const result of [complaintEvidence,warrantyEvidence,costEvidence])if(result.error)failDb(result.error,'Kanıt kayıtları');
  const evidence=[...(complaintEvidence.data??[]),...(warrantyEvidence.data??[]),...(costEvidence.data??[])];
  return {costs:costResult.data??[],complaints:[...open.items,...resolved.items],openComplaints:open.items,resolvedComplaints:resolved.items,complaintPagination:{openPage,resolvedPage,openHasNext:open.hasNext,resolvedHasNext:resolved.hasNext},warranties:warrantyResult.data??[],corrections:correctionResult.data??[],evidence};
}

export async function adminReviewAdditionalCost(id:string,input:{action:unknown;reason:unknown;version:unknown}){
  requireId(id);const account=await requireRole('admin');const reason=valueText(input.reason,10,1000,'Gerekçe');const expected=version(input.version);const action=String(input.action);
  let result;if(action==='approve'||action==='reject')result=await adminSupabase().rpc('stage10_admin_review_additional_cost',{p_id:id,p_admin_id:account.id,p_approve:action==='approve',p_reason:reason,p_expected_version:expected});
  else if(action==='continue'||action==='cancel')result=await adminSupabase().rpc('stage10_admin_resolve_rejected_cost',{p_id:id,p_admin_id:account.id,p_continue:action==='continue',p_reason:reason,p_expected_version:expected});
  else throw new OperationError('invalid_action',400,'Geçersiz ek maliyet kararı.');
  if(result.error)failStage10Db(result.error,'Ek maliyet kararı');return {status:result.data};
}

export async function adminDecideComplaint(id:string,input:Record<string,unknown>){
  requireId(id);const account=await requireRole('admin');const finalCategory=valueText(input.finalCategory,2,100,'Kategori');const decision=String(input.decision);const reason=valueText(input.reason,20,2000,'Gerekçe');
  const subjectUserId=typeof input.subjectUserId==='string'&&input.subjectUserId?input.subjectUserId:null;if(subjectUserId)requireId(subjectUserId);
  let sanctionEndsAt:null|string=null;if(typeof input.sanctionEndsAt==='string'&&input.sanctionEndsAt){const parsed=new Date(input.sanctionEndsAt);if(Number.isNaN(parsed.getTime()))throw new OperationError('invalid_date',400,'Geçerli yaptırım bitiş tarihi gerekli.');sanctionEndsAt=parsed.toISOString();}
  const {data,error}=await adminSupabase().rpc('stage10_admin_decide_complaint',{p_id:id,p_admin_id:account.id,p_final_category:finalCategory,p_decision:decision,p_reason:reason,p_subject_user_id:subjectUserId,p_sanction_ends_at:sanctionEndsAt,p_expected_version:version(input.version)});
  if(error)failStage10Db(error,'Şikâyet kararı');return {id:data};
}

export async function adminRequestComplaintInfo(id:string,message:unknown){
  requireId(id);const account=await requireRole('admin');const {data,error}=await adminSupabase().rpc('stage10_admin_request_complaint_info',{p_id:id,p_admin_id:account.id,p_message:valueText(message,10,1000,'Bilgi talebi')});if(error)failStage10Db(error,'Bilgi talebi');return {id:data};
}

export async function adminCorrectComplaintDecision(id:string,input:Record<string,unknown>){
  requireId(id);const account=await requireRole('admin');const {data,error}=await adminSupabase().rpc('stage10_admin_correct_complaint_decision',{p_complaint_id:id,p_admin_id:account.id,p_correction_text:valueText(input.correctionText,20,2000,'Düzeltme gerekçesi'),p_revoke_sanction:input.revokeSanction===true});if(error)failStage10Db(error,'Karar düzeltmesi');return {id:data};
}

export async function adminDecideWarranty(id:string,input:Record<string,unknown>){
  requireId(id);const account=await requireRole('admin');const {data,error}=await adminSupabase().rpc('stage10_admin_decide_warranty',{p_id:id,p_admin_id:account.id,p_accept:input.accept===true,p_customer_reason:valueText(input.customerReason,10,1000,'Müşteri açıklaması'),p_internal_reason:valueText(input.internalReason,10,2000,'İç gerekçe'),p_expected_version:version(input.version)});if(error)failStage10Db(error,'Garanti kararı');return {status:data};
}

export async function adminAssignWarranty(id:string,input:Record<string,unknown>){
  requireId(id);const account=await requireRole('admin');const technicianId=valueText(input.technicianId,36,36,'Usta');requireId(technicianId);const {data,error}=await adminSupabase().rpc('stage10_admin_assign_warranty_correction',{p_claim_id:id,p_admin_id:account.id,p_technician_id:technicianId,p_expected_version:version(input.version)});if(error)failStage10Db(error,'Garanti düzeltme ataması');return {id:data};
}

export async function adminKpi(period:'monthly'|'yearly',anchor:string){
  const account=await requireRole('admin');if(!/^\d{4}-\d{2}-\d{2}$/.test(anchor))throw new OperationError('invalid_date',400,'Geçerli tarih gerekli.');const {data,error}=await adminSupabase().rpc('stage10_admin_kpi',{p_admin_id:account.id,p_period:period,p_anchor:anchor});if(error)failStage10Db(error,'KPI');return data as {general:Record<string,unknown>;technicians:Array<Record<string,unknown>>;period:string};
}

export async function adminInterveneRequest(id:string,input:Record<string,unknown>){
  requireId(id);const account=await requireRole('admin');const reason=valueText(input.reason,10,1000,'Gerekçe');const action=String(input.action);let result;
  const idempotencyKey=valueText(input.idempotencyKey,8,128,'İşlem anahtarı');
  if(action==='cancel')result=await adminSupabase().rpc('stage10_admin_cancel_service',{p_request_id:id,p_admin_id:account.id,p_reason:reason,p_idempotency_key:idempotencyKey});
  else if(action==='change_technician'){const technicianId=valueText(input.technicianId,36,36,'Usta');requireId(technicianId);const expectedJobId=valueText(input.expectedJobId,36,36,'Güncel iş');requireId(expectedJobId);result=await adminSupabase().rpc('stage10_admin_change_technician',{p_request_id:id,p_new_technician_id:technicianId,p_admin_id:account.id,p_reason:reason,p_idempotency_key:idempotencyKey,p_expected_job_id:expectedJobId});}
  else throw new OperationError('invalid_action',400,'Yalnız iptal veya usta değişikliği yapılabilir.');
  if(result.error)failStage10Db(result.error,'Operasyon müdahalesi');return {result:result.data};
}

export async function adminOperationContract(requestId:string){requireId(requestId);const account=await requireRole('admin');const {data,error}=await adminSupabase().rpc('stage10_operation_contract',{p_request_id:requestId,p_actor_id:account.id});if(error)failStage10Db(error,'Operasyon durumu');return data as {currentJobId:string|null;stage:string;assignmentSource:string|null;appointmentState:string|null;terminal:boolean;adminInterventionRequired:boolean;effectiveTotal:number|null;currency:string;permissions:Record<string,boolean>};}
