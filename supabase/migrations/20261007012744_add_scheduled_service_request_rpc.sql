-- Add scheduling-aware service request RPC.
-- Scheduled dates are interpreted in Europe/Istanbul and allowed from tomorrow through day 7.

create or replace function public.create_service_request(
  p_customer_id uuid,
  p_category_code text,
  p_address_id uuid,
  p_issue_title text,
  p_problem_description text,
  p_pricing_reference text,
  p_request_key text,
  p_assessment_snapshot jsonb,
  p_requested_service_mode text,
  p_requested_service_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_id uuid;
  v_customer_can_select_date boolean;
  v_request_id uuid;
  v_problem_description text;
  v_mode text;
  v_today date;
  v_existing_mode text;
  v_existing_date date;
begin
  if p_customer_id is null or p_address_id is null then
    raise exception 'Customer and address are required';
  end if;
  if p_request_key is null or length(btrim(p_request_key)) not between 8 and 200 then
    raise exception 'Invalid request key';
  end if;
  if p_category_code is null or length(btrim(p_category_code)) = 0 then
    raise exception 'Category is required';
  end if;
  if p_issue_title is not null and length(p_issue_title) > 240 then
    raise exception 'Issue title is too long';
  end if;
  if p_problem_description is not null and length(p_problem_description) > 4000 then
    raise exception 'Problem description is too long';
  end if;
  if p_pricing_reference is not null and length(p_pricing_reference) > 500 then
    raise exception 'Pricing reference is too long';
  end if;
  if p_assessment_snapshot is null or jsonb_typeof(p_assessment_snapshot)<>'object'
    or coalesce(p_assessment_snapshot->>'schemaVersion','')<>'1'
    or coalesce(p_assessment_snapshot->>'category','') not in
      ('boiler','painting','cleaning','sofa_cleaning','carpet_cleaning')
    or octet_length(p_assessment_snapshot::text)>65536 then
    raise exception 'Invalid assessment snapshot';
  end if;
  if (btrim(p_category_code)='boiler' and p_assessment_snapshot->>'category'<>'boiler')
    or (btrim(p_category_code)='painting' and p_assessment_snapshot->>'category'<>'painting')
    or (btrim(p_category_code)='cleaning' and p_assessment_snapshot->>'category'<>'cleaning')
    or (btrim(p_category_code)='upholstery_carpet' and
      p_assessment_snapshot->>'category' not in ('sofa_cleaning','carpet_cleaning')) then
    raise exception 'Assessment category mismatch';
  end if;

  if not exists (
    select 1 from public.users u
    where u.id=p_customer_id and u.role='customer' and u.is_active
  ) then
    raise exception 'Customer account is not active';
  end if;
  if not exists (
    select 1 from public.customer_addresses a
    where a.id=p_address_id and a.customer_id=p_customer_id
  ) then
    raise exception 'Address does not belong to customer';
  end if;

  select c.id, c.customer_can_select_date
    into v_category_id, v_customer_can_select_date
  from public.service_categories c
  where c.code=btrim(p_category_code) and c.is_active
  limit 1;

  if v_category_id is null then
    raise exception 'Category is not available';
  end if;

  v_mode := btrim(coalesce(p_requested_service_mode,''));
  v_today := (now() at time zone 'Europe/Istanbul')::date;

  if v_mode not in ('immediate','scheduled') then
    raise exception 'Invalid requested service mode';
  end if;

  if v_mode='immediate' then
    if p_requested_service_date is not null then
      raise exception 'Immediate request cannot include a service date';
    end if;
  else
    if v_customer_can_select_date is not true then
      raise exception 'Category does not allow scheduled service';
    end if;
    if p_requested_service_date is null
      or p_requested_service_date < v_today + 1
      or p_requested_service_date > v_today + 7 then
      raise exception 'Scheduled date must be between tomorrow and 7 days from today';
    end if;
  end if;

  select r.id, r.requested_service_mode, r.requested_service_date
    into v_request_id, v_existing_mode, v_existing_date
  from public.service_requests r
  where r.customer_id=p_customer_id
    and r.request_key=btrim(p_request_key)
  limit 1;

  if v_request_id is not null then
    if v_existing_mode is distinct from v_mode
      or v_existing_date is distinct from p_requested_service_date then
      raise exception 'Existing request schedule mismatch';
    end if;
    return v_request_id;
  end if;

  v_problem_description := nullif(btrim(coalesce(p_problem_description,p_issue_title,'')),'');

  insert into public.service_requests(
    customer_id,status,category_id,address_id,problem_description,
    pricing_reference,request_key,requested_at,assessment_snapshot,
    requested_service_mode,requested_service_date
  ) values (
    p_customer_id,'created',v_category_id,p_address_id,v_problem_description,
    nullif(btrim(p_pricing_reference),''),btrim(p_request_key),now(),p_assessment_snapshot,
    v_mode,p_requested_service_date
  )
  on conflict (customer_id,request_key) where request_key is not null do nothing
  returning id into v_request_id;

  if v_request_id is null then
    select r.id, r.requested_service_mode, r.requested_service_date
      into v_request_id, v_existing_mode, v_existing_date
    from public.service_requests r
    where r.customer_id=p_customer_id
      and r.request_key=btrim(p_request_key)
    limit 1;

    if v_request_id is not null and (
      v_existing_mode is distinct from v_mode
      or v_existing_date is distinct from p_requested_service_date
    ) then
      raise exception 'Existing request schedule mismatch';
    end if;
  else
    insert into public.operational_events(
      service_request_id,actor_user_id,event_type,entity_type,entity_id,payload
    ) values (
      v_request_id,p_customer_id,'request.created','service_request',v_request_id,
      jsonb_build_object(
        'category_code',btrim(p_category_code),
        'address_id',p_address_id,
        'issue_title',nullif(btrim(p_issue_title),''),
        'pricing_reference_present',p_pricing_reference is not null
      )
    );
  end if;

  if v_request_id is null then
    raise exception 'Service request could not be created';
  end if;

  return v_request_id;
end
$$;

revoke all on function public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb,text,date)
from public, anon, authenticated;

grant execute on function public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb,text,date)
to service_role;
