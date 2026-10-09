-- Stage 10: atomic case workflows and one shared operation contract.
begin;

create function public.stage10_active_role(p_user_id uuid,p_role text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.users where id=p_user_id and role=p_role and is_active)
$$;

create function public.stage10_has_new_operation_block(p_user_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.account_sanctions
    where subject_user_id=p_user_id and starts_at<=now()
      and (ends_at is null or ends_at>now())
      and sanction_type in ('restrict_new_operations','temporary_suspension','permanent_closure')
      and not exists(select 1 from public.account_sanction_corrections c where c.sanction_id=account_sanctions.id and c.action='revoked')
  )
$$;

create function public.stage10_guard_new_service_request() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if public.stage10_has_new_operation_block(new.customer_id) then
    raise exception 'Account cannot create new operations';
  end if;
  return new;
end $$;
create trigger stage10_service_request_sanction_guard before insert on public.service_requests
for each row execute function public.stage10_guard_new_service_request();

create function public.stage10_guard_new_service_job() returns trigger
language plpgsql security definer set search_path='' as $$ begin
  if public.stage10_has_new_operation_block(new.technician_id) then
    raise exception 'Technician cannot receive new operations';
  end if;
  return new;
end $$;
create trigger stage10_service_job_sanction_guard before insert on public.service_jobs
for each row execute function public.stage10_guard_new_service_job();

