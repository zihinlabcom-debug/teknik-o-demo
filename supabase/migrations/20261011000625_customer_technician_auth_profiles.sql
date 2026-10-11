-- Customer and technician password-auth profile support.
-- Password hashes remain exclusively in Supabase Auth; this migration stores
-- profile fields and private avatar object paths only.
begin;

alter table public.customer_profiles
  add column avatar_path text,
  add constraint customer_profile_avatar_path_check check
    (avatar_path is null or avatar_path='customer/'||user_id::text||'/avatar');

alter table public.technician_profiles
  add column avatar_path text,
  add constraint technician_profile_avatar_path_check check
    (avatar_path is null or avatar_path='technician/'||user_id::text||'/avatar');

alter table public.customer_addresses
  add column profile_slot smallint,
  add constraint customer_address_profile_slot_check check
    (profile_slot is null or profile_slot between 1 and 3);

with ranked as (
  select id,row_number() over(partition by customer_id order by is_default desc,created_at,id) as slot
  from public.customer_addresses
)
update public.customer_addresses a set profile_slot=r.slot
from ranked r where r.id=a.id and r.slot<=3 and a.profile_slot is null;

create unique index customer_addresses_profile_slot_unique
  on public.customer_addresses(customer_id,profile_slot) where profile_slot is not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-avatars','profile-avatars',false,5242880,
  array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists profile_avatar_owner_admin_read on storage.objects;
create policy profile_avatar_owner_admin_read on storage.objects for select to authenticated
using (bucket_id='profile-avatars' and (
  name in ('customer/'||(select auth.uid())::text||'/avatar',
           'technician/'||(select auth.uid())::text||'/avatar')
  or (select public.is_app_admin())
));
drop policy if exists profile_avatar_anon_read_guard on storage.objects;
create policy profile_avatar_anon_read_guard on storage.objects as restrictive
  for select to anon using (bucket_id<>'profile-avatars');
drop policy if exists profile_avatar_authenticated_read_guard on storage.objects;
create policy profile_avatar_authenticated_read_guard on storage.objects as restrictive
  for select to authenticated using (bucket_id<>'profile-avatars' or
    name in ('customer/'||(select auth.uid())::text||'/avatar',
             'technician/'||(select auth.uid())::text||'/avatar')
    or (select public.is_app_admin()));
drop policy if exists profile_avatar_insert_guard on storage.objects;
create policy profile_avatar_insert_guard on storage.objects as restrictive
  for insert to anon,authenticated with check (bucket_id<>'profile-avatars');
drop policy if exists profile_avatar_update_guard on storage.objects;
create policy profile_avatar_update_guard on storage.objects as restrictive
  for update to anon,authenticated using (bucket_id<>'profile-avatars')
  with check (bucket_id<>'profile-avatars');
drop policy if exists profile_avatar_delete_guard on storage.objects;
create policy profile_avatar_delete_guard on storage.objects as restrictive
  for delete to anon,authenticated using (bucket_id<>'profile-avatars');

create or replace function public.complete_customer_password_registration(
  p_user_id uuid,p_phone text,p_name text,p_email text,
  p_city_id bigint,p_district_id bigint,p_address_line text
) returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_auth_phone text;
  v_confirmed_at timestamptz;
  v_created_at timestamptz;
  v_user public.users%rowtype;
