import 'server-only';
import {createHash} from 'node:crypto';
import {adminSupabase} from '@/lib/account-supabase';
import {decodeConversationState} from '@/lib/service-conversation';
import {serviceRequestSummary} from '@/lib/service-request-summary';
import {serviceRequestAssessment} from '@/lib/service-request-assessment';
import {acceptedMaximumPrice} from '@/lib/service-request-accepted-price';
import {OperationError} from '@/lib/operation-error';
import {requireRole,requireId,failDb} from '@/lib/operation-guard';
export {OperationError,operationErrorResponse} from '@/lib/operation-error';
export {adminRequestList,adminRequestDetail} from '@/lib/admin-request-read';

type RequestedServiceMode='immediate'|'scheduled';
const DATE_SELECTABLE_CATEGORIES=new Set<string>(['painting','cleaning','sofa_cleaning','carpet_cleaning']);
const ISTANBUL_DATE_FORMATTER=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'});
function istanbulCalendarDate(offsetDays:number){
  const parts=Object.fromEntries(ISTANBUL_DATE_FORMATTER.formatToParts(new Date())
    .filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  return new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)+offsetDays)).toISOString().slice(0,10);
}
function isStrictIsoDate(value:string){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(!match)return false;
  const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
  return date.getUTCFullYear()===Number(match[1])&&date.getUTCMonth()===Number(match[2])-1&&date.getUTCDate()===Number(match[3]);
}

export async function createCustomerServiceRequest(input:{
  conversationToken:string;
  requestedServiceMode?:RequestedServiceMode;
  requestedServiceDate?:string|null;
}){
  const account=await requireRole('customer'); const db=adminSupabase();
  const token=input.conversationToken.trim();
  if(!token||token.length>250000)throw new OperationError('invalid_conversation',400,'Geçersiz hizmet değerlendirmesi.');

  let conversation:ReturnType<typeof decodeConversationState>;
  try{conversation=decodeConversationState(token);}catch{throw new OperationError('invalid_conversation',400,'Hizmet değerlendirmesi doğrulanamadı.');}
  if(conversation?.customerId!==account.id)
    throw new OperationError('conversation_owner_mismatch',403,'Bu hizmet değerlendirmesi mevcut müşteri hesabına ait değil.');
  const category=conversation.category,final=conversation.lastResponse;
  if(!category||!final||final.assessmentComplete!==true)
    throw new OperationError('assessment_required',409,'Hizmet değerlendirmesi henüz tamamlanmadı.');
  const routeable=final.canRouteTechnician===true||(category==='painting'&&final.assessmentComplete===true);
  if(!routeable)throw new OperationError('routing_unavailable',409,'Bu değerlendirme için henüz usta talebi oluşturulamaz.');

  const categoryMap:Record<string,string>={boiler:'boiler',painting:'painting',cleaning:'cleaning',sofa_cleaning:'upholstery_carpet',carpet_cleaning:'upholstery_carpet'};
  const categoryCode=categoryMap[category];
  if(!categoryCode)throw new OperationError('category_unavailable',409,'Bu hizmet kategorisi henüz talep oluşturmaya açık değil.');

  const requestedServiceMode=input.requestedServiceMode??'immediate';
  const requestedServiceDate=(input.requestedServiceDate??'').trim()||null;
  if(requestedServiceMode!=='immediate'&&requestedServiceMode!=='scheduled')
    throw new OperationError('invalid_service_mode',400,'Geçersiz hizmet zamanı seçimi.');

  if(requestedServiceMode==='scheduled'){
    if(!DATE_SELECTABLE_CATEGORIES.has(category))
      throw new OperationError('scheduled_service_unavailable',409,'Bu hizmet için tarih seçilemez.');
    const minDate=istanbulCalendarDate(1),maxDate=istanbulCalendarDate(7);
    if(!requestedServiceDate||!isStrictIsoDate(requestedServiceDate)||requestedServiceDate<minDate||requestedServiceDate>maxDate)
      throw new OperationError('invalid_service_date',400,'Hizmet tarihi yarından başlayarak en fazla 7 gün sonrası için seçilebilir.');
  }else if(requestedServiceDate){
    throw new OperationError('invalid_service_date',400,'Hemen talebinde hizmet tarihi gönderilemez.');
  }

  const fingerprint=createHash('sha256').update(token).digest('hex');
  const requestKey=`conversation:${fingerprint}`;
  const pricingReference=`conversation-sha256:${fingerprint}`;
  const {issueTitle,problemDescription}=serviceRequestSummary(conversation);
  const assessmentSnapshot=serviceRequestAssessment(conversation);
  if(!assessmentSnapshot)throw new OperationError('assessment_required',409,'Hizmet değerlendirmesi henüz tamamlanmadı.');
  const acceptedPrice=acceptedMaximumPrice(conversation);
  if((final.resultState==='priced'||final.isReadyForPrice===true)&&!acceptedPrice)
    throw new OperationError('pricing_unavailable',409,'Doğrulanmış maksimum fiyat bulunamadı.');

  const {data:addresses,error:addressError}=await db.from('customer_addresses')
    .select('id,is_default,created_at').eq('customer_id',account.id).order('is_default',{ascending:false}).order('created_at',{ascending:true}).limit(10);
  if(addressError)failDb(addressError,'Adres kontrolü');
  const defaultAddress=(addresses??[]).find(a=>a.is_default)??((addresses??[]).length===1?addresses![0]:null);
  if(!defaultAddress)throw new OperationError('address_required',409,'Hizmet talebi için kayıtlı bir varsayılan adres gerekli.');

  const args={
    p_customer_id:account.id,p_category_code:categoryCode,p_address_id:defaultAddress.id,
    p_issue_title:issueTitle,p_problem_description:problemDescription,p_pricing_reference:pricingReference,p_request_key:requestKey,
    p_assessment_snapshot:assessmentSnapshot,p_requested_service_mode:requestedServiceMode,p_requested_service_date:requestedServiceDate,
  };
  const {data,error}=acceptedPrice?await db.rpc('create_priced_service_request',{
    ...args,p_currency:acceptedPrice.currency,p_subtotal:acceptedPrice.subtotal,
    p_service_fee:acceptedPrice.serviceFee,p_total_amount:acceptedPrice.totalAmount,
    p_breakdown:acceptedPrice.breakdown,
  }):await db.rpc('create_service_request',args);
  if(error&&/existing request schedule mismatch/i.test(error.message??''))
    throw new OperationError('request_schedule_conflict',409,'Bu değerlendirme için daha önce farklı bir zaman tercihiyle talep oluşturuldu.');
  if(error)failDb(error,'Hizmet talebi');
  return acceptedPrice?data as {id:string;quoteId:string;totalAmount:number;currency:'TRY'}:{id:data as string};
}
export async function acceptCustomerQuote(quoteId:string){
  requireId(quoteId); const account=await requireRole('customer'); const db=adminSupabase();
  const {data,error}=await db.rpc('accept_service_quote',{p_quote_id:quoteId,p_customer_id:account.id});
  if(error)failDb(error,'Teklif kabulü'); return {id:data};
}
export async function acceptTechnicianDispatch(dispatchId:string){
  requireId(dispatchId); const account=await requireRole('technician'); const db=adminSupabase();
  const key=`dispatch:${dispatchId}:${account.id}`;
  const {data,error}=await db.rpc('accept_service_dispatch',{p_dispatch_id:dispatchId,p_technician_id:account.id,p_idempotency_key:key});
  if(error)failDb(error,'İş kabulü'); return {id:data};
}
export async function startTechnicianJob(jobId:string){
  requireId(jobId); const account=await requireRole('technician'); const db=adminSupabase();
  const {data,error}=await db.rpc('start_service_job',{p_job_id:jobId,p_technician_id:account.id});
  if(error)failDb(error,'İş başlatma'); return {id:data};
}
export async function completeTechnicianJob(jobId:string){
  requireId(jobId); const account=await requireRole('technician'); const db=adminSupabase();
  const {data,error}=await db.rpc('complete_service_job',{p_job_id:jobId,p_technician_id:account.id});
  if(error)failDb(error,'İş tamamlama'); return {id:data};
}