-- Every Stage 10 cancellation path closes the same active operation graph.
-- Historical accepted/completed rows remain untouched for auditability.
create function public.stage10_cancel_service_graph(
  p_request_id uuid,p_actor_id uuid,p_event_type text,p_entity_type text,p_entity_id uuid,p_reason text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_status text;
begin
  if p_event_type not in ('admin.service_cancelled','additional_cost.admin_cancelled')
     or p_reason is null or length(btrim(p_reason)) not between 10 and 1000 then
    raise exception 'Invalid service cancellation';
  end if;
  select status into v_status from public.service_requests where id=p_request_id for update;
  if not found then raise exception 'Service request not found'; end if;
  if v_status in ('completed','technician_unavailable') then raise exception 'Service is already closed'; end if;
  if v_status='cancelled' then return false; end if;
  update public.service_appointments set status='cancelled'
    where job_id in (select id from public.service_jobs where service_request_id=p_request_id and status in ('assigned','in_progress'))
      and status in ('scheduled','confirmed');
  update public.service_jobs set status='cancelled',cancelled_at=coalesce(cancelled_at,now())
    where service_request_id=p_request_id and status in ('assigned','in_progress');
  update public.service_dispatches set status='cancelled',closed_at=coalesce(closed_at,now())
    where service_request_id=p_request_id and status in ('pending','broadcasting');
  update public.service_distribution_cycles set status='cancelled',closed_at=coalesce(closed_at,now()),next_round_at=null
    where service_request_id=p_request_id and status='active';
  update public.service_requests set status='cancelled' where id=p_request_id;
  insert into public.operational_events(service_request_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(p_request_id,p_actor_id,p_event_type,p_entity_type,p_entity_id,jsonb_build_object('reason',btrim(p_reason)));
  return true;
end $$;

create function public.stage10_insert_evidence(
  p_parent_type text,p_parent_id uuid,p_uploader_id uuid,p_evidence jsonb
) returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer; v_item jsonb; v_kind text; v_size bigint; v_path text; v_mime text; v_name text;
begin
  if p_evidence is null then return 0; end if;
  if jsonb_typeof(p_evidence)<>'array' then raise exception 'Evidence must be an array'; end if;
  v_count:=jsonb_array_length(p_evidence);
  if (p_parent_type='complaint' and v_count>5) or v_count>10 then raise exception 'Evidence count limit exceeded'; end if;
  for v_item in select value from jsonb_array_elements(p_evidence) loop
    v_kind:=v_item->>'kind'; v_size:=(v_item->>'size')::bigint; v_path:=v_item->>'path';
    v_mime:=v_item->>'mime'; v_name:=v_item->>'name';
    if v_kind not in ('photo','video','document') or v_size is null or v_size<=0
       or (v_kind='video' and v_size>52428800)
       or (v_kind<>'video' and v_size>10485760)
       or v_path is null or v_path not like 'stage10/'||p_uploader_id::text||'/%'
       or v_name is null or length(v_name) not between 1 and 200 then
      raise exception 'Invalid evidence metadata';
    end if;
    insert into public.service_case_evidence(
      complaint_id,warranty_claim_id,additional_cost_request_id,uploader_user_id,
      evidence_kind,storage_path,original_file_name,mime_type,byte_size
    ) values(
      case when p_parent_type='complaint' then p_parent_id end,
      case when p_parent_type='warranty' then p_parent_id end,
      case when p_parent_type='additional_cost' then p_parent_id end,
      p_uploader_id,v_kind,v_path,v_name,v_mime,v_size
    );
  end loop;
  return v_count;
end $$;

-- A read-only, server-only gate used before accepting potentially large uploads.
-- Creation RPCs repeat every check under lock; this gate is never the final authority.
create function public.stage10_preflight_case_action(
  p_action text,p_actor_id uuid,p_request_id uuid default null,p_job_id uuid default null
) returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_role text;v_request_status text;v_completed timestamptz;v_class text;v_days integer;
  v_has_active_job boolean;v_has_active_cycle boolean;v_request_id uuid;
begin
  select role into v_role from public.users where id=p_actor_id and is_active;
  if v_role is null then raise exception 'Active account required';end if;
  if p_action='additional_cost' then
    if v_role<>'technician' or p_job_id is null then raise exception 'Technician is not eligible';end if;
    select j.service_request_id into v_request_id from public.service_jobs j
      join public.service_requests r on r.id=j.service_request_id
      where j.id=p_job_id and j.technician_id=p_actor_id and j.status in ('assigned','in_progress')
        and r.status not in ('completed','cancelled','technician_unavailable')
        and exists(select 1 from public.service_appointments a where a.job_id=j.id and a.status in ('scheduled','confirmed'))
        and exists(select 1 from public.service_quotes q where q.id=j.accepted_quote_id and q.status='accepted');
    if v_request_id is null then raise exception 'Additional cost upload is not available';end if;
    return true;
  elsif p_action='warranty' then
    if v_role<>'customer' or p_request_id is null or not exists(
      select 1 from public.service_requests where id=p_request_id and customer_id=p_actor_id
    ) then raise exception 'Customer does not own service';end if;
    select max(completed_at) into v_completed from public.service_jobs
      where service_request_id=p_request_id and status='completed';
    if v_completed is null then raise exception 'Completed service required';end if;
    select p.warranty_class into v_class from public.service_requests r
      join public.service_category_warranty_policies p on p.category_id=r.category_id where r.id=p_request_id;
    if v_class is null then raise exception 'Explicit warranty classification required';end if;
    v_days:=case when v_class='electronic_30' then 30 else 7 end;
    if now()>v_completed+make_interval(days=>v_days) then raise exception 'Warranty window expired';end if;
    return true;
  elsif p_action='complaint' then
    if v_role not in ('customer','technician') or p_request_id is null then raise exception 'Applicant is not eligible';end if;
    if not exists(select 1 from public.service_jobs where service_request_id=p_request_id) then raise exception 'Complaint requires assigned technician';end if;
    if v_role='customer' and not exists(select 1 from public.service_requests where id=p_request_id and customer_id=p_actor_id) then raise exception 'Applicant is not related to service';end if;
    if v_role='technician' and not exists(select 1 from public.service_jobs where service_request_id=p_request_id and technician_id=p_actor_id) then raise exception 'Applicant is not related to service';end if;
    select status into v_request_status from public.service_requests where id=p_request_id;
    select exists(select 1 from public.service_jobs where service_request_id=p_request_id and status in ('assigned','in_progress')) into v_has_active_job;
    select exists(select 1 from public.service_distribution_cycles where service_request_id=p_request_id and status='active') into v_has_active_cycle;
    select max(completed_at) into v_completed from public.service_jobs where service_request_id=p_request_id and status='completed';
    if v_completed is not null then
      if now()>v_completed+interval '7 days' then raise exception 'Complaint window expired';end if;
    elsif v_request_status in ('cancelled','technician_unavailable') or not(v_has_active_job or v_has_active_cycle) then
      raise exception 'Complaint is not available for a closed service without completion';
    end if;
    return true;
  end if;
  raise exception 'Invalid case action';
end $$;

create function public.stage10_create_additional_cost(
  p_job_id uuid,p_technician_id uuid,p_amount numeric,p_reason text,
  p_idempotency_key text,p_evidence jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_job public.service_jobs%rowtype; v_quote public.service_quotes%rowtype; v_id uuid; v_prior public.service_additional_cost_requests%rowtype;
begin
  if not public.stage10_active_role(p_technician_id,'technician') then raise exception 'Active technician required'; end if;
  if p_amount is null or p_amount<=0 or p_reason is null or length(btrim(p_reason)) not between 20 and 1000
     or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then raise exception 'Invalid additional cost request'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stage10:additional_cost:'||p_technician_id::text||':'||p_idempotency_key,0));
  select * into v_prior from public.service_additional_cost_requests where technician_id=p_technician_id and idempotency_key=p_idempotency_key;
  if found then
    if v_prior.job_id=p_job_id and v_prior.requested_amount=p_amount and v_prior.reason=btrim(p_reason) then return v_prior.id; end if;
    raise exception 'Idempotency key conflict';
  end if;
  select * into v_job from public.service_jobs where id=p_job_id for update;
  if not found or v_job.technician_id<>p_technician_id then raise exception 'Technician is not assigned to job'; end if;
  if v_job.status not in ('assigned','in_progress') then raise exception 'Job is closed'; end if;
  if not exists(select 1 from public.service_appointments where job_id=v_job.id and status in ('scheduled','confirmed')) then raise exception 'Active appointment required'; end if;
  select * into v_quote from public.service_quotes where id=v_job.accepted_quote_id and status='accepted';
  if not found then raise exception 'Accepted price snapshot required'; end if;
  insert into public.service_additional_cost_requests(service_request_id,job_id,technician_id,original_quote_id,original_total,requested_amount,reason,idempotency_key)
    values(v_job.service_request_id,v_job.id,p_technician_id,v_quote.id,v_quote.total_amount,p_amount,btrim(p_reason),p_idempotency_key) returning id into v_id;
  perform public.stage10_insert_evidence('additional_cost',v_id,p_technician_id,p_evidence);
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(v_job.service_request_id,v_job.id,p_technician_id,'additional_cost.created','additional_cost',v_id,jsonb_build_object('amount',p_amount));
  return v_id;
end $$;

create function public.stage10_admin_review_additional_cost(
  p_id uuid,p_admin_id uuid,p_approve boolean,p_reason text,p_expected_version integer
) returns text language plpgsql security definer set search_path='' as $$
declare v public.service_additional_cost_requests%rowtype; v_status text;
begin
  if not public.stage10_active_role(p_admin_id,'admin') then raise exception 'Active admin required'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 10 and 1000 then raise exception 'Reason required'; end if;
  select * into v from public.service_additional_cost_requests where id=p_id for update;
  if not found then raise exception 'Additional cost request not found'; end if;
  if v.status<>'pending_admin' or v.version<>p_expected_version then raise exception 'Additional cost decision conflict'; end if;
  if p_approve and not exists(
    select 1 from public.service_jobs j join public.service_requests r on r.id=j.service_request_id
    where j.id=v.job_id and j.status in ('assigned','in_progress') and r.status not in ('completed','cancelled','technician_unavailable')
  ) then raise exception 'Closed service cannot receive additional cost approval'; end if;
  v_status:=case when p_approve then 'pending_customer' else 'admin_rejected' end;
  update public.service_additional_cost_requests set status=v_status,admin_user_id=p_admin_id,admin_reason=btrim(p_reason),admin_decided_at=now(),version=version+1 where id=p_id;
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(v.service_request_id,v.job_id,p_admin_id,'additional_cost.admin_'||case when p_approve then 'approved' else 'rejected' end,'additional_cost',v.id,'{}');
  return v_status;
end $$;

create function public.stage10_customer_decide_additional_cost(
  p_id uuid,p_customer_id uuid,p_accept boolean,p_expected_version integer
) returns text language plpgsql security definer set search_path='' as $$
declare v public.service_additional_cost_requests%rowtype; v_status text; v_request_status text; v_job_status text; v_final numeric;
begin
  if not public.stage10_active_role(p_customer_id,'customer') then raise exception 'Active customer required'; end if;
  select a.* into v from public.service_additional_cost_requests a join public.service_requests r on r.id=a.service_request_id
    where a.id=p_id and r.customer_id=p_customer_id for update of a;
  if not found then raise exception 'Additional cost request not found'; end if;
  if v.status<>'pending_customer' or v.version<>p_expected_version then raise exception 'Additional cost decision conflict'; end if;
  -- Serialize every accepted increment for this service, not only this row.
  select status into v_request_status from public.service_requests where id=v.service_request_id for update;
  select status into v_job_status from public.service_jobs where id=v.job_id;
  if v_request_status in ('completed','cancelled','technician_unavailable') or v_job_status not in ('assigned','in_progress') then
    raise exception 'Closed service cannot change price';
  end if;
  v_status:=case when p_accept then 'customer_accepted' else 'customer_rejected' end;
  if p_accept then
    select v.original_total+coalesce(sum(requested_amount),0)+v.requested_amount into v_final
      from public.service_additional_cost_requests
      where service_request_id=v.service_request_id and status='customer_accepted';
  end if;
  update public.service_additional_cost_requests set status=v_status,customer_decided_at=now(),
    final_total=case when p_accept then v_final else null end,version=version+1 where id=p_id;
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(v.service_request_id,v.job_id,p_customer_id,'additional_cost.customer_'||case when p_accept then 'accepted' else 'rejected' end,'additional_cost',v.id,
      case when p_accept then jsonb_build_object('final_total',v_final) else '{}'::jsonb end);
  return v_status;
end $$;

create function public.stage10_admin_resolve_rejected_cost(
  p_id uuid,p_admin_id uuid,p_continue boolean,p_reason text,p_expected_version integer
) returns text language plpgsql security definer set search_path='' as $$
declare v public.service_additional_cost_requests%rowtype; v_status text;
begin
  if not public.stage10_active_role(p_admin_id,'admin') then raise exception 'Active admin required'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 10 and 1000 then raise exception 'Reason required'; end if;
  select * into v from public.service_additional_cost_requests where id=p_id for update;
  if not found or v.status<>'customer_rejected' or v.version<>p_expected_version then raise exception 'Additional cost resolution conflict'; end if;
  v_status:=case when p_continue then 'admin_continue' else 'admin_cancelled' end;
  update public.service_additional_cost_requests set status=v_status,admin_user_id=p_admin_id,admin_reason=btrim(p_reason),admin_decided_at=now(),version=version+1 where id=p_id;
  if not p_continue then
    perform public.stage10_cancel_service_graph(v.service_request_id,p_admin_id,'additional_cost.admin_cancelled','additional_cost',v.id,p_reason);
  else
    insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
      values(v.service_request_id,v.job_id,p_admin_id,'additional_cost.admin_continued','additional_cost',v.id,jsonb_build_object('reason',btrim(p_reason)));
  end if;
  return v_status;
end $$;

create function public.stage10_create_complaint(
  p_request_id uuid,p_applicant_id uuid,p_description text,p_idempotency_key text,p_evidence jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_role text; v_completed timestamptz; v_request_status text; v_has_active_job boolean; v_has_active_cycle boolean;
  v_related_job uuid; v_id uuid; v_prior public.service_complaints%rowtype;
begin
  select role into v_role from public.users where id=p_applicant_id and is_active;
  if v_role not in ('customer','technician') then raise exception 'Applicant is not eligible'; end if;
  if p_description is null or length(btrim(p_description)) not between 20 and 1000
     or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then raise exception 'Invalid complaint'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stage10:complaint:'||p_applicant_id::text||':'||p_idempotency_key,0));
  select * into v_prior from public.service_complaints where applicant_user_id=p_applicant_id and idempotency_key=p_idempotency_key;
  if found then
    if v_prior.service_request_id=p_request_id and v_prior.description=btrim(p_description) then return v_prior.id; end if;
    raise exception 'Idempotency key conflict';
  end if;
  if not exists(select 1 from public.service_jobs where service_request_id=p_request_id) then raise exception 'Complaint requires assigned technician'; end if;
  if v_role='customer' and not exists(select 1 from public.service_requests where id=p_request_id and customer_id=p_applicant_id) then raise exception 'Applicant is not related to service'; end if;
  if v_role='technician' and not exists(select 1 from public.service_jobs where service_request_id=p_request_id and technician_id=p_applicant_id) then raise exception 'Applicant is not related to service'; end if;
  if v_role='technician' then
    select id into v_related_job from public.service_jobs
      where service_request_id=p_request_id and technician_id=p_applicant_id
      order by (status in ('assigned','in_progress')) desc,coalesce(completed_at,cancelled_at,assigned_at,created_at) desc limit 1;
  else
    select id into v_related_job from public.service_jobs where service_request_id=p_request_id
      order by (status in ('assigned','in_progress')) desc,coalesce(completed_at,cancelled_at,assigned_at,created_at) desc limit 1;
  end if;
  select status into v_request_status from public.service_requests where id=p_request_id;
  select exists(select 1 from public.service_jobs where service_request_id=p_request_id and status in ('assigned','in_progress')) into v_has_active_job;
  select exists(select 1 from public.service_distribution_cycles where service_request_id=p_request_id and status='active') into v_has_active_cycle;
  select max(completed_at) into v_completed from public.service_jobs where service_request_id=p_request_id and status='completed';
  if v_completed is not null then
    if now()>v_completed+interval '7 days' then raise exception 'Complaint window expired'; end if;
  elsif v_request_status in ('cancelled','technician_unavailable') or not (v_has_active_job or v_has_active_cycle) then
    raise exception 'Complaint is not available for a closed service without completion';
  end if;
  insert into public.service_complaints(service_request_id,related_job_id,applicant_user_id,applicant_role,description,idempotency_key)
    values(p_request_id,v_related_job,p_applicant_id,v_role,btrim(p_description),p_idempotency_key) returning id into v_id;
  perform public.stage10_insert_evidence('complaint',v_id,p_applicant_id,p_evidence);
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(p_request_id,v_related_job,p_applicant_id,'complaint.created','complaint',v_id,jsonb_build_object('applicant_role',v_role));
  return v_id;
end $$;

create function public.stage10_admin_request_complaint_info(p_id uuid,p_admin_id uuid,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid; begin
  if not public.stage10_active_role(p_admin_id,'admin') or p_message is null or length(btrim(p_message)) not between 10 and 1000 then raise exception 'Invalid information request'; end if;
  if not exists(select 1 from public.service_complaints where id=p_id and status='under_review') then raise exception 'Complaint is not open'; end if;
  insert into public.complaint_information_requests(complaint_id,admin_user_id,message) values(p_id,p_admin_id,btrim(p_message)) returning id into v_id;
  return v_id;
end $$;

create function public.stage10_admin_decide_complaint(
  p_id uuid,p_admin_id uuid,p_final_category text,p_decision text,p_reason text,
  p_subject_user_id uuid default null,p_sanction_ends_at timestamptz default null,p_expected_version integer default 1
) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.service_complaints%rowtype; v_decision_id uuid;
begin
  if not public.stage10_active_role(p_admin_id,'admin') then raise exception 'Active admin required'; end if;
  if p_final_category is null or length(btrim(p_final_category)) not between 2 and 100
     or p_reason is null or length(btrim(p_reason)) not between 20 and 2000
     or p_decision not in ('no_action','warning','restrict_new_operations','temporary_suspension','permanent_closure','finance_review') then raise exception 'Invalid complaint decision'; end if;
  select * into v from public.service_complaints where id=p_id for update;
  if not found or v.status<>'under_review' or v.version<>p_expected_version then raise exception 'Complaint decision conflict'; end if;
  if p_decision<>'no_action' and (p_subject_user_id is null or not exists(
    select 1 from public.service_requests r where r.id=v.service_request_id and r.customer_id=p_subject_user_id
    union all
    select 1 from public.service_jobs j where j.service_request_id=v.service_request_id and j.technician_id=p_subject_user_id
  )) then raise exception 'Sanction subject must be related to complaint service'; end if;
  if p_decision='temporary_suspension' and (p_sanction_ends_at is null or p_sanction_ends_at<=now()) then raise exception 'Suspension end required'; end if;
  insert into public.complaint_decisions(complaint_id,admin_user_id,final_category,decision,reason)
    values(v.id,p_admin_id,btrim(p_final_category),p_decision,btrim(p_reason)) returning id into v_decision_id;
  if p_decision<>'no_action' then
    insert into public.account_sanctions(subject_user_id,complaint_decision_id,sanction_type,ends_at,created_by)
      values(p_subject_user_id,v_decision_id,p_decision,case when p_decision='temporary_suspension' then p_sanction_ends_at end,p_admin_id);
  end if;
  update public.service_complaints set status='resolved',resolved_at=now(),retain_until=now()+interval '5 years',version=version+1 where id=v.id;
  insert into public.operational_events(service_request_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(v.service_request_id,p_admin_id,'complaint.resolved','complaint',v.id,jsonb_build_object('decision_id',v_decision_id));
  return v_decision_id;
end $$;

create function public.stage10_admin_correct_complaint_decision(
  p_complaint_id uuid,p_admin_id uuid,p_correction_text text,p_revoke_sanction boolean default false
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_decision public.complaint_decisions%rowtype; v_correction_id uuid; v_sanction uuid;
begin
  if not public.stage10_active_role(p_admin_id,'admin') then raise exception 'Active admin required'; end if;
  if p_correction_text is null or length(btrim(p_correction_text)) not between 20 and 2000 then raise exception 'Correction reason required'; end if;
  select d.* into v_decision from public.complaint_decisions d
    join public.service_complaints c on c.id=d.complaint_id
    where d.complaint_id=p_complaint_id and c.status='resolved';
  if not found then raise exception 'Resolved complaint decision required'; end if;
  insert into public.complaint_decision_corrections(decision_id,admin_user_id,correction_text)
    values(v_decision.id,p_admin_id,btrim(p_correction_text)) returning id into v_correction_id;
  if p_revoke_sanction then
    select id into v_sanction from public.account_sanctions where complaint_decision_id=v_decision.id;
    if v_sanction is null then raise exception 'Decision has no sanction to revoke'; end if;
    insert into public.account_sanction_corrections(sanction_id,admin_user_id,action,reason)
      values(v_sanction,p_admin_id,'revoked',btrim(p_correction_text));
  end if;
  insert into public.operational_events(service_request_id,actor_user_id,event_type,entity_type,entity_id,payload)
    select c.service_request_id,p_admin_id,'complaint.decision_corrected','complaint',c.id,
      jsonb_build_object('correction_id',v_correction_id,'sanction_revoked',p_revoke_sanction)
    from public.service_complaints c where c.id=p_complaint_id;
  return v_correction_id;
end $$;

create function public.stage10_create_warranty_claim(
  p_request_id uuid,p_customer_id uuid,p_description text,p_idempotency_key text,p_evidence jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_job public.service_jobs%rowtype; v_class text; v_days integer; v_id uuid; v_count integer; v_prior public.service_warranty_claims%rowtype;
begin
  if not public.stage10_active_role(p_customer_id,'customer') or p_description is null or length(btrim(p_description)) not between 20 and 1000
     or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then raise exception 'Invalid warranty claim'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stage10:warranty:'||p_customer_id::text||':'||p_idempotency_key,0));
  select * into v_prior from public.service_warranty_claims where customer_id=p_customer_id and idempotency_key=p_idempotency_key;
  if found then
    if v_prior.service_request_id=p_request_id and v_prior.description=btrim(p_description) then return v_prior.id; end if;
    raise exception 'Idempotency key conflict';
  end if;
  if not exists(select 1 from public.service_requests where id=p_request_id and customer_id=p_customer_id) then raise exception 'Customer does not own service'; end if;
  select * into v_job from public.service_jobs where service_request_id=p_request_id and status='completed' order by completed_at desc limit 1;
  if not found or v_job.completed_at is null then raise exception 'Completed service required'; end if;
  select p.warranty_class into v_class from public.service_requests r join public.service_category_warranty_policies p on p.category_id=r.category_id where r.id=p_request_id;
  if v_class is null then raise exception 'Explicit warranty classification required'; end if;
  v_days:=case when v_class='electronic_30' then 30 else 7 end;
  if now()>v_job.completed_at+make_interval(days=>v_days) then raise exception 'Warranty window expired'; end if;
  if p_evidence is null or jsonb_typeof(p_evidence)<>'array' or jsonb_array_length(p_evidence)<1
     or exists(select 1 from jsonb_array_elements(p_evidence) x where x->>'kind' not in ('photo','video')) then raise exception 'Photo or video evidence required'; end if;
  insert into public.service_warranty_claims(service_request_id,customer_id,original_job_id,warranty_class,warranty_days,service_completed_at,description,idempotency_key)
    values(p_request_id,p_customer_id,v_job.id,v_class,v_days,v_job.completed_at,btrim(p_description),p_idempotency_key) returning id into v_id;
  v_count:=public.stage10_insert_evidence('warranty',v_id,p_customer_id,p_evidence);
  if v_count<1 then raise exception 'Photo or video evidence required'; end if;
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(p_request_id,v_job.id,p_customer_id,'warranty.created','warranty_claim',v_id,jsonb_build_object('warranty_days',v_days));
  return v_id;
end $$;

create function public.stage10_admin_decide_warranty(
  p_id uuid,p_admin_id uuid,p_accept boolean,p_customer_reason text,p_internal_reason text,p_expected_version integer
) returns text language plpgsql security definer set search_path='' as $$
declare v public.service_warranty_claims%rowtype; v_status text;
begin
  if not public.stage10_active_role(p_admin_id,'admin') then raise exception 'Active admin required'; end if;
  if p_customer_reason is null or length(btrim(p_customer_reason)) not between 10 and 1000
     or p_internal_reason is null or length(btrim(p_internal_reason)) not between 10 and 2000 then raise exception 'Reasoned warranty decision required'; end if;
  select * into v from public.service_warranty_claims where id=p_id for update;
  if not found or v.status<>'under_review' or v.version<>p_expected_version then raise exception 'Warranty decision conflict'; end if;
  v_status:=case when p_accept then 'correction_pending' else 'rejected' end;
  update public.service_warranty_claims set status=v_status,admin_user_id=p_admin_id,customer_reason=btrim(p_customer_reason),internal_reason=btrim(p_internal_reason),decided_at=now(),version=version+1 where id=v.id;
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(v.service_request_id,v.original_job_id,p_admin_id,'warranty.'||case when p_accept then 'accepted' else 'rejected' end,'warranty_claim',v.id,'{}');
  return v_status;
end $$;

create function public.stage10_admin_assign_warranty_correction(
  p_claim_id uuid,p_admin_id uuid,p_technician_id uuid,p_expected_version integer
) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.service_warranty_claims%rowtype; v_original uuid; v_kind text; v_cost text; v_id uuid;
  v_category uuid; v_city bigint; v_district bigint;
begin
  if not public.stage10_active_role(p_admin_id,'admin') or not public.stage10_active_role(p_technician_id,'technician') then raise exception 'Active accounts required'; end if;
  if public.stage10_has_new_operation_block(p_technician_id) then raise exception 'Technician cannot receive new operations'; end if;
  select * into v from public.service_warranty_claims where id=p_claim_id for update;
  if not found or v.status<>'correction_pending' or v.version<>p_expected_version then raise exception 'Warranty assignment conflict'; end if;
  select technician_id into v_original from public.service_jobs where id=v.original_job_id;
  if p_technician_id=v_original then v_kind:='original_technician'; v_cost:='original_technician';
  else
    if not exists(select 1 from public.warranty_correction_assignments where warranty_claim_id=v.id and technician_id=v_original and status='declined') then raise exception 'Original technician must decline first'; end if;
    select r.category_id,a.city_id,a.district_id into v_category,v_city,v_district
      from public.service_requests r join public.customer_addresses a on a.id=r.address_id and a.customer_id=r.customer_id
      where r.id=v.service_request_id;
    if not exists(select 1 from public.technician_profiles where user_id=p_technician_id and approval_status='approved')
       or not exists(select 1 from public.technician_service_categories where technician_id=p_technician_id and category_id=v_category and approval_status='approved')
       or not exists(select 1 from public.technician_service_areas where technician_id=p_technician_id and city_id=v_city and (district_id is null or district_id=v_district)) then
      raise exception 'Replacement technician is not eligible';
    end if;
    v_kind:='replacement_technician'; v_cost:='teknik_o';
  end if;
  insert into public.warranty_correction_assignments(warranty_claim_id,technician_id,assignment_kind,cost_responsibility,created_by)
    values(v.id,p_technician_id,v_kind,v_cost,p_admin_id) returning id into v_id;
  update public.service_warranty_claims set status='correction_assigned',version=version+1 where id=v.id;
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(v.service_request_id,v.original_job_id,p_admin_id,'warranty.correction_assigned','warranty_correction',v_id,
      jsonb_build_object('assignment_kind',v_kind,'cost_responsibility',v_cost));
  return v_id;
end $$;

create function public.stage10_technician_respond_warranty_correction(
  p_assignment_id uuid,p_technician_id uuid,p_accept boolean
) returns text language plpgsql security definer set search_path='' as $$
declare v public.warranty_correction_assignments%rowtype; v_status text; v_claim public.service_warranty_claims%rowtype;
begin
  select * into v from public.warranty_correction_assignments where id=p_assignment_id for update;
  if not found or v.technician_id<>p_technician_id or v.status<>'offered' then raise exception 'Warranty correction response conflict'; end if;
  v_status:=case when p_accept then 'accepted' else 'declined' end;
  update public.warranty_correction_assignments set status=v_status,responded_at=now() where id=v.id;
  update public.service_warranty_claims set status=case when p_accept then 'correction_assigned' else 'correction_pending' end,version=version+1 where id=v.warranty_claim_id;
  select * into v_claim from public.service_warranty_claims where id=v.warranty_claim_id;
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(v_claim.service_request_id,v_claim.original_job_id,p_technician_id,
      'warranty.correction_'||case when p_accept then 'accepted' else 'declined' end,
      'warranty_correction',v.id,'{}'::jsonb);
  return v_status;
end $$;

create function public.stage10_complete_warranty_correction(p_assignment_id uuid,p_technician_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$ declare v_claim uuid; v_request uuid; v_job uuid; begin
  update public.warranty_correction_assignments set status='completed',completed_at=now()
    where id=p_assignment_id and technician_id=p_technician_id and status='accepted' returning warranty_claim_id into v_claim;
  if v_claim is null then raise exception 'Warranty correction cannot be completed'; end if;
  update public.service_warranty_claims set status='corrected',version=version+1 where id=v_claim;
  select service_request_id,original_job_id into v_request,v_job from public.service_warranty_claims where id=v_claim;
  insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(v_request,v_job,p_technician_id,'warranty.correction_completed','warranty_claim',v_claim,'{}'::jsonb);
  return true;
end $$;

create function public.stage10_operation_contract(p_request_id uuid,p_actor_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_request public.service_requests%rowtype; v_role text; v_job public.service_jobs%rowtype; v_appointment public.service_appointments%rowtype;
  v_cycle public.service_distribution_cycles%rowtype; v_stage text; v_terminal boolean; v_related boolean; v_effective_total numeric;
  v_has_active_job boolean; v_has_active_cycle boolean; v_complaint_allowed boolean;
begin
  select * into v_request from public.service_requests where id=p_request_id;
  if not found then raise exception 'Operation not found'; end if;
  select role into v_role from public.users where id=p_actor_id and is_active;
  if not found or v_role is null then raise exception 'Operation access denied'; end if;
  select * into v_job from public.service_jobs where service_request_id=p_request_id and status in ('assigned','in_progress') order by created_at desc limit 1;
  v_has_active_job:=found;
  if not v_has_active_job then
    select * into v_job from public.service_jobs where service_request_id=p_request_id order by created_at desc limit 1;
  end if;
  if v_job.id is not null then select * into v_appointment from public.service_appointments where job_id=v_job.id order by created_at desc limit 1; end if;
  select * into v_cycle from public.service_distribution_cycles where service_request_id=p_request_id and status='active' order by created_at desc limit 1;
  v_has_active_cycle:=found;
  if not v_has_active_cycle then
    select * into v_cycle from public.service_distribution_cycles where service_request_id=p_request_id order by created_at desc limit 1;
  end if;
  if v_has_active_cycle and not v_has_active_job then
    v_job.id:=null;v_job.technician_id:=null;v_job.status:=null;v_job.assignment_source:=null;v_job.completed_at:=null;
    v_appointment.id:=null;v_appointment.status:=null;
  end if;
  v_related:=v_role='admin' or (v_role='customer' and v_request.customer_id=p_actor_id)
    or (v_role='technician' and v_job.technician_id=p_actor_id);
  if v_related is distinct from true then raise exception 'Operation access denied'; end if;
  v_terminal:=v_request.status in ('completed','cancelled','technician_unavailable')
    or (not v_has_active_job and not v_has_active_cycle and v_job.status='completed');
  v_complaint_allowed:=v_has_active_job or v_has_active_cycle
    or (v_job.status='completed' and v_job.completed_at is not null and now()<=v_job.completed_at+interval '7 days');
  v_stage:=case
    when v_request.status='technician_unavailable' then 'technician_unavailable'
    when v_request.status='cancelled' then 'cancelled'
    when v_request.status='completed' then 'completed'
    when v_job.status='in_progress' then 'in_progress'
    when v_job.status='assigned' then 'assigned'
    when v_cycle.status='active' then 'distributing'
    when v_cycle.status='exhausted' then 'admin_intervention'
    when v_job.status='completed' then 'completed'
    else 'request_open' end;
  select q.total_amount+coalesce(sum(a.requested_amount) filter(where a.status='customer_accepted'),0)
    into v_effective_total from public.service_quotes q
    left join public.service_additional_cost_requests a on a.service_request_id=q.service_request_id
    where q.service_request_id=p_request_id and q.status='accepted' group by q.total_amount;
  return jsonb_build_object(
    'requestId',v_request.id,'currentJobId',v_job.id,'stage',v_stage,
    'assignmentSource',v_job.assignment_source,'appointmentState',v_appointment.status,
    'adminInterventionRequired',v_stage='admin_intervention','terminal',v_terminal,'effectiveTotal',v_effective_total,'currency','TRY',
    'permissions',jsonb_build_object(
      'createComplaint',v_complaint_allowed,
      'createWarranty',v_role='customer' and v_job.status='completed',
      'createAdditionalCost',v_role='technician' and v_job.technician_id=p_actor_id and v_job.status in ('assigned','in_progress') and v_appointment.id is not null,
      'cancelService',v_role='admin' and not v_terminal,
      'changeTechnician',v_role='admin' and v_job.status in ('assigned','in_progress')
    )
  );
end $$;

-- Only trusted server code may call workflow RPCs with an authenticated actor id.
do $$ declare f regprocedure; begin
  foreach f in array array[
    'public.stage10_active_role(uuid,text)'::regprocedure,
    'public.stage10_has_new_operation_block(uuid)'::regprocedure,
    'public.stage10_insert_evidence(text,uuid,uuid,jsonb)'::regprocedure,
    'public.stage10_preflight_case_action(text,uuid,uuid,uuid)'::regprocedure,
    'public.stage10_create_additional_cost(uuid,uuid,numeric,text,text,jsonb)'::regprocedure,
    'public.stage10_admin_review_additional_cost(uuid,uuid,boolean,text,integer)'::regprocedure,
    'public.stage10_customer_decide_additional_cost(uuid,uuid,boolean,integer)'::regprocedure,
    'public.stage10_admin_resolve_rejected_cost(uuid,uuid,boolean,text,integer)'::regprocedure,
    'public.stage10_create_complaint(uuid,uuid,text,text,jsonb)'::regprocedure,
    'public.stage10_admin_request_complaint_info(uuid,uuid,text)'::regprocedure,
    'public.stage10_admin_decide_complaint(uuid,uuid,text,text,text,uuid,timestamptz,integer)'::regprocedure,
    'public.stage10_admin_correct_complaint_decision(uuid,uuid,text,boolean)'::regprocedure,
    'public.stage10_create_warranty_claim(uuid,uuid,text,text,jsonb)'::regprocedure,
    'public.stage10_admin_decide_warranty(uuid,uuid,boolean,text,text,integer)'::regprocedure,
    'public.stage10_admin_assign_warranty_correction(uuid,uuid,uuid,integer)'::regprocedure,
    'public.stage10_technician_respond_warranty_correction(uuid,uuid,boolean)'::regprocedure,
    'public.stage10_complete_warranty_correction(uuid,uuid)'::regprocedure,
    'public.stage10_operation_contract(uuid,uuid)'::regprocedure
  ] loop
    execute format('revoke all on function %s from public,anon,authenticated',f);
    execute format('grant execute on function %s to service_role',f);
  end loop;
end $$;
revoke all on function public.stage10_guard_new_service_request() from public,anon,authenticated;
revoke all on function public.stage10_guard_new_service_job() from public,anon,authenticated;
revoke all on function public.stage10_cancel_service_graph(uuid,uuid,text,text,uuid,text) from public,anon,authenticated,service_role;

commit;
