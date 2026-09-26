-- Teknik-O closed field-test schema. No existing table or row is dropped.
-- Run only after inspecting the target project; the assertions below stop on drift.
begin;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name varchar not null,
  role varchar not null,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.users alter column id drop default;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists is_active boolean not null default true;
alter table public.users add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles add column if not exists created_at timestamptz not null default now();
alter table public.customer_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.customer_profiles alter column updated_at set not null;
create table if not exists public.technician_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  approval_status text default 'pending',
  is_available boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.technician_profiles add column if not exists approval_status text default 'pending';
alter table public.technician_profiles add column if not exists is_available boolean default true;
alter table public.technician_profiles alter column approval_status set default 'pending';
alter table public.technician_profiles add column if not exists created_at timestamptz not null default now();
alter table public.technician_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.technician_profiles alter column created_at set not null;
alter table public.technician_profiles alter column updated_at set not null;

-- The inspected live project has an empty, manually created table with these
-- two spelling mistakes. Rename it in place so its identity/FK/RLS survive.
do $$ begin
  if to_regclass('public.customer_adresses') is not null then
    if to_regclass('public.customer_addresses') is not null then
      raise exception 'Both customer_adresses and customer_addresses exist; review before migration';
    end if;
    alter table public.customer_adresses rename to customer_addresses;
  end if;
end $$;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public'
             and table_name='customer_addresses' and column_name='adress_line') then
    if exists (select 1 from information_schema.columns where table_schema='public'
               and table_name='customer_addresses' and column_name='address_line') then
      raise exception 'Both adress_line and address_line exist; review before migration';
    end if;
    alter table public.customer_addresses rename column adress_line to address_line;
  end if;
end $$;

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  label text,
  city text,
  district text,
  address_line text,
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customer_addresses add column if not exists created_at timestamptz not null default now();
alter table public.customer_addresses add column if not exists updated_at timestamptz not null default now();
alter table public.customer_addresses alter column customer_id set not null;
alter table public.customer_addresses alter column updated_at set not null;

create table if not exists public.cities (
  id bigint generated always as identity primary key,
  name text not null unique,
  plate_code integer unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.districts (
  id bigint generated always as identity primary key,
  city_id bigint not null references public.cities(id) on delete restrict,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (city_id, name),
  unique (id, city_id)
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.service_types (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, code),
  unique (id, category_id)
);
create table if not exists public.technician_service_categories (
  technician_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (technician_id, category_id)
);
create table if not exists public.technician_service_areas (
  technician_id uuid not null references public.technician_profiles(user_id) on delete cascade,
  city_id bigint not null references public.cities(id) on delete restrict,
  district_id bigint,
  created_at timestamptz not null default now()
);

-- Existing request/log/raw tables are never recreated by this migration.
do $$ begin
  if to_regclass('public.service_requests') is null
     or to_regclass('public.diagnostic_logs') is null
     or to_regclass('public.official_error_codes_raw') is null then
    raise exception 'Expected existing service_requests, diagnostic_logs and official_error_codes_raw tables';
  end if;
  if (select count(*) from public.official_error_codes_raw) <> 1422 then
    raise exception 'official_error_codes_raw must contain exactly 1422 rows before migration';
  end if;
end $$;
alter table public.service_requests add column if not exists category_id uuid;
alter table public.service_requests add column if not exists service_type_id uuid;
alter table public.service_requests add column if not exists address_id uuid;
alter table public.service_requests add column if not exists updated_at timestamptz not null default now();

-- Check structure before altering existing manual tables. A mismatch must be reviewed,
-- not silently replaced or copied into a second table.
do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('public.users','id','uuid',false),
      ('public.users','name','character varying',false),
      ('public.users','role','character varying',false),
      ('public.users','is_active','boolean',false),
      ('public.customer_profiles','user_id','uuid',false),
      ('public.technician_profiles','user_id','uuid',false),
      ('public.customer_addresses','customer_id','uuid',false),
      ('public.service_requests','id','uuid',false),
      ('public.service_requests','customer_id','uuid',true),
      ('public.service_requests','technician_id','uuid',true),
      ('public.service_requests','status','character varying',false),
      ('public.service_requests','category','character varying',true),
      ('public.service_requests','issue_title','character varying',true),
      ('public.service_requests','confidence_score','integer',true),
      ('public.service_requests','base_part','numeric',true),
      ('public.service_requests','base_labor','numeric',true),
      ('public.service_requests','risk_premium','numeric',true),
      ('public.service_requests','service_fee','numeric',true),
      ('public.service_requests','final_price','numeric',true),
      ('public.service_requests','uncertain_scenarios','jsonb',true),
      ('public.service_requests','created_at','timestamp with time zone',true),
      ('public.official_error_codes_raw','id','bigint',false)
    ) as expected(table_name,column_name,data_type,nullable)
  loop
    if not exists (
      select 1 from information_schema.columns c
      where (c.table_schema || '.' || c.table_name) = item.table_name
        and c.column_name = item.column_name
        and c.data_type = item.data_type
        and (c.is_nullable = 'YES') = item.nullable
    ) then
      raise exception 'Schema mismatch: %.%', item.table_name, item.column_name;
    end if;
  end loop;
  if exists (select 1 from public.users where role not in ('customer','technician','admin')) then
    raise exception 'Unsupported public.users.role value';
  end if;
  if exists (select 1 from public.technician_profiles
             where approval_status not in ('pending','approved','rejected','suspended')) then
    raise exception 'Unsupported technician approval_status';
  end if;
  if exists (
    select 1 from (values
      ('public.users'),('public.customer_profiles'),('public.technician_profiles'),
      ('public.customer_addresses'),('public.service_requests'),
      ('public.diagnostic_logs'),('public.official_error_codes_raw')
    ) as required(table_name)
    where not exists (select 1 from pg_constraint k
                      where k.conrelid=required.table_name::regclass and k.contype='p')
  ) then
    raise exception 'An existing core table has no primary key';
  end if;
