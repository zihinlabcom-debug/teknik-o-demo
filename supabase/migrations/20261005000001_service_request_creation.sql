-- Stage 2: real service request creation + idempotent request.created event.
-- Depends only on normalized operation-core request columns. Legacy presentation
-- columns such as service_requests.category / issue_title are intentionally not
-- required so the migration is valid against the disposable operation fixture.
begin;

alter table public.service_requests
  add column if not exists problem_description text,
  add column if not exists pricing_reference text,
  add column if not exists request_key text,
  add column if not exists requested_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.service_requests'::regclass
      and conname='service_requests_problem_description_length_check'
  ) then
    alter table public.service_requests add constraint service_requests_problem_description_length_check
      check (problem_description is null or length(problem_description) <= 4000);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.service_requests'::regclass
      and conname='service_requests_pricing_reference_length_check'
  ) then
    alter table public.service_requests add constraint service_requests_pricing_reference_length_check
      check (pricing_reference is null or length(pricing_reference) <= 500);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.service_requests'::regclass
      and conname='service_requests_request_key_length_check'
  ) then
    alter table public.service_requests add constraint service_requests_request_key_length_check
      check (request_key is null or length(request_key) between 8 and 200);
  end if;
end $$;

create unique index if not exists service_requests_customer_request_key_uq
  on public.service_requests(customer_id,request_key)
  where request_key is not null;

create or replace function public.create_service_request(
  p_customer_id uuid,
  p_category_code text,
  p_address_id uuid,
  p_issue_title text,
  p_problem_description text,
  p_pricing_reference text,
  p_request_key text
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_category_id uuid;
  v_request_id uuid;
  v_inserted boolean := false;
  v_problem_description text;
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

  select c.id into v_category_id
  from public.service_categories c
  where c.code=btrim(p_category_code) and c.is_active
  limit 1;
  if v_category_id is null then
    raise exception 'Category is not available';
  end if;

  select r.id into v_request_id
  from public.service_requests r
  where r.customer_id=p_customer_id and r.request_key=btrim(p_request_key)
  limit 1;
  if v_request_id is not null then
    return v_request_id;
  end if;

  -- The normalized operation model stores category through category_id. The
  -- legacy text column `category` is deliberately not required here.
  v_problem_description := nullif(btrim(coalesce(p_problem_description,p_issue_title,'')),'');

  insert into public.service_requests(
    customer_id,status,category_id,address_id,
    problem_description,pricing_reference,request_key,requested_at
  ) values (
    p_customer_id,'created',v_category_id,p_address_id,
    v_problem_description,nullif(btrim(p_pricing_reference),''),btrim(p_request_key),now()
  )
  on conflict (customer_id,request_key) where request_key is not null do nothing
  returning id into v_request_id;

  if v_request_id is null then
    select r.id into v_request_id
    from public.service_requests r
    where r.customer_id=p_customer_id and r.request_key=btrim(p_request_key)
    limit 1;
  else
    v_inserted := true;
  end if;

  if v_request_id is null then
    raise exception 'Service request could not be created';
  end if;

  if v_inserted then
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

  return v_request_id;
end $$;

revoke all on function public.create_service_request(uuid,text,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_service_request(uuid,text,uuid,text,text,text,text) to service_role;

commit;
