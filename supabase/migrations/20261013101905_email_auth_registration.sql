-- Email identity is owned by Auth; contact phone is NOT verified by email.
-- Forward only. No existing identity, profile or business record is migrated.
begin;
create schema if not exists account_private;
revoke all on schema account_private from public,anon,authenticated;
create table account_private.email_registrations (
  user_id uuid primary key references auth.users(id),
  email text not null, purpose text not null check(purpose in ('customer','technician')),
  application jsonb not null, completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table account_private.auth_limits (
  key text primary key, hits integer not null, resets_at timestamptz not null
);
create table account_private.recovery_uses (
  digest text primary key, expires_at timestamptz not null
);
alter table account_private.email_registrations enable row level security;
alter table account_private.auth_limits enable row level security;
alter table account_private.recovery_uses enable row level security;
revoke all on all tables in schema account_private from public,anon,authenticated;

create function public.email_auth_rate_limit(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if p_key is null or length(p_key)>160 or p_limit not between 1 and 1000
    or p_seconds not between 1 and 86400 then raise exception 'Invalid limit'; end if;
  insert into account_private.auth_limits(key,hits,resets_at)
  values(p_key,1,now()+make_interval(secs=>p_seconds))
  on conflict(key) do update set
    hits=case when account_private.auth_limits.resets_at<=now() then 1 else account_private.auth_limits.hits+1 end,
    resets_at=case when account_private.auth_limits.resets_at<=now() then excluded.resets_at else account_private.auth_limits.resets_at end
  returning hits into n;
  return n<=p_limit;
end $$;
revoke all on function public.email_auth_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.email_auth_rate_limit(text,integer,integer) to service_role;

create function public.email_auth_begin(p_user_id uuid,p_purpose text,p_application jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare e text; r account_private.email_registrations%rowtype;
begin
  select lower(email) into e from auth.users where id=p_user_id for update;
  if not found or e is null or e<>lower(p_application->>'email')
    or p_purpose not in ('customer','technician') then raise exception 'Identity mismatch'; end if;
  select * into r from account_private.email_registrations where user_id=p_user_id;
  if found then
    if r.purpose<>p_purpose or r.email<>e then raise exception 'Registration purpose mismatch'; end if;
    return false; -- An interrupted registration resumes the original data, never overwrites it.
  end if;
  if not exists(select 1 from public.users where id=p_user_id and role='customer' and is_active)
    or exists(select 1 from public.customer_profiles where user_id=p_user_id)
    or exists(select 1 from public.technician_profiles where user_id=p_user_id)
    or exists(select 1 from public.service_requests where customer_id=p_user_id)
  then raise exception 'Existing account cannot be registered again'; end if;
  insert into account_private.email_registrations(user_id,email,purpose,application)
  values(p_user_id,e,p_purpose,p_application);
  return true;
end $$;
revoke all on function public.email_auth_begin(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.email_auth_begin(uuid,text,jsonb) to service_role;

-- No caller supplied UID: this function discloses only the current caller's readiness.
create function public.email_account_ready()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.users u join auth.users a on a.id=u.id
  where u.id=(select auth.uid()) and u.is_active and
   (u.role='admin' or (a.email_confirmed_at is not null and a.email is not null and
    ((u.role='customer' and exists(select 1 from public.customer_profiles p where p.user_id=u.id))
    or (u.role='technician' and exists(select 1 from public.technician_profiles p where p.user_id=u.id)))))
 )
$$;
revoke all on function public.email_account_ready() from public,anon;
grant execute on function public.email_account_ready() to authenticated,service_role;

-- Preserve existing RLS ownership predicates, adding a restrictive verification gate.
-- Public catalog reads remain available for the registration form.
do $$
declare t record;
begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relrowsecurity
    and c.relname not in ('cities','districts','service_categories')
 loop
  execute format('create policy email_verified_profile_gate on public.%I as restrictive for all to authenticated using ((select public.email_account_ready())) with check ((select public.email_account_ready()))',t.relname);
 end loop;
end $$;
create policy email_verified_profile_gate on storage.objects as restrictive
 for all to authenticated using ((select public.email_account_ready()))
 with check ((select public.email_account_ready()));

-- Only Auth may change the login identity mirror. Legacy grants included email.
revoke update(email) on public.users from authenticated,anon;
create function account_private.protect_email_mirror()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email is distinct from old.email and not exists(
  select 1 from auth.users where id=new.id and email_confirmed_at is not null
   and lower(email)=lower(new.email)
 ) then raise exception 'Verified Auth email required'; end if;
 return new;
end $$;
revoke all on function account_private.protect_email_mirror() from public,anon,authenticated;
create trigger protect_email_mirror before update of email on public.users
 for each row execute function account_private.protect_email_mirror();
create or replace function account_private.complete_customer_password_registration(
  p_user_id uuid,p_phone text,p_name text,p_email text,
  p_city_id bigint,p_district_id bigint,p_address_line text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_auth_email text;v_confirmed_at timestamptz;v_user public.users%rowtype;
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
  select lower(email),email_confirmed_at into v_auth_email,v_confirmed_at
  from auth.users where id=p_user_id for update;
  if not found or v_confirmed_at is null or v_auth_email is null or
     v_auth_email is distinct from lower(p_email) or not exists(
       select 1 from account_private.email_registrations
       where user_id=p_user_id and purpose='customer' and email=v_auth_email
     ) then raise exception 'Verified email registration required'; end if;
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
create or replace function account_private.complete_technician_registration(
  p_user_id uuid,p_phone text,p_name text,p_email text,p_category_ids uuid[],
  p_city_id bigint,p_district_ids bigint[],p_address_city_id bigint,
  p_address_district_id bigint,p_address_line text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_user public.users%rowtype;v_auth_email text;v_confirmed_at timestamptz;
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
  select lower(email),email_confirmed_at into v_auth_email,v_confirmed_at
  from auth.users where id=p_user_id for update;
  if not found or v_confirmed_at is null or v_auth_email is null or
     v_auth_email is distinct from lower(p_email) or not exists(
       select 1 from account_private.email_registrations
       where user_id=p_user_id and purpose='technician' and email=v_auth_email
     ) then raise exception 'Verified email registration required'; end if;
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

revoke all on function account_private.complete_customer_password_registration(uuid,text,text,text,bigint,bigint,text) from public,anon,authenticated,service_role;
revoke all on function account_private.complete_technician_registration(uuid,text,text,text,uuid[],bigint,bigint[],bigint,bigint,text) from public,anon,authenticated,service_role;

create function public.email_auth_complete(p_user_id uuid,p_purpose text)
returns boolean language plpgsql security definer set search_path='' as $$
declare r account_private.email_registrations%rowtype; a jsonb; result boolean;
begin
 -- Same lock order in begin/complete, including concurrent retries.
 perform 1 from auth.users where id=p_user_id for update;
 select * into r from account_private.email_registrations where user_id=p_user_id for update;
 if not found or r.purpose<>p_purpose or not exists(
   select 1 from auth.users where id=p_user_id and email_confirmed_at is not null and lower(email)=r.email
 ) then raise exception 'Verified registration required'; end if;
 if r.completed_at is not null then return false; end if;
 a:=r.application;
 if r.purpose='customer' then
  result:=account_private.complete_customer_password_registration(p_user_id,a->>'phone',a->>'fullName',r.email,
   (a->>'cityId')::bigint,(a->>'districtId')::bigint,a->>'addressLine');
 else
  result:=account_private.complete_technician_registration(p_user_id,a->>'phone',a->>'fullName',r.email,
   array(select jsonb_array_elements_text(a->'categoryIds')::uuid),
   (a->>'cityId')::bigint,array(select jsonb_array_elements_text(a->'districtIds')::bigint),
   (a->>'addressCityId')::bigint,(a->>'addressDistrictId')::bigint,a->>'addressLine');
 end if;
 update account_private.email_registrations set completed_at=now() where user_id=p_user_id;
 return result;
end $$;
revoke all on function public.email_auth_complete(uuid,text) from public,anon,authenticated;
grant execute on function public.email_auth_complete(uuid,text) to service_role;

create function public.email_recovery_consume(p_digest text)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if p_digest !~ '^[a-f0-9]{64}$' then raise exception 'Invalid recovery capability'; end if;
 insert into account_private.recovery_uses(digest,expires_at)
 values(p_digest,now()+interval '1 day') on conflict do nothing;
 get diagnostics n=row_count;
 return n=1;
end $$;
revoke all on function public.email_recovery_consume(text) from public,anon,authenticated;
grant execute on function public.email_recovery_consume(text) to service_role;
-- Old phone completion RPCs stay defined for history, but no application role can call them.
revoke all on function public.complete_customer_password_registration(uuid,text,text,text,bigint,bigint,text) from service_role;
revoke all on function public.complete_technician_registration(uuid,text,text,text,uuid[],bigint,bigint[],bigint,bigint,text) from service_role;
create or replace function public.can_access_service_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
 select public.email_account_ready() and (
select exists (
    select 1
    from public.users me
    join public.service_requests r on r.id = p_request_id
    where me.id = (select auth.uid())
      and me.is_active
      and (
        me.role = 'admin'
        or (me.role = 'customer' and r.customer_id = me.id)
        or (
          me.role = 'technician'
          and exists (
            select 1 from public.service_jobs j
            where j.service_request_id = r.id and j.technician_id = me.id
          )
        )
      )
  )
 );
$$;
create or replace function public.is_active_app_technician()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 select public.email_account_ready() and (
select exists (
    select 1
    from public.users u
    where u.id=(select auth.uid())
      and u.role='technician'
      and u.is_active
  )
 );
$$;
create or replace function public.can_read_offered_dispatch(p_dispatch_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 select public.email_account_ready() and (
select exists (
    select 1
    from public.service_dispatches d
    join public.service_dispatch_candidates c on c.dispatch_id=d.id
    join public.users u on u.id=c.technician_id
    where d.id=p_dispatch_id
      and d.status in ('pending','broadcasting')
      and c.technician_id=(select auth.uid())
      and c.status='offered'
      and u.role='technician'
      and u.is_active
  )
 );
$$;
create or replace function public.can_read_offered_quote(p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 select public.email_account_ready() and (
select exists (
    select 1
    from public.service_dispatches d
    join public.service_dispatch_candidates c on c.dispatch_id=d.id
    join public.users u on u.id=c.technician_id
    where d.quote_id=p_quote_id
      and d.status in ('pending','broadcasting')
      and c.technician_id=(select auth.uid())
      and c.status='offered'
      and u.role='technician'
      and u.is_active
  )
 );
$$;
create or replace function public.can_read_service_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 select public.email_account_ready() and (
select exists (
    select 1
    from public.service_jobs j
    join public.service_requests r on r.id=j.service_request_id
    join public.users me on me.id=(select auth.uid())
    where j.id=p_job_id
      and me.is_active
      and (
        me.role='admin'
        or (me.role='customer' and r.customer_id=me.id)
        or (me.role='technician' and j.technician_id=me.id)
      )
  )
 );
$$;
create or replace function public.can_read_service_appointment(p_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 select public.email_account_ready() and (
select exists (
    select 1
    from public.service_appointments a
    join public.service_jobs j on j.id=a.job_id
    join public.service_requests r on r.id=j.service_request_id
    join public.users me on me.id=(select auth.uid())
    where a.id=p_appointment_id
      and me.is_active
      and (
        me.role='admin'
        or (me.role='customer' and r.customer_id=me.id)
        or (me.role='technician' and j.technician_id=me.id)
      )
  )
 );
$$;
create or replace function public.stage10_can_read_case_evidence(p_storage_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select public.email_account_ready() and (
select public.is_app_admin() or exists(
    select 1 from public.service_case_evidence e
    where e.storage_path=p_storage_path and e.uploader_user_id=(select auth.uid()) and e.complaint_id is null
  )
 );
$$;

create or replace function public.email_auth_pending(p_user_id uuid,p_purpose text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from account_private.email_registrations
  where user_id=p_user_id and purpose=p_purpose and completed_at is null)
$$;
revoke all on function public.email_auth_pending(uuid,text) from public,anon,authenticated;
grant execute on function public.email_auth_pending(uuid,text) to service_role;

-- sync_verified_account_phone is deliberately unchanged.
commit;
