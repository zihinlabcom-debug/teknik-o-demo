-- Disposable PostgreSQL only. Never run against a linked Supabase project.
\set ON_ERROR_STOP on
do $$ begin if current_database()<>'tekniko_stage10_test' then raise exception 'Refusing Stage 10 fixture outside disposable database'; end if; end $$;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key,phone text,email text,phone_confirmed_at timestamptz,created_at timestamptz not null default now(),raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.users(id uuid primary key references auth.users(id),name text not null,role text not null,phone text,email text,is_active boolean not null default true,is_test boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.customer_profiles(user_id uuid primary key references public.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.technician_profiles(user_id uuid primary key references public.users(id),approval_status text not null default 'pending',is_available boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.cities(id bigint generated always as identity primary key,name text not null default 'Test',plate_code integer,is_active boolean not null default true,created_at timestamptz not null default now());
create table public.districts(id bigint generated always as identity primary key,city_id bigint not null references public.cities(id),name text not null default 'Test',is_active boolean not null default true,created_at timestamptz not null default now(),unique(id,city_id));
create table public.customer_addresses(id uuid primary key default gen_random_uuid(),customer_id uuid references public.customer_profiles(user_id),label text,city_id bigint references public.cities(id),district_id bigint,address_line text,is_default boolean default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),foreign key(district_id,city_id) references public.districts(id,city_id));
create table public.service_categories(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.service_types(id uuid primary key default gen_random_uuid(),category_id uuid not null references public.service_categories(id),code text not null,name text not null,is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(category_id,code),unique(id,category_id));
create table public.technician_service_categories(technician_id uuid not null references public.technician_profiles(user_id),category_id uuid not null references public.service_categories(id),created_at timestamptz not null default now(),primary key(technician_id,category_id));
create table public.technician_service_areas(technician_id uuid not null references public.technician_profiles(user_id),city_id bigint not null references public.cities(id),district_id bigint,created_at timestamptz not null default now(),foreign key(district_id,city_id) references public.districts(id,city_id));
create table public.service_requests(id uuid primary key default gen_random_uuid(),customer_id uuid references public.users(id),technician_id uuid references public.users(id),status text not null default 'diagnosing',category text,issue_title text,confidence_score integer,base_part numeric,base_labor numeric,risk_premium numeric,service_fee numeric,final_price numeric,uncertain_scenarios jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),category_id uuid references public.service_categories(id),service_type_id uuid references public.service_types(id),address_id uuid references public.customer_addresses(id));
create table public.diagnostic_logs(id uuid primary key default gen_random_uuid(),request_id uuid references public.service_requests(id));
create table public.official_error_codes_raw(id bigint generated always as identity primary key,brand text,official_model text,error_code text);
create function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at:=now();return new;end$$;
create function public.is_app_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.users where id=(select auth.uid()) and role='admin' and is_active)$$;
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
do $$ declare t text;begin foreach t in array array['users','customer_profiles','technician_profiles','customer_addresses','service_requests','diagnostic_logs','official_error_codes_raw','cities','districts','service_categories','service_types','technician_service_categories','technician_service_areas'] loop execute format('alter table public.%I enable row level security',t);end loop;end$$;
insert into public.service_categories(code,name) values('boiler','Kombi'),('painting','Boya'),('cleaning','Temizlik'),('upholstery_carpet','Koltuk & Halı Yıkama');
insert into public.official_error_codes_raw(brand,official_model,error_code)
  select 'Vaillant','fixture','F.28' from generate_series(1,1422);
