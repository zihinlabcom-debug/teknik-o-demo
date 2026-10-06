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
