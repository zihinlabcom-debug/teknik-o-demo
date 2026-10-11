-- Disposable Supabase bootstrap used only by the local Auth integration gate.
\set ON_ERROR_STOP on
create extension if not exists pgcrypto;

create table public.users(
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,role text not null,phone text,email text,
  is_active boolean not null default true,is_test boolean not null default false,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.customer_profiles(user_id uuid primary key references public.users(id) on delete cascade,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.technician_profiles(
  user_id uuid primary key references public.users(id) on delete cascade,
  approval_status text not null default 'pending',is_available boolean not null default false,
  address_city_id bigint,address_district_id bigint,address_line text,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.cities(id bigint generated always as identity primary key,name text not null unique,plate_code integer unique,is_active boolean not null default true);
create table public.districts(id bigint generated always as identity primary key,city_id bigint not null references public.cities(id),name text not null,is_active boolean not null default true,unique(id,city_id));
alter table public.technician_profiles add foreign key(address_city_id) references public.cities(id);
alter table public.technician_profiles add foreign key(address_district_id,address_city_id) references public.districts(id,city_id);
create table public.customer_addresses(
  id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  label text,city text,district text,address_line text,city_id bigint references public.cities(id),district_id bigint,
  is_default boolean default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  foreign key(district_id,city_id) references public.districts(id,city_id)
);
create table public.service_categories(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,is_active boolean not null default true,requires_document boolean not null default false);
create table public.technician_service_categories(
  technician_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  category_id uuid not null references public.service_categories(id),approval_status text not null default 'pending',
  created_at timestamptz not null default now(),primary key(technician_id,category_id)
);
create table public.technician_service_areas(
  technician_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  city_id bigint not null references public.cities(id),district_id bigint,created_at timestamptz not null default now(),
  foreign key(district_id,city_id) references public.districts(id,city_id)
);
create unique index technician_service_areas_city_unique on public.technician_service_areas(technician_id,city_id) where district_id is null;
create unique index technician_service_areas_district_unique on public.technician_service_areas(technician_id,city_id,district_id) where district_id is not null;
create table public.service_requests(id uuid primary key default gen_random_uuid(),customer_id uuid references public.users(id));
create table public.technician_documents(
  id uuid primary key default gen_random_uuid(),technician_id uuid not null references public.technician_profiles(user_id),
  category_id uuid references public.service_categories(id),document_type text not null,status text not null default 'pending',
  storage_path text,original_file_name text,mime_type text,rejection_reason text,created_at timestamptz not null default now()
);

create or replace function public.is_app_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.users where id=(select auth.uid()) and role='admin' and is_active)
$$;
create or replace function public.create_customer_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.users(id,name,role,phone,email,is_test)
  values(new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'full_name'),200),''),'Müşteri'),'customer',new.phone,new.email,false);
  return new;
end $$;
create trigger on_auth_user_created_tekniko after insert on auth.users for each row execute function public.create_customer_account();

create or replace function public.ensure_technician_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.role='technician' then insert into public.technician_profiles(user_id) values(new.id) on conflict do nothing; end if;
  return new;
end $$;
create trigger ensure_technician_profile after update of role on public.users for each row execute function public.ensure_technician_profile();

create or replace function public.stage4_new_category_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
  new.approval_status:=case when (select requires_document from public.service_categories where id=new.category_id) then 'pending_document' else 'pending' end;
  return new;
end $$;
create trigger stage4_new_category_status before insert on public.technician_service_categories for each row execute function public.stage4_new_category_status();

