-- Stage 10: private evidence, limited admin intervention and factual KPI reporting.
begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('service-case-evidence','service-case-evidence',false,52428800,
  array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create function public.stage10_can_read_case_evidence(p_storage_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select public.is_app_admin() or exists(
    select 1 from public.service_case_evidence e
    where e.storage_path=p_storage_path and e.uploader_user_id=(select auth.uid()) and e.complaint_id is null
  )
$$;
revoke all on function public.stage10_can_read_case_evidence(text) from public,anon;
grant execute on function public.stage10_can_read_case_evidence(text) to authenticated,service_role;

create policy service_case_evidence_admin_read on storage.objects for select to authenticated
using (bucket_id='service-case-evidence' and public.stage10_can_read_case_evidence(name));

create policy service_case_evidence_owner_non_complaint_read on storage.objects for select to authenticated
using (bucket_id='service-case-evidence' and public.stage10_can_read_case_evidence(name));

-- Upload and mutation use role-checked server routes; broad pre-existing policies
-- cannot expose this private bucket to anon/authenticated callers.
create policy service_case_evidence_anon_read_guard on storage.objects as restrictive
  for select to anon using (bucket_id<>'service-case-evidence');
create policy service_case_evidence_authenticated_read_guard on storage.objects as restrictive
  for select to authenticated using (bucket_id<>'service-case-evidence' or public.stage10_can_read_case_evidence(name));
create policy service_case_evidence_insert_guard on storage.objects as restrictive
  for insert to anon,authenticated with check (bucket_id<>'service-case-evidence');
create policy service_case_evidence_update_guard on storage.objects as restrictive
  for update to anon,authenticated using (bucket_id<>'service-case-evidence')
  with check (bucket_id<>'service-case-evidence');
create policy service_case_evidence_delete_guard on storage.objects as restrictive
  for delete to anon,authenticated using (bucket_id<>'service-case-evidence');

create function public.stage10_admin_cancel_service(
  p_request_id uuid,p_admin_id uuid,p_reason text,p_idempotency_key text
) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not public.stage10_active_role(p_admin_id,'admin') then raise exception 'Active admin required'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128 then raise exception 'Cancellation key required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stage10:admin_cancel:'||p_request_id::text||':'||p_idempotency_key,0));
  perform public.stage10_cancel_service_graph(p_request_id,p_admin_id,'admin.service_cancelled','service_request',p_request_id,p_reason);
  return true;
end $$;

