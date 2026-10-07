import 'server-only';
import {adminSupabase} from '@/lib/account-supabase';
import {OperationError} from '@/lib/operation-error';
import {requireRole,requireId,failDb} from '@/lib/operation-guard';

export {OperationError,operationErrorResponse} from '@/lib/operation-error';

export async function acceptTechnicianDispatch(dispatchId:string){
  requireId(dispatchId);
  const account=await requireRole('technician');
  const db=adminSupabase();

  const key=`dispatch:${dispatchId}:${account.id}`;

  const {data,error}=await db.rpc('accept_service_dispatch',{
    p_dispatch_id:dispatchId,
    p_technician_id:account.id,
    p_idempotency_key:key,
  });

  if(error)failDb(error,'İş kabulü');
  return {id:data};
}

export async function startTechnicianJob(jobId:string){
  requireId(jobId);
  const account=await requireRole('technician');
  const db=adminSupabase();

  const {data,error}=await db.rpc('start_service_job',{
    p_job_id:jobId,
    p_technician_id:account.id,
  });

  if(error)failDb(error,'İş başlatma');
  return {id:data};
}

export async function completeTechnicianJob(jobId:string){
  requireId(jobId);
  const account=await requireRole('technician');
  const db=adminSupabase();

  const {data,error}=await db.rpc('complete_service_job',{
    p_job_id:jobId,
    p_technician_id:account.id,
  });

  if(error)failDb(error,'İş tamamlama');
  return {id:data};
}

type AppointmentDbError={message?:string}|null;

function failAppointmentDb(error:AppointmentDbError):never{
  const raw=error?.message??'';

  if(/Technician is not assigned to this job/i.test(raw))
    throw new OperationError('forbidden',403,'Bu iş size atanmış değil.');

  if(/Technician account is not active/i.test(raw))
    throw new OperationError('invalid_state',409,'Usta hesabı aktif değil.');

  if(/Active appointment already exists for this job/i.test(raw))
    throw new OperationError('appointment_exists',409,'Bu iş için zaten aktif bir randevu var.');

  if(/Appointment scheduling window has expired/i.test(raw))
    throw new OperationError('appointment_window_expired',409,'Randevu belirleme süresi doldu.');

  if(/Appointment cannot start in the past/i.test(raw))
    throw new OperationError('invalid_appointment_time',409,'Randevu geçmiş bir saate verilemez.');

  if(/Appointment cannot start after 20:00/i.test(raw))
    throw new OperationError('invalid_appointment_time',409,'Randevu başlangıcı 20:00 sonrasında olamaz.');

  if(/Appointment date must match requested service date/i.test(raw))
    throw new OperationError('appointment_date_locked',409,'Randevu tarihi müşterinin seçtiği tarihle aynı olmalıdır.');

  if(/Immediate appointment must be within 24 hours of assignment/i.test(raw))
    throw new OperationError('appointment_out_of_window',409,'Hemen talebinde randevu atamadan sonraki 24 saat içinde olmalıdır.');

  if(/Job is not available for appointment scheduling/i.test(raw))
    throw new OperationError('invalid_state',409,'İş randevu oluşturulabilecek durumda değil.');

  if(/Immediate request cannot contain a requested service date|Invalid requested service mode/i.test(raw))
    throw new OperationError('invalid_state',409,'Hizmet talebinin randevu bilgileri geçerli değil.');

  if(/Job not found|Service request not found/i.test(raw))
    throw new OperationError('not_found',404,'Kayıt bulunamadı.');

  failDb(error,'Randevu oluşturma');
}

function normalizeAppointmentStart(value:unknown){
  if(
    typeof value!=='string'
    || value.length>64
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ){
    throw new OperationError(
      'invalid_appointment_time',
      400,
      'Geçerli bir randevu tarihi ve saati gerekli.'
    );
  }

  const parsed=new Date(value);

  if(Number.isNaN(parsed.getTime())){
    throw new OperationError(
      'invalid_appointment_time',
      400,
      'Geçerli bir randevu tarihi ve saati gerekli.'
    );
  }

  return parsed.toISOString();
}