create or replace function public.complete_technician_registration(
  p_user_id uuid,p_phone text,p_name text,p_email text,p_category_ids uuid[],
  p_city_id bigint,p_district_ids bigint[],p_address_city_id bigint,
  p_address_district_id bigint,p_address_line text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_auth_phone text;v_confirmed timestamptz;v_created timestamptz;v_categories uuid[];v_districts bigint[];
begin
  select array_agg(distinct x order by x) into v_categories from unnest(p_category_ids)x;
  select array_agg(distinct x order by x) into v_districts from unnest(p_district_ids)x;
  if p_phone !~ '^\+905[0-9]{9}$' or length(btrim(p_name)) not between 2 and 200
    or length(btrim(p_address_line)) not between 10 and 500 or v_categories is null or v_districts is null then
    raise exception 'Invalid technician registration';
  end if;
  select phone,phone_confirmed_at,created_at into v_auth_phone,v_confirmed,v_created from auth.users where id=p_user_id for update;
  if not found or v_confirmed is null or v_created<now()-interval '30 minutes'
    or regexp_replace(v_auth_phone,'[^0-9]','','g')<>regexp_replace(p_phone,'[^0-9]','','g') then
    raise exception 'Fresh verified phone account required';
  end if;
  if not exists(select 1 from public.users where id=p_user_id and role='customer' and is_active)
    or exists(select 1 from public.customer_profiles where user_id=p_user_id)
    or (select count(*) from public.service_categories where id=any(v_categories) and is_active)<>cardinality(v_categories)
    or (select count(*) from public.districts where id=any(v_districts) and city_id=p_city_id and is_active)<>cardinality(v_districts)
    or not exists(select 1 from public.districts where id=p_address_district_id and city_id=p_address_city_id and is_active) then
    raise exception 'Account or catalog mismatch';
  end if;
  update public.users set name=btrim(p_name),email=nullif(btrim(coalesce(p_email,'')),''),role='technician',updated_at=now() where id=p_user_id;
  update public.technician_profiles set address_city_id=p_address_city_id,address_district_id=p_address_district_id,address_line=btrim(p_address_line),updated_at=now() where user_id=p_user_id;
  insert into public.technician_service_categories(technician_id,category_id) select p_user_id,unnest(v_categories);
  insert into public.technician_service_areas(technician_id,city_id,district_id) select p_user_id,p_city_id,unnest(v_districts);
  return true;
end $$;

alter table public.users enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.technician_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.technician_service_categories enable row level security;
alter table public.technician_service_areas enable row level security;
alter table public.technician_documents enable row level security;
create policy users_read_self on public.users for select to authenticated
  using(id=(select auth.uid()) or (select public.is_app_admin()));
create policy customer_profiles_read on public.customer_profiles for select to authenticated
  using(user_id=(select auth.uid()) or (select public.is_app_admin()));
create policy technician_profiles_read on public.technician_profiles for select to authenticated
  using(user_id=(select auth.uid()) or (select public.is_app_admin()));
create policy customer_addresses_read on public.customer_addresses for select to authenticated
  using(customer_id=(select auth.uid()) or (select public.is_app_admin()));
create policy customer_addresses_insert on public.customer_addresses for insert to authenticated
  with check(customer_id=(select auth.uid()));
create policy customer_addresses_update on public.customer_addresses for update to authenticated
  using(customer_id=(select auth.uid())) with check(customer_id=(select auth.uid()));
create policy customer_addresses_delete on public.customer_addresses for delete to authenticated
  using(customer_id=(select auth.uid()));
create policy technician_categories_read on public.technician_service_categories for select to authenticated
  using(technician_id=(select auth.uid()) or (select public.is_app_admin()));
create policy technician_areas_read on public.technician_service_areas for select to authenticated
  using(technician_id=(select auth.uid()) or (select public.is_app_admin()));
create policy technician_documents_read on public.technician_documents for select to authenticated
  using(technician_id=(select auth.uid()) or (select public.is_app_admin()));
grant select on public.users,public.customer_profiles,public.technician_profiles,
  public.customer_addresses,public.technician_service_categories,
  public.technician_service_areas,public.technician_documents to authenticated;
grant update(name,phone,email) on public.users to authenticated;
grant insert,update,delete on public.customer_addresses to authenticated;
grant usage on schema public to anon,authenticated,service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('technician-documents','technician-documents',false,10485760,
  array['application/pdf','image/jpeg','image/png']) on conflict do nothing;
create policy technician_document_owner_admin_read on storage.objects for select to authenticated
using(bucket_id='technician-documents' and (
  (storage.foldername(name))[1]='technician' and
  (storage.foldername(name))[2]=(select auth.uid())::text
  or (select public.is_app_admin())
));
create policy technician_document_read_guard on storage.objects as restrictive
  for select to authenticated using(bucket_id<>'technician-documents' or (
    (storage.foldername(name))[1]='technician' and
    (storage.foldername(name))[2]=(select auth.uid())::text
    or (select public.is_app_admin())
  ));
create policy technician_document_insert_guard on storage.objects as restrictive
  for insert to anon,authenticated with check(bucket_id<>'technician-documents');
create policy technician_document_update_guard on storage.objects as restrictive
  for update to anon,authenticated using(bucket_id<>'technician-documents')
  with check(bucket_id<>'technician-documents');
create policy technician_document_delete_guard on storage.objects as restrictive
  for delete to anon,authenticated using(bucket_id<>'technician-documents');

insert into public.cities(name,plate_code) values('İstanbul',34);
insert into public.districts(city_id,name) select id,'Kadıköy' from public.cities where plate_code=34;
insert into public.districts(city_id,name) select id,'Üsküdar' from public.cities where plate_code=34;
insert into public.service_categories(code,name,requires_document) values('boiler','Kombi',true),('painting','Boya',false);