create function public.stage10_admin_change_technician(
  p_request_id uuid,p_new_technician_id uuid,p_admin_id uuid,p_reason text,p_idempotency_key text,p_expected_job_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_request public.service_requests%rowtype; v_old_job public.service_jobs%rowtype; v_quote uuid; v_dispatch uuid; v_new_job uuid;
  v_city bigint; v_district bigint; v_existing public.service_jobs%rowtype;
begin
  if not public.stage10_active_role(p_admin_id,'admin') or not public.stage10_active_role(p_new_technician_id,'technician') then raise exception 'Active admin and technician required'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 10 and 1000
     or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128
     or p_expected_job_id is null then raise exception 'Invalid technician change'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stage10:change_technician:'||p_request_id::text||':'||p_idempotency_key,0));
  select * into v_existing from public.service_jobs where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.service_request_id=p_request_id and v_existing.technician_id=p_new_technician_id then return v_existing.id; end if;
    raise exception 'Idempotency key conflict';
  end if;
  select * into v_request from public.service_requests where id=p_request_id for update;
  if not found or v_request.status in ('completed','cancelled','technician_unavailable') then raise exception 'Service cannot change technician'; end if;
  select * into v_old_job from public.service_jobs where service_request_id=p_request_id and status in ('assigned','in_progress') order by created_at desc limit 1 for update;
  if not found or v_old_job.id<>p_expected_job_id or v_old_job.technician_id=p_new_technician_id then raise exception 'Active job changed; refresh and retry'; end if;
  if public.stage10_has_new_operation_block(p_new_technician_id) then raise exception 'Technician cannot receive new operations'; end if;
  select a.city_id,a.district_id into v_city,v_district from public.customer_addresses a where a.id=v_request.address_id and a.customer_id=v_request.customer_id;
  if not exists(select 1 from public.technician_profiles where user_id=p_new_technician_id and approval_status='approved')
     or not exists(select 1 from public.technician_service_categories where technician_id=p_new_technician_id and category_id=v_request.category_id and approval_status='approved')
     or not exists(select 1 from public.technician_service_areas where technician_id=p_new_technician_id and city_id=v_city and (district_id is null or district_id=v_district)) then
    raise exception 'Technician is not eligible';
  end if;
  v_quote:=v_old_job.accepted_quote_id;
  update public.service_appointments set status='cancelled' where job_id=v_old_job.id and status in ('scheduled','confirmed');
  update public.service_jobs set status='cancelled',cancelled_at=now() where id=v_old_job.id;
  insert into public.service_dispatches(service_request_id,quote_id,status,started_at,closed_at)
    values(p_request_id,v_quote,'accepted',now(),now()) returning id into v_dispatch;
  insert into public.service_jobs(service_request_id,dispatch_id,accepted_quote_id,technician_id,status,assigned_at,idempotency_key,assignment_source)
    values(p_request_id,v_dispatch,v_quote,p_new_technician_id,'assigned',now(),p_idempotency_key,'admin_manual') returning id into v_new_job;
  insert into public.operational_events(service_request_id,job_id,dispatch_id,actor_user_id,event_type,entity_type,entity_id,payload)
    values(p_request_id,v_new_job,v_dispatch,p_admin_id,'admin.technician_changed','service_job',v_new_job,
      jsonb_build_object('previous_job_id',v_old_job.id,'previous_technician_id',v_old_job.technician_id,'new_technician_id',p_new_technician_id,'reason',btrim(p_reason)));
  return v_new_job;
end $$;

create function public.stage10_admin_kpi(p_admin_id uuid,p_period text,p_anchor date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_start timestamptz; v_end timestamptz; v_general jsonb; v_technicians jsonb;
begin
  if not public.stage10_active_role(p_admin_id,'admin') then raise exception 'Active admin required'; end if;
  if p_period not in ('monthly','yearly') or p_anchor is null then raise exception 'Monthly or yearly period required'; end if;
  v_start:=case when p_period='monthly'
    then (date_trunc('month',p_anchor::timestamp) at time zone 'Europe/Istanbul')
    else (date_trunc('year',p_anchor::timestamp) at time zone 'Europe/Istanbul') end;
  v_end:=case when p_period='monthly' then v_start+interval '1 month' else v_start+interval '1 year' end;
  select jsonb_build_object(
    'openedRequests',(select count(*) from public.service_requests where created_at>=v_start and created_at<v_end),
    'completedServices',(select count(distinct service_request_id) from public.service_jobs where status='completed' and completed_at>=v_start and completed_at<v_end),
    'cancelledServices',(select count(distinct service_request_id) from public.operational_events
      where event_type in ('admin.service_cancelled','additional_cost.admin_cancelled') and occurred_at>=v_start and occurred_at<v_end),
    'acceptedQuoteVolume',(select coalesce(sum(total_amount),0) from public.service_quotes where status='accepted' and accepted_at>=v_start and accepted_at<v_end),
    'acceptedAdditionalCostVolume',(select coalesce(sum(requested_amount),0) from public.service_additional_cost_requests
      where status='customer_accepted' and customer_decided_at>=v_start and customer_decided_at<v_end),
    'serviceVolume',(select coalesce(sum(amount),0) from (
      select total_amount amount from public.service_quotes where status='accepted' and accepted_at>=v_start and accepted_at<v_end
      union all
      select requested_amount from public.service_additional_cost_requests where status='customer_accepted' and customer_decided_at>=v_start and customer_decided_at<v_end
    ) volume_events),
    'assignments',(select count(*) from public.service_jobs where assigned_at>=v_start and assigned_at<v_end),
    'complaints',(select count(*) from public.service_complaints where created_at>=v_start and created_at<v_end),
    'warrantyClaims',(select count(*) from public.service_warranty_claims where created_at>=v_start and created_at<v_end),
    'customerRatings',null,'ratingsAvailable',false,
    'dateBasis',jsonb_build_object('timezone','Europe/Istanbul','requests','created_at','completed','service_jobs.completed_at',
      'cancelled','operational_events.occurred_at','quoteVolume','service_quotes.accepted_at',
      'additionalCostVolume','service_additional_cost_requests.customer_decided_at','periodStart',v_start,'periodEndExclusive',v_end)
  ) into v_general;

  select coalesce(jsonb_agg(row_data order by row_data->>'technicianName'),'[]'::jsonb) into v_technicians from (
    select jsonb_build_object(
      'technicianId',u.id,'technicianName',u.name,
      'assignments',(select count(*) from public.service_jobs j where j.technician_id=u.id and j.assigned_at>=v_start and j.assigned_at<v_end),
      'completed',(select count(*) from public.service_jobs j where j.technician_id=u.id and j.status='completed'
        and j.assigned_at>=v_start and j.assigned_at<v_end and j.completed_at>=v_start and j.completed_at<v_end),
      'completionRate',case when (select count(*) from public.service_jobs j where j.technician_id=u.id and j.assigned_at>=v_start and j.assigned_at<v_end)=0 then null else round(
        100.0*(select count(*) from public.service_jobs j where j.technician_id=u.id and j.status='completed'
          and j.assigned_at>=v_start and j.assigned_at<v_end and j.completed_at>=v_start and j.completed_at<v_end)
        /(select count(*) from public.service_jobs j where j.technician_id=u.id and j.assigned_at>=v_start and j.assigned_at<v_end),2) end,
      'offers',(select count(*) from public.service_dispatch_candidates dc where dc.technician_id=u.id and dc.offered_at>=v_start and dc.offered_at<v_end),
      'acceptedOffers',(select count(*) from public.service_dispatch_candidates dc where dc.technician_id=u.id and dc.status='accepted'
        and dc.offered_at>=v_start and dc.offered_at<v_end and dc.responded_at>=v_start and dc.responded_at<v_end),
      'acceptanceRate',case when (select count(*) from public.service_dispatch_candidates dc where dc.technician_id=u.id and dc.offered_at>=v_start and dc.offered_at<v_end)=0 then null else round(
        100.0*(select count(*) from public.service_dispatch_candidates dc where dc.technician_id=u.id and dc.status='accepted'
          and dc.offered_at>=v_start and dc.offered_at<v_end and dc.responded_at>=v_start and dc.responded_at<v_end)
        /(select count(*) from public.service_dispatch_candidates dc where dc.technician_id=u.id and dc.offered_at>=v_start and dc.offered_at<v_end),2) end,
      'completionRateBasis','jobs_assigned_and_completed_within_period',
      'acceptanceRateBasis','offers_and_acceptance_responses_within_period',
      'complaints',(select count(*) from public.service_complaints c join public.service_jobs cj on cj.id=c.related_job_id
        where c.created_at>=v_start and c.created_at<v_end and cj.technician_id=u.id),
      'warrantyCorrections',(select count(*) from public.warranty_correction_assignments wc where wc.technician_id=u.id and wc.created_at>=v_start and wc.created_at<v_end)
    ) row_data
    from public.users u
    where u.role='technician'
  ) s;
  return jsonb_build_object('period',p_period,'general',v_general,'technicians',v_technicians);
end $$;

revoke all on function public.stage10_admin_cancel_service(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.stage10_admin_change_technician(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.stage10_admin_kpi(uuid,text,date) from public,anon,authenticated;
grant execute on function public.stage10_admin_cancel_service(uuid,uuid,text,text) to service_role;
grant execute on function public.stage10_admin_change_technician(uuid,uuid,uuid,text,text,uuid) to service_role;
grant execute on function public.stage10_admin_kpi(uuid,text,date) to service_role;

commit;
