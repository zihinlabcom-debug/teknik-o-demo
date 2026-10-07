import 'server-only';
import {adminSupabase} from './account-supabase';
import {OperationError} from './operation-error';
import {requireRole,requireId,failDb} from './operation-guard';

export async function adminRequestList(){
  await requireRole('admin'); const db=adminSupabase();
  const {data,error}=await db.from('service_requests').select('id,customer_id,category_id,status,created_at').order('created_at',{ascending:false}).limit(200);
  if(error)failDb(error,'Admin talepleri');
  const userIds=[...new Set((data??[]).map(r=>r.customer_id).filter(Boolean))], categoryIds=[...new Set((data??[]).map(r=>r.category_id).filter(Boolean))], requestIds=(data??[]).map(r=>r.id);
  const [{data:users},{data:cats},{data:quotes},{data:jobs}]=await Promise.all([
    userIds.length?db.from('users').select('id,name,is_test').in('id',userIds):Promise.resolve({data:[]}),
    categoryIds.length?db.from('service_categories').select('id,name').in('id',categoryIds):Promise.resolve({data:[]}),
    requestIds.length?db.from('service_quotes').select('service_request_id,status,total_amount,currency').in('service_request_id',requestIds).eq('status','accepted'):Promise.resolve({data:[]}),
    requestIds.length?db.from('service_jobs').select('service_request_id,technician_id,status').in('service_request_id',requestIds):Promise.resolve({data:[]}),
  ]);
  return (data??[]).map(r=>({...r,customer:(users??[]).find(u=>u.id===r.customer_id)??null,category:(cats??[]).find(c=>c.id===r.category_id)??null,quote:(quotes??[]).find(q=>q.service_request_id===r.id)??null,job:(jobs??[]).find(j=>j.service_request_id===r.id)??null}));
}

export async function adminRequestDetail(id:string){
  requireId(id); await requireRole('admin'); const db=adminSupabase();
  const {data:request,error}=await db.from('service_requests').select('id,customer_id,category_id,status,created_at,problem_description,assessment_snapshot').eq('id',id).maybeSingle();
  if(error)failDb(error,'Talep detayı'); if(!request)throw new OperationError('not_found',404,'Talep bulunamadı.');

  const [
    {data:customer},
    {data:category},
    {data:dispatches},
    {data:jobs},
    {data:quotes},
    {data:events},
    {data:cycles},
    {data:exclusions},
  ]=await Promise.all([
    request.customer_id?db.from('users').select('id,name,is_test').eq('id',request.customer_id).maybeSingle():Promise.resolve({data:null}),
    request.category_id?db.from('service_categories').select('id,name').eq('id',request.category_id).maybeSingle():Promise.resolve({data:null}),
    db.from('service_dispatches').select('id,status,quote_id,distribution_cycle_id,round_no,expires_at,created_at,closed_at').eq('service_request_id',id).order('created_at',{ascending:false}),
    db.from('service_jobs').select('id,status,technician_id,assigned_at,started_at,completed_at,cancelled_at,accepted_quote_id').eq('service_request_id',id).order('created_at',{ascending:false}),
    db.from('service_quotes').select('id,status,version,total_amount,currency,offered_at,accepted_at').eq('service_request_id',id).order('version',{ascending:false}),
    db.from('operational_events').select('id,event_type,occurred_at').eq('service_request_id',id).order('occurred_at',{ascending:false}).limit(100),
    db.from('service_distribution_cycles').select('id,status,current_round,next_round_at,source_job_id,started_at,closed_at').eq('service_request_id',id).order('started_at',{ascending:false}),
    db.from('service_request_technician_exclusions').select('technician_id,reason,source_job_id,created_at').eq('service_request_id',id).order('created_at',{ascending:false}),
  ]);

  const jobIds=(jobs??[]).map(job=>job.id);
  const technicianIds=[
    ...new Set(
      [
        ...(jobs??[]).map(job=>job.technician_id),
        ...(exclusions??[]).map(item=>item.technician_id),
      ].filter(Boolean)
    ),
  ];

  const [{data:appointments},{data:technicians}]=await Promise.all([
    jobIds.length
      ?db.from('service_appointments')
        .select('id,job_id,status,starts_at,ends_at')
        .in('job_id',jobIds)
        .order('starts_at',{ascending:true})
      :Promise.resolve({data:[]}),

    technicianIds.length
      ?db.from('users')
        .select('id,name')
        .in('id',technicianIds)
      :Promise.resolve({data:[]}),
  ]);

  return {
    ...request,
    customer,
    category,
    dispatches:dispatches??[],
    jobs:(jobs??[]).map(job=>({
      ...job,
      technician:(technicians??[]).find(item=>item.id===job.technician_id)??null,
      appointments:(appointments??[]).filter(item=>item.job_id===job.id),
    })),
    quotes:quotes??[],
    events:events??[],
    cycles:cycles??[],
    exclusions:(exclusions??[]).map(item=>({
      ...item,
      technician:(technicians??[]).find(technician=>technician.id===item.technician_id)??null,
    })),
  };
}