begin
  if p_user_id is null or p_phone !~ '^\+905[0-9]{9}$'
     or p_name is null or length(btrim(p_name)) not between 2 and 200
     or (p_email is not null and (length(p_email)>320 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'))
     or p_city_id is null or p_district_id is null or p_address_line is null
     or length(btrim(p_address_line)) not between 10 and 500 then
    raise exception 'Invalid customer registration';
  end if;
  if not exists(select 1 from public.cities where id=p_city_id and is_active)
     or not exists(select 1 from public.districts
       where id=p_district_id and city_id=p_city_id and is_active) then
    raise exception 'Inactive or mismatched address selection';
  end if;
  select phone,phone_confirmed_at,created_at into v_auth_phone,v_confirmed_at,v_created_at
    from auth.users where id=p_user_id for update;
  if not found or v_auth_phone is null or v_confirmed_at is null
     or regexp_replace(v_auth_phone,'[^0-9]','','g')<>
        regexp_replace(p_phone,'[^0-9]','','g')
     or v_created_at<now()-interval '30 minutes' then
    raise exception 'Fresh verified phone account required';
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
    city_id,district_id,is_default,profile_slot)
  select p_user_id,'Adres 1',c.name,d.name,btrim(p_address_line),c.id,d.id,true,1
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
declare
  v_address jsonb;
  v_slot integer;
  v_city bigint;
  v_district bigint;
  v_line text;
  v_label text;
  v_slots smallint[]:=array[]::smallint[];
begin
  if not exists(select 1 from public.users
    where id=p_actor_id and role='customer' and is_active) then
    raise exception 'Active customer required';
  end if;
  if p_name is null or length(btrim(p_name)) not between 2 and 200
     or (p_email is not null and (length(p_email)>320 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'))
     or jsonb_typeof(p_addresses)<>'array' or jsonb_array_length(p_addresses)>3 then
    raise exception 'Invalid profile data';
  end if;
  update public.users set name=btrim(p_name),email=nullif(btrim(coalesce(p_email,'')),''),
    updated_at=now() where id=p_actor_id;
  insert into public.customer_profiles(user_id) values(p_actor_id) on conflict do nothing;
  for v_address in select value from jsonb_array_elements(p_addresses) loop
    begin
      v_slot:=(v_address->>'slot')::integer;
      v_city:=(v_address->>'cityId')::bigint;
      v_district:=(v_address->>'districtId')::bigint;
    exception when others then raise exception 'Invalid address identifiers'; end;
    v_line:=btrim(coalesce(v_address->>'addressLine',''));
    v_label:=left(btrim(coalesce(v_address->>'label','Adres '||v_slot)),40);
    if v_slot not between 1 and 3 or length(v_line) not between 10 and 500
       or length(v_label)<1
       or not exists(select 1 from public.cities where id=v_city and is_active)
       or not exists(select 1 from public.districts
         where id=v_district and city_id=v_city and is_active) then
      raise exception 'Invalid address';
    end if;
    if v_slot=any(v_slots) then raise exception 'Duplicate address slot'; end if;
    v_slots:=array_append(v_slots,v_slot::smallint);
    insert into public.customer_addresses(customer_id,label,city,district,address_line,
      city_id,district_id,is_default,profile_slot,updated_at)
    select p_actor_id,v_label,c.name,d.name,v_line,c.id,d.id,v_slot=1,v_slot,now()
    from public.cities c join public.districts d on d.city_id=c.id
    where c.id=v_city and d.id=v_district
    on conflict(customer_id,profile_slot) where profile_slot is not null do update set
      label=excluded.label,city=excluded.city,district=excluded.district,
      address_line=excluded.address_line,city_id=excluded.city_id,
      district_id=excluded.district_id,is_default=excluded.is_default,updated_at=now();
  end loop;
  delete from public.customer_addresses where customer_id=p_actor_id
    and profile_slot is not null and not(profile_slot=any(v_slots));
  update public.customer_profiles set updated_at=now() where user_id=p_actor_id;
  return true;
end $$;
revoke all on function public.update_customer_profile(uuid,text,text,jsonb)
  from public,anon,authenticated;
grant execute on function public.update_customer_profile(uuid,text,text,jsonb) to service_role;

create or replace function public.update_technician_profile(
  p_actor_id uuid,p_name text,p_email text,p_address_city_id bigint,
  p_address_district_id bigint,p_address_line text,p_service_city_id bigint,
  p_service_district_ids bigint[]
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_districts bigint[];
begin
  if not exists(select 1 from public.users
    where id=p_actor_id and role='technician' and is_active) then
    raise exception 'Active technician required';
  end if;
  select array_agg(distinct x order by x) into v_districts
    from unnest(p_service_district_ids) x;
  if p_name is null or length(btrim(p_name)) not between 2 and 200
     or (p_email is not null and (length(p_email)>320 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'))
     or p_address_city_id is null or p_address_district_id is null
     or p_address_line is null or length(btrim(p_address_line)) not between 10 and 500
     or p_service_city_id is null or v_districts is null
     or cardinality(v_districts)>100 or array_position(v_districts,null) is not null
     or not exists(select 1 from public.cities where id=p_address_city_id and is_active)
     or not exists(select 1 from public.districts where id=p_address_district_id
       and city_id=p_address_city_id and is_active)
     or not exists(select 1 from public.cities where id=p_service_city_id and is_active)
     or (select count(*) from public.districts where id=any(v_districts)
       and city_id=p_service_city_id and is_active)<>cardinality(v_districts) then
    raise exception 'Invalid technician profile data';
  end if;
  update public.users set name=btrim(p_name),email=nullif(btrim(coalesce(p_email,'')),''),
    updated_at=now() where id=p_actor_id;
  update public.technician_profiles set address_city_id=p_address_city_id,
    address_district_id=p_address_district_id,address_line=btrim(p_address_line),
    updated_at=now() where user_id=p_actor_id;
  delete from public.technician_service_areas where technician_id=p_actor_id
    and (city_id<>p_service_city_id or district_id is null
      or not(district_id=any(v_districts)));
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    select p_actor_id,p_service_city_id,unnest(v_districts) on conflict do nothing;
  return true;
end $$;
revoke all on function public.update_technician_profile(
  uuid,text,text,bigint,bigint,text,bigint,bigint[]) from public,anon,authenticated;
grant execute on function public.update_technician_profile(
  uuid,text,text,bigint,bigint,text,bigint,bigint[]) to service_role;

create or replace function public.add_technician_profile_category(
  p_actor_id uuid,p_category_id uuid
) returns text language plpgsql security definer set search_path='' as $$
declare v_status text;
begin
  if not exists(select 1 from public.users u join public.technician_profiles p on p.user_id=u.id
    where u.id=p_actor_id and u.role='technician' and u.is_active) then
    raise exception 'Active technician required';
  end if;
  if not exists(select 1 from public.service_categories where id=p_category_id and is_active) then
    raise exception 'Active category required';
  end if;
  insert into public.technician_service_categories(technician_id,category_id)
    values(p_actor_id,p_category_id) on conflict do nothing;
  select approval_status into v_status from public.technician_service_categories
    where technician_id=p_actor_id and category_id=p_category_id;
  return v_status;
end $$;
revoke all on function public.add_technician_profile_category(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.add_technician_profile_category(uuid,uuid) to service_role;

commit;