export async function createTechnicianAppointment(jobId:string,startsAt:unknown){
  requireId(jobId);
  const account=await requireRole('technician');
  const normalizedStart=normalizeAppointmentStart(startsAt);
  const db=adminSupabase();

  const {data,error}=await db.rpc('create_service_appointment',{
    p_job_id:jobId,
    p_technician_id:account.id,
    p_starts_at:normalizedStart,
  });

  if(error)failAppointmentDb(error);

  return {id:data};
}
export async function technicianOffers(){
  const account=await requireRole('technician');
  const db=adminSupabase();

  const {data:cands,error}=await db
    .from('service_dispatch_candidates')
    .select('dispatch_id,offered_at')
    .eq('technician_id',account.id)
    .eq('status','offered')
    .order('offered_at',{ascending:false});

  if(error)failDb(error,'Yeni işler');

  const dispatchIds=(cands??[]).map(c=>c.dispatch_id);
  if(!dispatchIds.length)return [];

  const {data:dispatches}=await db
    .from('service_dispatches')
    .select('id,service_request_id,quote_id,status')
    .in('id',dispatchIds)
    .in('status',['pending','broadcasting']);

  const requestIds=(dispatches??[]).map(d=>d.service_request_id);
  const quoteIds=(dispatches??[]).map(d=>d.quote_id).filter(Boolean);

  const [{data:reqs},{data:quotes}]=await Promise.all([
    requestIds.length
      ?db.from('service_requests')
        .select('id,category_id,address_id,created_at')
        .in('id',requestIds)
      :Promise.resolve({data:[]}),

    quoteIds.length
      ?db.from('service_quotes')
        .select('id,total_amount,currency,status')
        .in('id',quoteIds)
      :Promise.resolve({data:[]}),
  ]);

  return (dispatches??[])
    .map(d=>({
      ...d,
      request:(reqs??[]).find(r=>r.id===d.service_request_id)??null,
      quote:(quotes??[]).find(q=>q.id===d.quote_id)??null,
    }))
    .filter(x=>x.quote?.status==='accepted');
}

export async function technicianActiveJobs(){
  const account=await requireRole('technician');
  const db=adminSupabase();

  const {data,error}=await db
    .from('service_jobs')
    .select('id,service_request_id,status,accepted_quote_id,assigned_at,started_at')
    .eq('technician_id',account.id)
    .in('status',['assigned','in_progress'])
    .order('assigned_at',{ascending:false});

  if(error)failDb(error,'Aktif işler');

  const quoteIds=(data??[])
    .map(j=>j.accepted_quote_id)
    .filter(Boolean);

  const {data:quotes}=quoteIds.length
    ?await db
      .from('service_quotes')
      .select('id,total_amount,currency')
      .in('id',quoteIds)
    :{data:[]};

  return (data??[]).map(j=>({
    ...j,
    quote:(quotes??[]).find(q=>q.id===j.accepted_quote_id)??null,
  }));
}

export async function technicianJobDetail(id:string){
  requireId(id);
  const account=await requireRole('technician');
  const db=adminSupabase();

  const {data:job,error}=await db
    .from('service_jobs')
    .select('id,service_request_id,dispatch_id,accepted_quote_id,technician_id,status,assigned_at,started_at,completed_at,cancelled_at')
    .eq('id',id)
    .eq('technician_id',account.id)
    .maybeSingle();

  if(error)failDb(error,'İş detayı');
  if(!job)throw new OperationError('not_found',404,'İş bulunamadı.');

  const [{data:req},{data:quote},{data:appointments}]=await Promise.all([
    db.from('service_requests')
      .select('id,category_id,address_id')
      .eq('id',job.service_request_id)
      .maybeSingle(),

    db.from('service_quotes')
      .select('id,total_amount,currency,status')
      .eq('id',job.accepted_quote_id)
      .maybeSingle(),

    db.from('service_appointments')
      .select('id,status,starts_at,ends_at')
      .eq('job_id',job.id)
      .order('starts_at'),
  ]);

  let category=null;
  let address=null;

  if(req?.category_id){
    category=(await db
      .from('service_categories')
      .select('name')
      .eq('id',req.category_id)
      .maybeSingle()).data;
  }

  if(req?.address_id){
    address=(await db
      .from('customer_addresses')
      .select('address_line,label,city_id,district_id')
      .eq('id',req.address_id)
      .maybeSingle()).data;
  }

  return {
    ...job,
    request:req,
    quote,
    category,
    address,
    appointments:appointments??[],
  };
}