export async function customerRequestList(){
  const account=await requireRole('customer'); const db=adminSupabase();
  const {data:requests,error}=await db.from('service_requests').select('id,status,created_at,category_id').eq('customer_id',account.id).order('created_at',{ascending:false});
  if(error)failDb(error,'Talep listesi');
  const ids=(requests??[]).map(r=>r.id), categoryIds=[...new Set((requests??[]).map(r=>r.category_id).filter(Boolean))];
  const [{data:quotes},{data:cats}]=await Promise.all([
    ids.length?db.from('service_quotes').select('service_request_id,status,total_amount,currency,version,accepted_at,offered_at').in('service_request_id',ids):Promise.resolve({data:[]}),
    categoryIds.length?db.from('service_categories').select('id,name').in('id',categoryIds):Promise.resolve({data:[]}),
  ]);
  const catMap=new Map((cats??[]).map(c=>[c.id,c.name]));
  return (requests??[]).map(r=>{
    const rq=(quotes??[]).filter(q=>q.service_request_id===r.id).sort((a,b)=>b.version-a.version);
    const price=rq.find(q=>q.status==='accepted')??rq.find(q=>q.status==='offered')??null;
    return {...r,category_name:r.category_id?catMap.get(r.category_id)??'Hizmet':'Hizmet',price};
  });
}

