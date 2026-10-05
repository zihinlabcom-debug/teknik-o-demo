-- Finish an OTP-verified new technician registration in one transaction.
-- The Auth insert trigger initially creates a customer row; only this
-- service-role RPC may convert that fresh, unused row into an application.
begin;

create or replace function public.complete_technician_registration(
  p_user_id uuid,p_phone text,p_name text,p_email text,
  p_category_ids uuid[],p_city_id bigint,p_district_ids bigint[]
) returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_user public.users%rowtype;
  v_auth_phone text;
  v_confirmed_at timestamptz;
  v_created_at timestamptz;
  v_categories uuid[];
  v_districts bigint[];
begin
  if p_user_id is null or p_phone is null or p_phone !~ '^\+905[0-9]{9}$'
     or p_name is null or length(trim(p_name))<2 or length(trim(p_name))>200
     or (p_email is not null and (length(p_email)>320 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'))
     or p_city_id is null then
    raise exception 'Invalid technician registration';
  end if;
  select array_agg(distinct x order by x) into v_categories
    from unnest(p_category_ids) as x;
  select array_agg(distinct x order by x) into v_districts
    from unnest(p_district_ids) as x;
  if v_categories is null or v_districts is null or
     cardinality(v_categories)>30 or cardinality(v_districts)>1000 or
     array_position(v_categories,null) is not null or array_position(v_districts,null) is not null then
    raise exception 'Category and district selections required';
  end if;

  select phone,phone_confirmed_at,created_at into v_auth_phone,v_confirmed_at,v_created_at
    from auth.users where id=p_user_id for update;
  if not found or v_auth_phone is null or
     regexp_replace(v_auth_phone,'[^0-9]','','g') <> regexp_replace(p_phone,'[^0-9]','','g') or
     v_confirmed_at is null or v_created_at < now()-interval '15 minutes' then
    raise exception 'Fresh verified phone account required';
  end if;
  select * into v_user from public.users where id=p_user_id for update;
  if not found or regexp_replace(coalesce(v_user.phone,''),'[^0-9]','','g') <>
     regexp_replace(p_phone,'[^0-9]','','g') or not v_user.is_active then
    raise exception 'Account mismatch';
  end if;
  if v_user.role='technician' then return false; end if;
  if v_user.role<>'customer' or exists(select 1 from public.customer_profiles where user_id=p_user_id)
     or exists(select 1 from public.service_requests where customer_id=p_user_id)
     or exists(select 1 from public.technician_profiles where user_id=p_user_id) then
    raise exception 'Existing account cannot be converted';
  end if;
  if (select count(*) from public.service_categories where id=any(v_categories) and is_active)<>
      cardinality(v_categories) or
     not exists(select 1 from public.cities where id=p_city_id and is_active) or
     (select count(*) from public.districts where id=any(v_districts)
       and city_id=p_city_id and is_active)<>cardinality(v_districts) then
    raise exception 'Inactive or mismatched service selection';
  end if;

  update public.users set name=trim(p_name),email=nullif(trim(coalesce(p_email,'')),''),
    role='technician' where id=p_user_id;
  insert into public.technician_profiles(user_id,approval_status,is_available)
    values(p_user_id,'pending',false) on conflict (user_id) do nothing;
  insert into public.technician_service_categories(technician_id,category_id)
    select p_user_id,unnest(v_categories) on conflict do nothing;
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    select p_user_id,p_city_id,unnest(v_districts) on conflict do nothing;
  return true;
end $$;

revoke all on function public.complete_technician_registration(
  uuid,text,text,text,uuid[],bigint,bigint[]) from public,anon,authenticated;
grant execute on function public.complete_technician_registration(
  uuid,text,text,text,uuid[],bigint,bigint[]) to service_role;

commit;
