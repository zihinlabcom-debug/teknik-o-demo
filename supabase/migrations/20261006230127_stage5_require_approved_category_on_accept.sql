-- Stage 5: dispatch acceptance must require an approved technician/category assignment.
-- Preserves atomic first-accept behavior and the Stage 5 removal of the fixed
-- active-job capacity limit.

begin;

create or replace function public.accept_service_dispatch(
  p_dispatch_id uuid,
  p_technician_id uuid,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_dispatch public.service_dispatches%rowtype;
  selected_candidate public.service_dispatch_candidates%rowtype;
  prior_job public.service_jobs%rowtype;
  technician_role text;
  technician_active boolean;
  technician_approval text;
  technician_available boolean;
  request_category uuid;
  request_address uuid;
  request_city bigint;
  request_district bigint;
  new_job_id uuid;
  violated_constraint text;
begin
  if p_dispatch_id is null or p_technician_id is null
     or p_idempotency_key is null or length(p_idempotency_key) not between 1 and 128
     or p_idempotency_key <> btrim(p_idempotency_key) then
    raise exception 'Invalid dispatch acceptance arguments';
  end if;

  select * into selected_dispatch
  from public.service_dispatches
  where id = p_dispatch_id
  for update;

  if not found then
    raise exception 'Dispatch not found';
  end if;

  select * into prior_job
  from public.service_jobs
  where idempotency_key = p_idempotency_key;

  if found then
    if prior_job.dispatch_id = p_dispatch_id
       and prior_job.technician_id = p_technician_id then
      return prior_job.id;
    end if;
    raise exception 'Idempotency key belongs to another acceptance';
  end if;

  if selected_dispatch.status not in ('pending','broadcasting') then
    raise exception 'Dispatch is closed for acceptance';
  end if;

  select * into selected_candidate
  from public.service_dispatch_candidates
  where dispatch_id = p_dispatch_id
    and technician_id = p_technician_id
  for update;

  if not found or selected_candidate.status <> 'offered' then
    raise exception 'Technician is not an offered candidate';
  end if;

  select role, is_active
    into technician_role, technician_active
  from public.users
  where id = p_technician_id
  for update;

  if not found
     or technician_role <> 'technician'
     or technician_active is distinct from true then
    raise exception 'Technician account is not active';
  end if;

  select approval_status, is_available
    into technician_approval, technician_available
  from public.technician_profiles
  where user_id = p_technician_id;

  if not found or technician_approval <> 'approved' then
    raise exception 'Technician is not approved';
  end if;

  if technician_available is distinct from true then
    raise exception 'Technician is not available';
  end if;

  select r.category_id, r.address_id, a.city_id, a.district_id
    into request_category, request_address, request_city, request_district
  from public.service_requests r
  left join public.customer_addresses a
    on a.id = r.address_id
   and a.customer_id = r.customer_id
  where r.id = selected_dispatch.service_request_id;

  if not found then
    raise exception 'Service request not found';
  end if;

  if request_category is null
     or not exists (
       select 1
       from public.technician_service_categories
       where technician_id = p_technician_id
         and category_id = request_category
         and approval_status = 'approved'
     ) then
    raise exception 'Technician category is not approved for request';
  end if;

  if request_address is null or request_city is null then
    raise exception 'Request service area is not normalized';
  end if;

  if not exists (
    select 1
    from public.technician_service_areas a
    where a.technician_id = p_technician_id
      and a.city_id = request_city
      and (a.district_id is null or a.district_id = request_district)
  ) then
    raise exception 'Technician is not eligible for request service area';
  end if;

  begin
    insert into public.service_jobs(
      service_request_id, dispatch_id, accepted_quote_id,
      technician_id, status, assigned_at, idempotency_key
    )
    values (
      selected_dispatch.service_request_id,
      p_dispatch_id,
      selected_dispatch.quote_id,
      p_technician_id,
      'assigned',
      now(),
      p_idempotency_key
    )
    returning id into new_job_id;
  exception when unique_violation then
    get stacked diagnostics violated_constraint = constraint_name;
    if violated_constraint = 'service_jobs_idempotency_unique_idx' then
      raise exception 'Idempotency key belongs to another acceptance';
    end if;
    raise;
  end;

  update public.service_dispatch_candidates
  set status = 'accepted', responded_at = now()
  where id = selected_candidate.id;

  update public.service_dispatch_candidates
  set status = 'withdrawn', responded_at = now()
  where dispatch_id = p_dispatch_id
    and status = 'offered'
    and id <> selected_candidate.id;

  update public.service_dispatches
  set status = 'accepted', closed_at = now()
  where id = p_dispatch_id;

  insert into public.operational_events(
    service_request_id, job_id, dispatch_id, actor_user_id,
    event_type, entity_type, entity_id, payload
  )
  values (
    selected_dispatch.service_request_id,
    new_job_id,
    p_dispatch_id,
    p_technician_id,
    'dispatch.accepted',
    'service_job',
    new_job_id,
    '{}'::jsonb
  );

  return new_job_id;
end
$$;

revoke all on function public.accept_service_dispatch(uuid,uuid,text)
from public, anon, authenticated;

grant execute on function public.accept_service_dispatch(uuid,uuid,text)
to service_role;

commit;