export async function customerRequestDetail(id:string){
  requireId(id); const account=await requireRole('customer'); const db=adminSupabase();
  const {data:r,error}=await db.from('service_requests').select('id,status,created_at,category_id,address_id,customer_id').eq('id',id).eq('customer_id',account.id).maybeSingle();
  if(error)failDb(error,'Talep detayı'); if(!r)throw new OperationError('not_found',404,'Talep bulunamadı.');
  const [{data:quotes},{data:jobs},{data:category},{data:address},{data:events}]=await Promise.all([
    db.from('service_quotes').select('id,status,total_amount,currency,version,accepted_at,offered_at,expires_at').eq('service_request_id',id).order('version',{ascending:false}),
    db.from('service_jobs').select('id,status,technician_id,assigned_at,started_at,completed_at,cancelled_at').eq('service_request_id',id).order('created_at',{ascending:false}),
    r.category_id?db.from('service_categories').select('name').eq('id',r.category_id).maybeSingle():Promise.resolve({data:null}),
    r.address_id?db.from('customer_addresses').select('address_line,label,city_id,district_id').eq('id',r.address_id).maybeSingle():Promise.resolve({data:null}),
    db.from('operational_events').select('id,event_type,occurred_at').eq('service_request_id',id).order('occurred_at',{ascending:false}).limit(30),
  ]);
  const job=jobs?.[0]??null; let technician=null;
  if(job?.technician_id){technician=(await db.from('users').select('name').eq('id',job.technician_id).maybeSingle()).data;}
  const appointments=job?(await db.from('service_appointments').select('id,status,starts_at,ends_at').eq('job_id',job.id).order('starts_at')).data??[]:[];
  return {...r,category_name:category?.name??'Hizmet',address,quotes:quotes??[],job,technician,appointments,events:events??[]};
}

export async function technicianOffers(){
  const account=await requireRole('technician'); const db=adminSupabase();
  const {data:cands,error}=await db.from('service_dispatch_candidates').select('dispatch_id,offered_at').eq('technician_id',account.id).eq('status','offered').order('offered_at',{ascending:false});
  if(error)failDb(error,'Yeni işler'); const dispatchIds=(cands??[]).map(c=>c.dispatch_id); if(!dispatchIds.length)return [];
  const {data:dispatches}=await db.from('service_dispatches').select('id,service_request_id,quote_id,status').in('id',dispatchIds).in('status',['pending','broadcasting']);
  const requestIds=(dispatches??[]).map(d=>d.service_request_id), quoteIds=(dispatches??[]).map(d=>d.quote_id).filter(Boolean);
  const [{data:reqs},{data:quotes}]=await Promise.all([
    requestIds.length?db.from('service_requests').select('id,category_id,address_id,created_at').in('id',requestIds):Promise.resolve({data:[]}),
    quoteIds.length?db.from('service_quotes').select('id,total_amount,currency,status').in('id',quoteIds):Promise.resolve({data:[]}),
  ]);
  return (dispatches??[]).map(d=>({...d,request:(reqs??[]).find(r=>r.id===d.service_request_id)??null,quote:(quotes??[]).find(q=>q.id===d.quote_id)??null})).filter(x=>x.quote?.status==='accepted');
}

export async function technicianActiveJobs(){
  const account=await requireRole('technician'); const db=adminSupabase();
  const {data,error}=await db.from('service_jobs').select('id,service_request_id,status,accepted_quote_id,assigned_at,started_at').eq('technician_id',account.id).in('status',['assigned','in_progress']).order('assigned_at',{ascending:false});
  if(error)failDb(error,'Aktif işler'); const quoteIds=(data??[]).map(j=>j.accepted_quote_id).filter(Boolean);
  const {data:quotes}=quoteIds.length?await db.from('service_quotes').select('id,total_amount,currency').in('id',quoteIds):{data:[]};
  return (data??[]).map(j=>({...j,quote:(quotes??[]).find(q=>q.id===j.accepted_quote_id)??null}));
}

export async function technicianJobDetail(id:string){
  requireId(id); const account=await requireRole('technician'); const db=adminSupabase();
  const {data:job,error}=await db.from('service_jobs').select('id,service_request_id,dispatch_id,accepted_quote_id,technician_id,status,assigned_at,started_at,completed_at,cancelled_at').eq('id',id).eq('technician_id',account.id).maybeSingle();
  if(error)failDb(error,'İş detayı'); if(!job)throw new OperationError('not_found',404,'İş bulunamadı.');
  const [{data:req},{data:quote},{data:appointments}]=await Promise.all([
    db.from('service_requests').select('id,category_id,address_id').eq('id',job.service_request_id).maybeSingle(),
    db.from('service_quotes').select('id,total_amount,currency,status').eq('id',job.accepted_quote_id).maybeSingle(),
    db.from('service_appointments').select('id,status,starts_at,ends_at').eq('job_id',job.id).order('starts_at'),
  ]);
  let category=null,address=null;
  if(req?.category_id)category=(await db.from('service_categories').select('name').eq('id',req.category_id).maybeSingle()).data;
  if(req?.address_id)address=(await db.from('customer_addresses').select('address_line,label,city_id,district_id').eq('id',req.address_id).maybeSingle()).data;
  return {...job,request:req,quote,category,address,appointments:appointments??[]};
}
