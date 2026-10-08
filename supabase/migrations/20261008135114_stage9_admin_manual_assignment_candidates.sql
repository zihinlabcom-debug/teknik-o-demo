-- Stage 9 Package 2: secure admin manual-assignment candidate listing.

begin;

create or replace function public.admin_manual_assignment_candidates(
  p_service_request_id uuid,
  p_admin_user_id uuid
)
returns table(
  technician_id uuid,
  name text,
  is_available boolean,
  active_job_count bigint
)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin_role text;
  v_admin_active boolean;
  v_category_id uuid;
  v_address_id uuid;
  v_city_id bigint;
  v_district_id bigint;
  v_cycle public.service_distribution_cycles%rowtype;
begin
  if p_service_request_id is null or p_admin_user_id is null then
    raise exception 'Manual assignment candidate lookup requires request and admin';
  end if;

  select u.role,u.is_active
    into v_admin_role,v_admin_active
  from public.users u
  where u.id=p_admin_user_id;

  if not found
     or v_admin_role<>'admin'
     or v_admin_active is distinct from true then
    raise exception 'Active admin account required';
  end if;

  select r.category_id,r.address_id,a.city_id,a.district_id
    into v_category_id,v_address_id,v_city_id,v_district_id
  from public.service_requests r
  left join public.customer_addresses a
    on a.id=r.address_id
   and a.customer_id=r.customer_id
  where r.id=p_service_request_id;

  if not found then
    raise exception 'Service request not found';
  end if;

  if exists(
    select 1
    from public.service_jobs j
    where j.service_request_id=p_service_request_id
      and j.status in ('assigned','in_progress')
  ) then
    raise exception 'Request already has an active job';
  end if;

  if exists(
    select 1
    from public.service_distribution_cycles c
    where c.service_request_id=p_service_request_id
      and c.status='active'
  ) then
    raise exception 'Automatic distribution is still active';
  end if;

  select c.*
    into v_cycle
  from public.service_distribution_cycles c
  where c.service_request_id=p_service_request_id
  order by c.started_at desc,c.created_at desc
  limit 1;

  if not found
     or v_cycle.status<>'exhausted'
     or v_cycle.current_round<>3 then
    raise exception 'Manual assignment requires exhausted three-round distribution';
  end if;

  if not exists(
    select 1 from public.service_quotes q
    where q.id=v_cycle.quote_id
      and q.service_request_id=p_service_request_id
      and q.status='accepted'
  ) then
    raise exception 'Manual assignment requires accepted quote';
  end if;

  if v_category_id is null
     or v_address_id is null
     or v_city_id is null then
    raise exception 'Request service area is not normalized';
  end if;

  return query
  select
    u.id as technician_id,
    u.name::text,
    tp.is_available,
    (
      select count(*)
      from public.service_jobs j
      where j.technician_id=u.id
        and j.status in ('assigned','in_progress')
    ) as active_job_count
  from public.users u
  join public.technician_profiles tp
    on tp.user_id=u.id
   and tp.approval_status='approved'
  join public.technician_service_categories tsc
    on tsc.technician_id=u.id
   and tsc.category_id=v_category_id
   and tsc.approval_status='approved'
  where u.role='technician'
    and u.is_active=true
    and exists(
      select 1
      from public.technician_service_areas tsa
      where tsa.technician_id=u.id
        and tsa.city_id=v_city_id
        and (tsa.district_id is null or tsa.district_id=v_district_id)
    )
    and not exists(
      select 1
      from public.service_request_technician_exclusions e
      where e.service_request_id=p_service_request_id
        and e.technician_id=u.id
    )
  order by tp.is_available desc,
           4 asc,
           u.name asc nulls last,
           u.id;
end;
$$;

revoke all on function public.admin_manual_assignment_candidates(uuid,uuid)
from public,anon,authenticated;

grant execute on function public.admin_manual_assignment_candidates(uuid,uuid)
to service_role;

commit;
