-- Stage 5: return the technicians currently eligible for a service request.
-- This function only answers "which technicians are eligible?".
-- Offer limits, distribution rounds, timeouts and exclusions belong to later stages.

begin;

create or replace function public.find_eligible_technicians(p_service_request_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_id uuid;
  v_city_id bigint;
  v_district_id bigint;
  v_technician_ids uuid[];
begin
  if p_service_request_id is null then
    raise exception 'Service request is required';
  end if;

  select r.category_id, a.city_id, a.district_id
    into v_category_id, v_city_id, v_district_id
  from public.service_requests r
  join public.customer_addresses a
    on a.id = r.address_id
   and a.customer_id = r.customer_id
  where r.id = p_service_request_id;

  if not found then
    raise exception 'Service request or normalized address not found';
  end if;

  if v_category_id is null or v_city_id is null then
    raise exception 'Service request category and city are required';
  end if;

  select coalesce(array_agg(distinct u.id order by u.id), array[]::uuid[])
    into v_technician_ids
  from public.users u
  join public.technician_profiles tp
    on tp.user_id = u.id
  join public.technician_service_categories tsc
    on tsc.technician_id = u.id
   and tsc.category_id = v_category_id
  where u.role = 'technician'
    and u.is_active is true
    and tp.approval_status = 'approved'
    and tp.is_available is true
    and tsc.approval_status = 'approved'
    and exists (
      select 1
      from public.technician_service_areas tsa
      where tsa.technician_id = u.id
        and tsa.city_id = v_city_id
        and (tsa.district_id is null or tsa.district_id = v_district_id)
    );

  return v_technician_ids;
end
$$;

revoke all on function public.find_eligible_technicians(uuid)
from public, anon, authenticated;

grant execute on function public.find_eligible_technicians(uuid)
to service_role;

commit;
