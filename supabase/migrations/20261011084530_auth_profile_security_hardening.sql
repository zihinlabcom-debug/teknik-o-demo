-- Auth/profile hardening. This is a forward-only migration; existing rows and
-- service-request address references are preserved.
begin;

do $$
begin
  if to_regclass('public.users') is null
     or to_regclass('public.customer_addresses') is null
     or to_regprocedure('public.complete_customer_password_registration(uuid,text,text,text,bigint,bigint,text)') is null
     or to_regprocedure('public.complete_technician_registration(uuid,text,text,text,uuid[],bigint,bigint[],bigint,bigint,text)') is null then
    raise exception 'Auth/profile prerequisite migration is missing';
  end if;
end $$;

-- F-01: phone is owned by Supabase Auth. Legacy name/email updates remain
-- compatible, but clients can no longer change the mirrored phone directly.
revoke update on public.users from authenticated;
grant update(name,email) on public.users to authenticated;

-- F-02/F-07: profile addresses are mutated only through the validating
-- service-role RPC. Old rows are retained as archived rows instead of deleted.
revoke insert,update,delete on public.customer_addresses from authenticated;
drop policy if exists customer_addresses_insert on public.customer_addresses;
drop policy if exists customer_addresses_update on public.customer_addresses;
drop policy if exists customer_addresses_delete on public.customer_addresses;

alter table public.customer_addresses
  add column if not exists profile_archived_at timestamptz;

update public.customer_addresses
set profile_archived_at=coalesce(profile_archived_at,now())
where profile_slot is null;

drop index if exists public.customer_addresses_profile_slot_unique;
create unique index customer_addresses_profile_slot_unique
  on public.customer_addresses(customer_id,profile_slot)
  where profile_slot is not null and profile_archived_at is null;

alter table public.customer_addresses
  drop constraint if exists customer_addresses_profile_state_check;
alter table public.customer_addresses
  add constraint customer_addresses_profile_state_check check (
    (profile_slot between 1 and 3 and profile_archived_at is null)
    or (profile_slot is null and profile_archived_at is not null)
  ) not valid;
alter table public.customer_addresses
  validate constraint customer_addresses_profile_state_check;

