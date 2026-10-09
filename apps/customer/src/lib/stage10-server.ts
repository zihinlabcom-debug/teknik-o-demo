import 'server-only';
import {adminSupabase} from './account-supabase';
import {requireId,requireRole,failDb} from './operation-guard';
import {OperationError} from './operation-error';
import {removeUnlinkedEvidence,removeUploadedEvidence,uploadCaseEvidence} from './case-evidence';

function text(value:unknown,min:number,max:number,label:string){
  if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new OperationError('invalid_input',400,`${label} ${min}-${max} karakter olmalıdır.`);
  return value.trim();
}
function key(value:unknown){return text(value,8,128,'İşlem anahtarı');}
function failStage10Db(error:{message?:string}|null,context:string):never{const raw=error?.message??'';if(/does not own|not related|not assigned|access denied|active customer required/i.test(raw))throw new OperationError('forbidden',403,'Bu işlem için yetkiniz yok.');if(/not found/i.test(raw))throw new OperationError('not_found',404,'Kayıt bulunamadı.');if(/conflict|already open|window expired|closed service|completed service required|not available|cannot|required/i.test(raw))throw new OperationError('invalid_state',409,'İşlem mevcut durumda yapılamaz.');if(/^invalid /i.test(raw))throw new OperationError('invalid_input',400,'İstek bilgileri geçerli değil.');failDb(error,context);}
function failPreflight(error:{message?:string}|null):never{
  const raw=error?.message??'';
  if(/does not own|not related|not assigned|not eligible/i.test(raw))throw new OperationError('forbidden',403,'Bu hizmet için başvuru yetkiniz yok.');
  if(/window expired|closed service|completed service|required|not available|already open/i.test(raw))throw new OperationError('invalid_state',409,'Bu hizmet mevcut durumda başvuruya uygun değil.');
  failDb(error,'Başvuru uygunluğu');
}
async function preflight(action:'complaint'|'warranty',actorId:string,requestId:string){
  const {error}=await adminSupabase().rpc('stage10_preflight_case_action',{p_action:action,p_actor_id:actorId,p_request_id:requestId,p_job_id:null});
  if(error)failPreflight(error);
}

export async function customerStage10Overview(){
  const account=await requireRole('customer'); const db=adminSupabase();
  const {data:requests,error}=await db.from('service_requests').select('id,category_id,status,created_at').eq('customer_id',account.id).order('created_at',{ascending:false});
  if(error)failDb(error,'Hizmet kayıtları');
  const ids=(requests??[]).map(item=>item.id);
  const [complaintResult,warrantyResult,costResult,categoryResult]=await Promise.all([
    db.from('service_complaints').select('id,service_request_id,status,created_at').eq('applicant_user_id',account.id).order('created_at',{ascending:false}),
    db.from('service_warranty_claims').select('id,service_request_id,status,customer_reason,created_at').eq('customer_id',account.id).order('created_at',{ascending:false}),
    ids.length?db.from('service_additional_cost_requests').select('id,service_request_id,requested_amount,reason,status,version,created_at,final_total').in('service_request_id',ids).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
    db.from('service_categories').select('id,name'),
  ]);
  if(complaintResult.error)failDb(complaintResult.error,'Şikâyet kayıtları');if(warrantyResult.error)failDb(warrantyResult.error,'Garanti kayıtları');if(costResult.error)failDb(costResult.error,'Ek maliyet kayıtları');if(categoryResult.error)failDb(categoryResult.error,'Kategori kayıtları');
  const complaints=complaintResult.data,warranties=warrantyResult.data,costs=costResult.data,categories=categoryResult.data;
  const categoryMap=new Map((categories??[]).map(item=>[item.id,item.name]));
  return {requests:(requests??[]).map(item=>({...item,category_name:categoryMap.get(item.category_id)??'Hizmet'})),complaints:complaints??[],warranties:warranties??[],additionalCosts:costs??[]};
}

export async function createCustomerComplaint(input:{requestId:unknown;description:unknown;idempotencyKey:unknown;files:File[]}){
  const account=await requireRole('customer'); const requestId=text(input.requestId,36,36,'Talep numarası'); requireId(requestId);
  const description=text(input.description,20,1000,'Açıklama'); const idempotencyKey=key(input.idempotencyKey);
  await preflight('complaint',account.id,requestId);
  const uploaded=await uploadCaseEvidence(input.files,account.id,'complaint');
  const {data,error}=await adminSupabase().rpc('stage10_create_complaint',{p_request_id:requestId,p_applicant_id:account.id,p_description:description,p_idempotency_key:idempotencyKey,p_evidence:uploaded});
  if(error){await removeUploadedEvidence(uploaded);failStage10Db(error,'Şikâyet başvurusu');}
  await removeUnlinkedEvidence(uploaded,String(data),'complaint');
  return {id:data,status:'under_review',message:'Şikâyetiniz inceleniyor.'};
}

export async function createCustomerWarranty(input:{requestId:unknown;description:unknown;idempotencyKey:unknown;files:File[]}){
  const account=await requireRole('customer'); const requestId=text(input.requestId,36,36,'Talep numarası'); requireId(requestId);
  const description=text(input.description,20,1000,'Açıklama'); const idempotencyKey=key(input.idempotencyKey);
  await preflight('warranty',account.id,requestId);
  const uploaded=await uploadCaseEvidence(input.files,account.id,'warranty');
  const {data,error}=await adminSupabase().rpc('stage10_create_warranty_claim',{p_request_id:requestId,p_customer_id:account.id,p_description:description,p_idempotency_key:idempotencyKey,p_evidence:uploaded});
  if(error){await removeUploadedEvidence(uploaded);failStage10Db(error,'Garanti talebi');}
  await removeUnlinkedEvidence(uploaded,String(data),'warranty');
  return {id:data,status:'under_review'};
}

export async function customerDecideAdditionalCost(id:string,accept:boolean,version:number){
  requireId(id); const account=await requireRole('customer');
  if(!Number.isInteger(version)||version<1)throw new OperationError('invalid_version',400,'Geçersiz karar sürümü.');
  const {data,error}=await adminSupabase().rpc('stage10_customer_decide_additional_cost',{p_id:id,p_customer_id:account.id,p_accept:accept,p_expected_version:version});
  if(error)failStage10Db(error,'Ek maliyet kararı'); return {status:data};
}

export async function customerOperationContract(requestId:string){
  requireId(requestId); const account=await requireRole('customer');
  const {data,error}=await adminSupabase().rpc('stage10_operation_contract',{p_request_id:requestId,p_actor_id:account.id});
  if(error)failStage10Db(error,'Operasyon durumu'); return data as {stage:string;assignmentSource:string|null;appointmentState:string|null;terminal:boolean;adminInterventionRequired:boolean;effectiveTotal:number|null;currency:string;permissions:Record<string,boolean>};
}