end $$;

-- A manual FK with the wrong target/action is an error. Equivalent unnamed FKs
-- are reused; no duplicate FK is added merely because its name differs.
create or replace function pg_temp.ensure_fk(
  source_table regclass, source_column text, target_table regclass,
  target_column text, delete_action text, constraint_name text
) returns void language plpgsql as $$
declare existing record;
begin
  select c.confrelid, c.confdeltype, a2.attname as target_col into existing
  from pg_constraint c
  join pg_attribute a1 on a1.attrelid=c.conrelid and a1.attnum=c.conkey[1]
  join pg_attribute a2 on a2.attrelid=c.confrelid and a2.attnum=c.confkey[1]
  where c.conrelid=source_table and c.contype='f'
    and cardinality(c.conkey)=1 and a1.attname=source_column
  limit 1;
  if found then
    if existing.confrelid <> target_table or existing.target_col <> target_column
      or existing.confdeltype <> case delete_action when 'CASCADE' then 'c' when 'RESTRICT' then 'r' else 'a' end then
      raise exception 'Conflicting FK on %.%', source_table, source_column;
    end if;
    return;
  end if;
  execute format('alter table %s add constraint %I foreign key (%I) references %s(%I) on delete %s',
                 source_table, constraint_name, source_column, target_table, target_column, delete_action);
end $$;

select pg_temp.ensure_fk('public.users','id','auth.users','id','CASCADE','users_id_auth_fk');
select pg_temp.ensure_fk('public.customer_profiles','user_id','public.users','id','CASCADE','customer_profiles_user_fk');
select pg_temp.ensure_fk('public.technician_profiles','user_id','public.users','id','CASCADE','technician_profiles_user_fk');
select pg_temp.ensure_fk('public.customer_addresses','customer_id','public.customer_profiles','user_id','CASCADE','customer_addresses_customer_fk');
select pg_temp.ensure_fk('public.service_requests','customer_id','public.users','id','NO ACTION','service_requests_customer_fk');
select pg_temp.ensure_fk('public.service_requests','technician_id','public.users','id','NO ACTION','service_requests_technician_fk');
select pg_temp.ensure_fk('public.diagnostic_logs','request_id','public.service_requests','id','CASCADE','diagnostic_logs_request_fk');
select pg_temp.ensure_fk('public.service_requests','category_id','public.service_categories','id','NO ACTION','service_requests_category_fk');
select pg_temp.ensure_fk('public.service_requests','service_type_id','public.service_types','id','NO ACTION','service_requests_service_type_fk');
select pg_temp.ensure_fk('public.service_requests','address_id','public.customer_addresses','id','NO ACTION','service_requests_address_fk');

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.users'::regclass and conname='users_role_check') then
    alter table public.users add constraint users_role_check check (role in ('customer','technician','admin'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.technician_profiles'::regclass and conname='technician_approval_status_check') then
    alter table public.technician_profiles add constraint technician_approval_status_check
      check (approval_status in ('pending','approved','rejected','suspended'));
  end if;
end $$;

insert into public.service_categories (code, name)
values ('boiler','Kombi'),('painting','Boya'),('cleaning','Temizlik'),
       ('upholstery_carpet','Koltuk & Halı Yıkama')
on conflict (code) do nothing;
do $$ begin
  if exists (select 1 from public.service_categories
             where (code,name) in (('boiler','Kombi'),('painting','Boya'),('cleaning','Temizlik'),('upholstery_carpet','Koltuk & Halı Yıkama'))
             and not is_active) or
     (select count(*) from public.service_categories
      where (code,name) in (('boiler','Kombi'),('painting','Boya'),('cleaning','Temizlik'),('upholstery_carpet','Koltuk & Halı Yıkama'))
        and is_active) <> 4 or
     (select count(*) from public.service_categories where is_active) <> 4 then
    raise exception 'Locked service category seed conflicts with existing data';
  end if;
end $$;

create unique index if not exists technician_service_areas_city_unique
  on public.technician_service_areas (technician_id, city_id) where district_id is null;
create unique index if not exists technician_service_areas_district_unique
  on public.technician_service_areas (technician_id, city_id, district_id) where district_id is not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.technician_service_areas'::regclass
                 and conname='technician_service_areas_district_city_fk') then
    alter table public.technician_service_areas add constraint technician_service_areas_district_city_fk
      foreign key (district_id,city_id) references public.districts(id,city_id) on delete restrict;
  end if;
end $$;

create index if not exists official_error_codes_raw_lookup_idx
  on public.official_error_codes_raw (brand,official_model,error_code);
create index if not exists service_requests_customer_created_idx
  on public.service_requests (customer_id,created_at desc);
create index if not exists service_requests_technician_status_idx
  on public.service_requests (technician_id,status);
create index if not exists service_requests_category_idx on public.service_requests (category_id);
create index if not exists customer_addresses_customer_idx on public.customer_addresses (customer_id);
create index if not exists technician_service_categories_category_idx
  on public.technician_service_categories (category_id);
create index if not exists technician_service_areas_city_district_idx
  on public.technician_service_areas (city_id,district_id);

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['users','customer_profiles','technician_profiles','customer_addresses',
                           'service_categories','service_types','service_requests'] loop
    if not exists (select 1 from pg_trigger where tgrelid=('public.'||t)::regclass
                   and tgname=t||'_set_updated_at') then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                     t||'_set_updated_at',t);
    end if;
  end loop;
end $$;

commit;
