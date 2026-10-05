-- Forward-only Stage 2 extension. Existing requests remain readable with NULL.
begin;

alter table public.service_requests
  add column if not exists assessment_snapshot jsonb;

alter table public.service_requests
  add constraint service_requests_assessment_snapshot_shape_check
  check (assessment_snapshot is null or (
    jsonb_typeof(assessment_snapshot)='object'
    and coalesce(assessment_snapshot->>'schemaVersion','')='1'
    and coalesce(assessment_snapshot->>'category','') in
      ('boiler','painting','cleaning','sofa_cleaning','carpet_cleaning')
    and octet_length(assessment_snapshot::text) <= 65536
  ));

create or replace function public.keep_service_request_assessment_immutable()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.assessment_snapshot is distinct from old.assessment_snapshot then
    raise exception 'Assessment snapshot is immutable';
  end if;
  return new;
end $$;

revoke all on function public.keep_service_request_assessment_immutable()
  from public,anon,authenticated;

create trigger service_requests_assessment_immutable
before update on public.service_requests
for each row execute function public.keep_service_request_assessment_immutable();

-- New signature avoids rewriting the applied Stage 2 migration. The old
-- signature remains for migration history, but cannot create new requests.
revoke all on function public.create_service_request(uuid,text,uuid,text,text,text,text)
  from public,anon,authenticated,service_role;

create function public.create_service_request(
  p_customer_id uuid,
  p_category_code text,
  p_address_id uuid,
  p_issue_title text,
  p_problem_description text,
  p_pricing_reference text,
  p_request_key text,
  p_assessment_snapshot jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_category_id uuid;
  v_request_id uuid;
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
  if p_assessment_snapshot is null or jsonb_typeof(p_assessment_snapshot)<>'object'
    or coalesce(p_assessment_snapshot->>'schemaVersion','')<>'1'
    or coalesce(p_assessment_snapshot->>'category','') not in
      ('boiler','painting','cleaning','sofa_cleaning','carpet_cleaning')
    or octet_length(p_assessment_snapshot::text)>65536 then
    raise exception 'Invalid assessment snapshot';
  end if;
  if (p_category_code='boiler' and p_assessment_snapshot->>'category'<>'boiler')
    or (p_category_code='painting' and p_assessment_snapshot->>'category'<>'painting')
    or (p_category_code='cleaning' and p_assessment_snapshot->>'category'<>'cleaning')
    or (p_category_code='upholstery_carpet' and
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
  select c.id into v_category_id from public.service_categories c
  where c.code=btrim(p_category_code) and c.is_active limit 1;
  if v_category_id is null then raise exception 'Category is not available'; end if;

  select r.id into v_request_id from public.service_requests r
  where r.customer_id=p_customer_id and r.request_key=btrim(p_request_key) limit 1;
  if v_request_id is not null then return v_request_id; end if;

  v_problem_description := nullif(btrim(coalesce(p_problem_description,p_issue_title,'')),'');
  insert into public.service_requests(
    customer_id,status,category_id,address_id,problem_description,
    pricing_reference,request_key,requested_at,assessment_snapshot
  ) values (
    p_customer_id,'created',v_category_id,p_address_id,v_problem_description,
    nullif(btrim(p_pricing_reference),''),btrim(p_request_key),now(),p_assessment_snapshot
  )
  on conflict (customer_id,request_key) where request_key is not null do nothing
  returning id into v_request_id;

  if v_request_id is null then
    select r.id into v_request_id from public.service_requests r
    where r.customer_id=p_customer_id and r.request_key=btrim(p_request_key) limit 1;
  else
    insert into public.operational_events(
      service_request_id,actor_user_id,event_type,entity_type,entity_id,payload
    ) values (
      v_request_id,p_customer_id,'request.created','service_request',v_request_id,
      jsonb_build_object('category_code',btrim(p_category_code),'address_id',p_address_id,
        'issue_title',nullif(btrim(p_issue_title),''),
        'pricing_reference_present',p_pricing_reference is not null)
    );
  end if;
  if v_request_id is null then raise exception 'Service request could not be created'; end if;
  return v_request_id;
end $$;

revoke all on function public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb)
  to service_role;

commit;