-- F-05: synchronize the public mirror only after the Auth phone is confirmed.
-- The function is retry-safe and independently checks auth.users.
create or replace function public.sync_verified_account_phone(
  p_actor_id uuid,p_phone text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_auth_phone text;v_confirmed_at timestamptz;
begin
  if p_actor_id is null or p_phone !~ '^\+905[0-9]{9}$' then
    raise exception 'Invalid phone synchronization request';
  end if;
  select phone,phone_confirmed_at into v_auth_phone,v_confirmed_at
  from auth.users where id=p_actor_id for update;
  if not found or v_confirmed_at is null or
     regexp_replace(coalesce(v_auth_phone,''),'[^0-9]','','g')<>
       regexp_replace(p_phone,'[^0-9]','','g') then
    raise exception 'Verified Auth phone required';
  end if;
  update public.users set phone=p_phone,updated_at=now()
  where id=p_actor_id and is_active;
  if not found then raise exception 'Active account required'; end if;
  return true;
end $$;
revoke all on function public.sync_verified_account_phone(uuid,text)
  from public,anon,authenticated;
grant execute on function public.sync_verified_account_phone(uuid,text) to service_role;

-- F-04: an OTP-confirmed account can complete an interrupted registration on
-- a later authenticated retry. Existing profiles and used customer accounts
-- are never overwritten or converted.
create or replace function public.complete_customer_password_registration(
  p_user_id uuid,p_phone text,p_name text,p_email text,
  p_city_id bigint,p_district_id bigint,p_address_line text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_auth_phone text;v_confirmed_at timestamptz;v_user public.users%rowtype;
begin
  if p_user_id is null or p_phone !~ '^\+905[0-9]{9}$'
     or p_name is null or length(btrim(p_name)) not between 2 and 200
     or (p_email is not null and (length(p_email)>320 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'))
     or p_city_id is null or p_district_id is null or p_address_line is null
     or length(btrim(p_address_line)) not between 10 and 500 then
    raise exception 'Invalid customer registration';
  end if;
  if not exists(select 1 from public.cities where id=p_city_id and is_active)
     or not exists(select 1 from public.districts where id=p_district_id and city_id=p_city_id and is_active) then
    raise exception 'Inactive or mismatched address selection';
  end if;
  select phone,phone_confirmed_at into v_auth_phone,v_confirmed_at
  from auth.users where id=p_user_id for update;
  if not found or v_confirmed_at is null or
     regexp_replace(coalesce(v_auth_phone,''),'[^0-9]','','g')<>
       regexp_replace(p_phone,'[^0-9]','','g') then
    raise exception 'Verified phone account required';
  end if;
  select * into v_user from public.users where id=p_user_id for update;
  if not found or v_user.role<>'customer' or not v_user.is_active
     or exists(select 1 from public.technician_profiles where user_id=p_user_id)
     or exists(select 1 from public.service_requests where customer_id=p_user_id) then
    raise exception 'Account cannot be registered as customer';
  end if;
  if exists(select 1 from public.customer_profiles where user_id=p_user_id) then
    return false;
  end if;
  update public.users set name=btrim(p_name),phone=p_phone,
    email=nullif(btrim(coalesce(p_email,'')),''),updated_at=now() where id=p_user_id;
  insert into public.customer_profiles(user_id) values(p_user_id);
  insert into public.customer_addresses(customer_id,label,city,district,address_line,
    city_id,district_id,is_default,profile_slot,profile_archived_at)
  select p_user_id,'Adres 1',c.name,d.name,btrim(p_address_line),c.id,d.id,true,1,null
  from public.cities c join public.districts d on d.city_id=c.id
  where c.id=p_city_id and d.id=p_district_id;
  return true;
end $$;
revoke all on function public.complete_customer_password_registration(
  uuid,text,text,text,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_customer_password_registration(
  uuid,text,text,text,bigint,bigint,text) to service_role;

create or replace function public.update_customer_profile(
  p_actor_id uuid,p_name text,p_email text,p_addresses jsonb
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_address jsonb;v_slot integer;v_city bigint;v_district bigint;
  v_line text;v_label text;v_slots smallint[]:=array[]::smallint[];
begin
  if not exists(select 1 from public.users where id=p_actor_id and role='customer' and is_active) then
    raise exception 'Active customer required';
  end if;
  if p_name is null or length(btrim(p_name)) not between 2 and 200
     or (p_email is not null and (length(p_email)>320 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'))
     or jsonb_typeof(p_addresses)<>'array' or jsonb_array_length(p_addresses)>3 then
    raise exception 'Invalid profile data';
  end if;
  update public.users set name=btrim(p_name),email=nullif(btrim(coalesce(p_email,'')),''),updated_at=now()
  where id=p_actor_id;
  insert into public.customer_profiles(user_id) values(p_actor_id) on conflict do nothing;
  for v_address in select value from jsonb_array_elements(p_addresses) loop
    begin
      v_slot:=(v_address->>'slot')::integer;v_city:=(v_address->>'cityId')::bigint;
      v_district:=(v_address->>'districtId')::bigint;
    exception when others then raise exception 'Invalid address identifiers'; end;
    v_line:=btrim(coalesce(v_address->>'addressLine',''));
    v_label:=left(btrim(coalesce(v_address->>'label','Adres '||v_slot)),40);
    if v_slot not between 1 and 3 or length(v_line) not between 10 and 500 or length(v_label)<1
       or not exists(select 1 from public.cities where id=v_city and is_active)
       or not exists(select 1 from public.districts where id=v_district and city_id=v_city and is_active) then
      raise exception 'Invalid address';
    end if;
    if v_slot=any(v_slots) then raise exception 'Duplicate address slot'; end if;
    v_slots:=array_append(v_slots,v_slot::smallint);
    insert into public.customer_addresses(customer_id,label,city,district,address_line,
      city_id,district_id,is_default,profile_slot,profile_archived_at,updated_at)
    select p_actor_id,v_label,c.name,d.name,v_line,c.id,d.id,v_slot=1,v_slot,null,now()
    from public.cities c join public.districts d on d.city_id=c.id
    where c.id=v_city and d.id=v_district
    on conflict(customer_id,profile_slot) where profile_slot is not null and profile_archived_at is null
    do update set label=excluded.label,city=excluded.city,district=excluded.district,
      address_line=excluded.address_line,city_id=excluded.city_id,district_id=excluded.district_id,
      is_default=excluded.is_default,updated_at=now();
  end loop;
  update public.customer_addresses set profile_slot=null,profile_archived_at=now(),is_default=false,updated_at=now()
  where customer_id=p_actor_id and profile_slot is not null
    and not(profile_slot=any(v_slots));
  update public.customer_profiles set updated_at=now() where user_id=p_actor_id;
  return true;
end $$;
revoke all on function public.update_customer_profile(uuid,text,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.update_customer_profile(uuid,text,text,jsonb) to service_role;

create or replace function public.complete_technician_registration(
  p_user_id uuid,p_phone text,p_name text,p_email text,p_category_ids uuid[],
  p_city_id bigint,p_district_ids bigint[],p_address_city_id bigint,
  p_address_district_id bigint,p_address_line text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_user public.users%rowtype;v_auth_phone text;v_confirmed_at timestamptz;
  v_categories uuid[];v_districts bigint[];
begin
  if p_user_id is null or p_phone !~ '^\+905[0-9]{9}$'
     or p_name is null or length(btrim(p_name)) not between 2 and 200
     or (p_email is not null and (length(p_email)>320 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'))
     or p_city_id is null or p_address_city_id is null or p_address_district_id is null
     or p_address_line is null or length(btrim(p_address_line)) not between 10 and 500 then
    raise exception 'Invalid technician registration';
  end if;
  select array_agg(distinct x order by x) into v_categories from unnest(p_category_ids) x;
  select array_agg(distinct x order by x) into v_districts from unnest(p_district_ids) x;
  if v_categories is null or v_districts is null or cardinality(v_categories)>30
     or cardinality(v_districts)>100 or array_position(v_categories,null) is not null
     or array_position(v_districts,null) is not null then
    raise exception 'Category and district selections required';
  end if;
  select phone,phone_confirmed_at into v_auth_phone,v_confirmed_at
  from auth.users where id=p_user_id for update;
  if not found or v_confirmed_at is null or
     regexp_replace(coalesce(v_auth_phone,''),'[^0-9]','','g')<>
       regexp_replace(p_phone,'[^0-9]','','g') then
    raise exception 'Verified phone account required';
  end if;
  select * into v_user from public.users where id=p_user_id for update;
  if not found or not v_user.is_active then raise exception 'Account mismatch'; end if;
  if v_user.role='technician' and exists(select 1 from public.technician_profiles where user_id=p_user_id) then
    return false;
  end if;
  if v_user.role<>'customer' or exists(select 1 from public.customer_profiles where user_id=p_user_id)
     or exists(select 1 from public.service_requests where customer_id=p_user_id)
     or exists(select 1 from public.technician_profiles where user_id=p_user_id) then
    raise exception 'Existing account cannot be converted';
  end if;
  if (select count(*) from public.service_categories where id=any(v_categories) and is_active)<>cardinality(v_categories)
     or not exists(select 1 from public.cities where id=p_city_id and is_active)
     or (select count(*) from public.districts where id=any(v_districts) and city_id=p_city_id and is_active)<>cardinality(v_districts)
     or not exists(select 1 from public.cities where id=p_address_city_id and is_active)
     or not exists(select 1 from public.districts where id=p_address_district_id and city_id=p_address_city_id and is_active) then
    raise exception 'Inactive or mismatched selection';
  end if;
  update public.users set name=btrim(p_name),phone=p_phone,
    email=nullif(btrim(coalesce(p_email,'')),''),role='technician',updated_at=now() where id=p_user_id;
  insert into public.technician_profiles(user_id,approval_status,is_available,address_city_id,address_district_id,address_line)
  values(p_user_id,'pending',false,p_address_city_id,p_address_district_id,btrim(p_address_line))
  on conflict(user_id) do update set
    approval_status='pending',is_available=false,address_city_id=excluded.address_city_id,
    address_district_id=excluded.address_district_id,address_line=excluded.address_line,
    updated_at=now();
  insert into public.technician_service_categories(technician_id,category_id)
    select p_user_id,unnest(v_categories) on conflict do nothing;
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    select p_user_id,p_city_id,unnest(v_districts) on conflict do nothing;
  return true;
end $$;
revoke all on function public.complete_technician_registration(
  uuid,text,text,text,uuid[],bigint,bigint[],bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_technician_registration(
  uuid,text,text,text,uuid[],bigint,bigint[],bigint,bigint,text) to service_role;

commit;
