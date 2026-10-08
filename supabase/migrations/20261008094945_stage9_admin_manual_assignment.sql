-- Stage 9 Package 1: safe admin manual assignment after exhausted distribution.

begin;

alter table public.service_jobs
  add column if not exists assignment_source text not null default 'automatic';

alter table public.service_jobs
  drop constraint if exists service_jobs_assignment_source_check;

alter table public.service_jobs
  add constraint service_jobs_assignment_source_check
  check (assignment_source in ('automatic','admin_manual'));

create or replace function public.admin_manual_assign_service_job(
  p_service_request_id uuid,
  p_technician_id uuid,
  p_admin_user_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_cycle public.service_distribution_cycles%rowtype;
  v_request public.service_requests%rowtype;
  v_quote_id uuid;
  v_dispatch_id uuid;
  v_job_id uuid;
  v_prior_job public.service_jobs%rowtype;
  v_role text;
  v_active boolean;
  v_profile_approval text;
  v_available boolean;
  v_category_id uuid;
  v_address_id uuid;
  v_city_id bigint;
  v_district_id bigint;
  v_active_job_count integer;
begin
  if p_service_request_id is null
     or p_technician_id is null
     or p_admin_user_id is null then
    raise exception 'Manual assignment requires request, technician and admin';
  end if;

  if p_reason is null
     or length(btrim(p_reason)) < 3
     or length(btrim(p_reason)) > 500 then
    raise exception 'Manual assignment reason must be between 3 and 500 characters';
  end if;

  if p_idempotency_key is null
     or length(p_idempotency_key) not between 1 and 128
     or p_idempotency_key<>btrim(p_idempotency_key) then
    raise exception 'Invalid manual assignment idempotency key';
  end if;

  select role,is_active
    into v_role,v_active
  from public.users
  where id=p_admin_user_id
  for update;

  if not found
     or v_role<>'admin'
     or v_active is distinct from true then
    raise exception 'Active admin account required';
  end if;

  select *
    into v_request
  from public.service_requests
  where id=p_service_request_id
  for update;

  if not found then
    raise exception 'Service request not found';
  end if;

  select *
    into v_prior_job
  from public.service_jobs
  where idempotency_key=p_idempotency_key;

  if found then
    if v_prior_job.service_request_id=p_service_request_id
       and v_prior_job.technician_id=p_technician_id
       and v_prior_job.assignment_source='admin_manual' then
      return v_prior_job.id;
    end if;

    raise exception 'Idempotency key belongs to another assignment';
  end if;

  if exists(
    select 1
    from public.service_jobs
    where service_request_id=p_service_request_id
      and status in ('assigned','in_progress')
  ) then
    raise exception 'Request already has an active job';
  end if;

  if exists(
    select 1
    from public.service_distribution_cycles
    where service_request_id=p_service_request_id
      and status='active'
  ) then
    raise exception 'Automatic distribution is still active';
  end if;

  select *
    into v_cycle
  from public.service_distribution_cycles
  where service_request_id=p_service_request_id
  order by started_at desc,created_at desc
  limit 1
  for update;

  if not found
     or v_cycle.status<>'exhausted'
     or v_cycle.current_round<>3 then
    raise exception 'Manual assignment requires exhausted three-round distribution';
  end if;

  v_quote_id:=v_cycle.quote_id;

  if not exists(
    select 1
    from public.service_quotes
    where id=v_quote_id
      and service_request_id=p_service_request_id
      and status='accepted'
  ) then
    raise exception 'Manual assignment requires accepted quote';
  end if;

  if exists(
    select 1
    from public.service_request_technician_exclusions
    where service_request_id=p_service_request_id
      and technician_id=p_technician_id
  ) then
    raise exception 'Technician is excluded from this request';
  end if;

  select role,is_active
    into v_role,v_active
  from public.users
  where id=p_technician_id
  for update;

  if not found
     or v_role<>'technician'
     or v_active is distinct from true then
    raise exception 'Technician account is not active';
  end if;

  select approval_status,is_available
    into v_profile_approval,v_available
  from public.technician_profiles
  where user_id=p_technician_id
  for update;

  if not found or v_profile_approval<>'approved' then
    raise exception 'Technician is not approved';
  end if;

  select r.category_id,r.address_id,a.city_id,a.district_id
    into v_category_id,v_address_id,v_city_id,v_district_id
  from public.service_requests r
  left join public.customer_addresses a
    on a.id=r.address_id
   and a.customer_id=r.customer_id
  where r.id=p_service_request_id;

  if v_category_id is null
     or not exists(
       select 1
       from public.technician_service_categories
       where technician_id=p_technician_id
         and category_id=v_category_id
         and approval_status='approved'
     ) then
    raise exception 'Technician category is not approved for request';
  end if;

  if v_address_id is null or v_city_id is null then
    raise exception 'Request service area is not normalized';
  end if;

  if not exists(
    select 1
    from public.technician_service_areas
    where technician_id=p_technician_id
      and city_id=v_city_id
      and (district_id is null or district_id=v_district_id)
  ) then
    raise exception 'Technician is not eligible for request service area';
  end if;

  select count(*)
    into v_active_job_count
  from public.service_jobs
  where technician_id=p_technician_id
    and status in ('assigned','in_progress');

  insert into public.service_dispatches(
    service_request_id,
    quote_id,
    status,
    started_at,
    closed_at
  )
  values(
    p_service_request_id,
    v_quote_id,
    'accepted',
    now(),
    now()
  )
  returning id into v_dispatch_id;

  insert into public.service_jobs(
    service_request_id,
    dispatch_id,
    accepted_quote_id,
    technician_id,
    status,
    assigned_at,
    idempotency_key,
    assignment_source
  )
  values(
    p_service_request_id,
    v_dispatch_id,
    v_quote_id,
    p_technician_id,
    'assigned',
    now(),
    p_idempotency_key,
    'admin_manual'
  )
  returning id into v_job_id;

  insert into public.operational_events(
    service_request_id,
    job_id,
    dispatch_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values(
    p_service_request_id,
    v_job_id,
    v_dispatch_id,
    p_admin_user_id,
    'admin.manual_assignment',
    'service_job',
    v_job_id,
    jsonb_build_object(
      'technician_id',p_technician_id,
      'reason',btrim(p_reason),
      'distribution_cycle_id',v_cycle.id,
      'technician_available',v_available,
      'technician_active_job_count',v_active_job_count
    )
  );

  return v_job_id;
end;
$$;

revoke all on function public.admin_manual_assign_service_job(uuid,uuid,uuid,text,text)
from public,anon,authenticated;

grant execute on function public.admin_manual_assign_service_job(uuid,uuid,uuid,text,text)
to service_role;

commit;
