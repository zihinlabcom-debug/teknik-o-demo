-- Disposable local database only. All data rolls back.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database()<>'tekniko_operation_test' then
    raise exception 'Refusing Stage 4 test outside disposable local database';
  end if;
end $$;
-- The operation-core fixture uses minimal city/district stubs; Stage 4 needs
-- the production catalog attributes. These additions roll back with the test.
alter table public.cities add column if not exists name text;
alter table public.cities add column if not exists is_active boolean not null default true;
alter table public.districts add column if not exists name text;
alter table public.districts add column if not exists is_active boolean not null default true;
create unique index if not exists technician_service_areas_city_unique
  on public.technician_service_areas(technician_id,city_id) where district_id is null;
create unique index if not exists technician_service_areas_district_unique
  on public.technician_service_areas(technician_id,city_id,district_id) where district_id is not null;
-- The compact operation fixture omits core-RLS grants and policies.
alter table public.technician_profiles enable row level security;
alter table public.technician_service_categories enable row level security;
alter table public.technician_service_areas enable row level security;
grant select on public.technician_profiles,public.technician_service_categories,
  public.technician_service_areas to authenticated;
drop policy if exists technician_profiles_read on public.technician_profiles;
create policy technician_profiles_read on public.technician_profiles for select to authenticated
  using (user_id=(select auth.uid()) or (select public.is_app_admin()));
drop policy if exists technician_service_categories_read on public.technician_service_categories;
create policy technician_service_categories_read on public.technician_service_categories for select to authenticated
  using (technician_id=(select auth.uid()) or (select public.is_app_admin()));
drop policy if exists technician_service_areas_read on public.technician_service_areas;
create policy technician_service_areas_read on public.technician_service_areas for select to authenticated
  using (technician_id=(select auth.uid()) or (select public.is_app_admin()));

create temporary table stage4_ids(k text primary key,v uuid not null) on commit drop;
insert into stage4_ids values
  ('admin',gen_random_uuid()),('tech1',gen_random_uuid()),
  ('tech2',gen_random_uuid()),('customer',gen_random_uuid()),
  ('category',gen_random_uuid()),('inactive_category',gen_random_uuid());
create function pg_temp.sid(p_key text) returns uuid language sql stable security definer set search_path='' as $$
  select v from pg_temp.stage4_ids where k=p_key
$$;
create function pg_temp.assert_ok(p_ok boolean,p_label text) returns void language plpgsql security definer set search_path='' as $$
begin if p_ok is distinct from true then raise exception 'FAILED: %',p_label; end if; end $$;

insert into auth.users(id) select v from pg_temp.stage4_ids where k in ('admin','tech1','tech2','customer');
insert into public.users(id,name,role,is_active) values
  (pg_temp.sid('admin'),'STAGE 4 TEST ADMIN','admin',true),
  (pg_temp.sid('tech1'),'STAGE 4 TEST USTA 1','technician',true),
  (pg_temp.sid('tech2'),'STAGE 4 TEST USTA 2','technician',true),
  (pg_temp.sid('customer'),'STAGE 4 TEST CUSTOMER','customer',true);

select pg_temp.assert_ok((select count(*)=2 from public.technician_profiles
  where user_id in (pg_temp.sid('tech1'),pg_temp.sid('tech2'))),
  'two technician profiles auto-provisioned');
insert into public.technician_profiles(user_id) select id from public.users
where role='technician' on conflict (user_id) do nothing;
select pg_temp.assert_ok((select count(*)=2 from public.technician_profiles
  where user_id in (pg_temp.sid('tech1'),pg_temp.sid('tech2'))),
  'provision/backfill retry creates no duplicate');
do $$ declare rejected boolean:=false; begin
  begin insert into public.technician_profiles(user_id) values(pg_temp.sid('customer'));
  exception when others then rejected:=true; end;
  perform pg_temp.assert_ok(rejected,'non-technician profile rejected');
end $$;

insert into public.service_categories(id,code,name,is_active) values
  (pg_temp.sid('category'),'stage4_test_active','Stage 4 Test',true),
  (pg_temp.sid('inactive_category'),'stage4_test_inactive','Stage 4 Test Inactive',false);
create temporary table stage4_locations(k text primary key,v bigint not null) on commit drop;
insert into public.cities(name,is_active) values('Stage 4 Test City',true),('Stage 4 Other City',true);
insert into stage4_locations select 'city',id from public.cities where name='Stage 4 Test City';
insert into stage4_locations select 'other_city',id from public.cities where name='Stage 4 Other City';
insert into public.districts(city_id,name,is_active)
select v,'Stage 4 Test District',true from stage4_locations where k='city';
insert into public.districts(city_id,name,is_active)
select v,'Stage 4 Wrong District',true from stage4_locations where k='other_city';
insert into stage4_locations select 'district',id from public.districts where name='Stage 4 Test District';
insert into stage4_locations select 'wrong_district',id from public.districts where name='Stage 4 Wrong District';
create function pg_temp.lid(p_key text) returns bigint language sql stable security definer set search_path='' as $$
  select v from pg_temp.stage4_locations where k=p_key
$$;

select pg_temp.assert_ok(not has_function_privilege('anon',
  'public.admin_change_technician(uuid,uuid,text,text,uuid,bigint,bigint,uuid)','EXECUTE'),
  'anon cannot manage technicians');
select pg_temp.assert_ok(not has_function_privilege('authenticated',
  'public.admin_change_technician(uuid,uuid,text,text,uuid,bigint,bigint,uuid)','EXECUTE'),
  'browser cannot manage technicians');
select pg_temp.assert_ok(has_function_privilege('service_role',
  'public.admin_change_technician(uuid,uuid,text,text,uuid,bigint,bigint,uuid)','EXECUTE'),
  'server role can manage technicians');
select pg_temp.assert_ok(not has_function_privilege('authenticated',
  'public.set_technician_availability(uuid,boolean)','EXECUTE'),
  'browser cannot call privileged availability RPC');
select pg_temp.assert_ok(not has_column_privilege('authenticated',
  'public.technician_profiles','is_available','UPDATE'),
  'browser cannot directly update availability');
select pg_temp.assert_ok(not has_column_privilege('authenticated',
  'public.users','is_active','UPDATE'),
  'technician cannot activate self');
select pg_temp.assert_ok(not has_table_privilege('authenticated',
  'public.technician_service_categories','INSERT'),
  'browser cannot assign own category');
select pg_temp.assert_ok(not has_table_privilege('authenticated',
  'public.technician_service_areas','INSERT'),
  'browser cannot assign own area');
select pg_temp.assert_ok(not has_table_privilege('authenticated',
  'public.technician_documents','UPDATE'),
  'technician cannot change document verification fields');
do $$ declare rejected boolean:=false; begin
  begin perform public.admin_change_technician(pg_temp.sid('customer'),pg_temp.sid('tech1'),'approve');
  exception when others then rejected:=true; end;
  perform pg_temp.assert_ok(rejected,'customer identity cannot authorize admin RPC');
end $$;

set role service_role;
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),'approve'),
  'admin approval');
select pg_temp.assert_ok(not public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),'approve'),
  'approval retry no-op');
select pg_temp.assert_ok(public.set_technician_availability(pg_temp.sid('tech1'),true),
  'approved active technician opens availability');
select pg_temp.assert_ok(not public.set_technician_availability(pg_temp.sid('tech1'),true),
  'availability retry no-op');
reset role;
select pg_temp.assert_ok((select approval_status='approved' and is_available
  from public.technician_profiles where user_id=pg_temp.sid('tech1')),'approved and available');
do $$ declare rejected boolean:=false; begin
  begin perform public.set_technician_availability(pg_temp.sid('tech2'),true);
  exception when others then rejected:=true; end;
  perform pg_temp.assert_ok(rejected,'pending technician cannot become available');
end $$;

set role service_role;
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech2'),'reject'),
  'admin reject');
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),'suspend'),
  'admin suspend');
reset role;
select pg_temp.assert_ok((select approval_status='suspended' and not is_available
  from public.technician_profiles where user_id=pg_temp.sid('tech1')),
  'suspended technician is unavailable');
set role service_role;
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),'approve'),
  'admin re-approval');
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),'deactivate'),
  'admin deactivate');
reset role;
select pg_temp.assert_ok((select not is_active from public.users where id=pg_temp.sid('tech1')),
  'technician inactive');
select pg_temp.assert_ok(not exists(select 1 from public.users u
  join public.technician_profiles p on p.user_id=u.id
  where u.id=pg_temp.sid('tech1') and u.is_active
    and p.approval_status='approved' and p.is_available),
  'inactive technician is ineligible for future Stage 5 matching');
do $$ declare rejected boolean:=false; begin
  begin perform public.set_technician_availability(pg_temp.sid('tech1'),true);
  exception when others then rejected:=true; end;
  perform pg_temp.assert_ok(rejected,'inactive technician cannot become available');
end $$;
set role service_role;
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),'activate'),
  'admin activate');
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'category_add',p_category_id=>pg_temp.sid('category')),'category add');
select pg_temp.assert_ok(not public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'category_add',p_category_id=>pg_temp.sid('category')),'category duplicate no-op');
reset role;
do $$ declare rejected boolean:=false; begin
  begin perform public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
    'category_add',p_category_id=>pg_temp.sid('inactive_category'));
  exception when others then rejected:=true; end;
  perform pg_temp.assert_ok(rejected,'inactive category rejected');
end $$;
set role service_role;
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'area_add',p_city_id=>pg_temp.lid('city')),'city area add');
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'area_add',p_city_id=>pg_temp.lid('city'),p_district_id=>pg_temp.lid('district')),
  'district area add');
select pg_temp.assert_ok(not public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'area_add',p_city_id=>pg_temp.lid('city'),p_district_id=>pg_temp.lid('district')),
  'area duplicate no-op');
reset role;
do $$ declare rejected boolean:=false; begin
  begin perform public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
    'area_add',p_city_id=>pg_temp.lid('city'),p_district_id=>pg_temp.lid('wrong_district'));
  exception when others then rejected:=true; end;
  perform pg_temp.assert_ok(rejected,'wrong city/district rejected');
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.sid('tech1')::text,true);
select pg_temp.assert_ok((select count(*)=1 from public.technician_service_categories
  where technician_id=pg_temp.sid('tech1')),'technician reads own category assignment');
select pg_temp.assert_ok((select count(*)=2 from public.technician_service_areas
  where technician_id=pg_temp.sid('tech1')),'technician reads own city and district areas');
select pg_temp.assert_ok((select count(*)=0 from public.technician_service_categories
  where technician_id=pg_temp.sid('tech2')),'technician cannot read another category assignment');
select set_config('request.jwt.claim.sub',pg_temp.sid('customer')::text,true);
select pg_temp.assert_ok((select count(*)=0 from public.technician_service_categories
  where technician_id=pg_temp.sid('tech1')),'customer cannot read technician categories');
select pg_temp.assert_ok((select count(*)=0 from public.technician_service_areas
  where technician_id=pg_temp.sid('tech1')),'customer cannot read technician areas');
select set_config('request.jwt.claim.sub',pg_temp.sid('admin')::text,true);
select pg_temp.assert_ok((select count(*)=1 from public.technician_service_categories
  where technician_id=pg_temp.sid('tech1')),'admin reads technician categories');
select pg_temp.assert_ok((select count(*)=2 from public.technician_service_areas
  where technician_id=pg_temp.sid('tech1')),'admin reads technician areas');
reset role;

insert into public.technician_documents(technician_id,document_type)
values(pg_temp.sid('tech1'),'identity_document');
create temporary table stage4_document as select id from public.technician_documents
where technician_id=pg_temp.sid('tech1');
grant select on stage4_document to service_role;
set role service_role;
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'document_verify',p_document_id=>(select id from pg_temp.stage4_document)),
  'admin document verification');
select pg_temp.assert_ok(not public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'document_verify',p_document_id=>(select id from pg_temp.stage4_document)),
  'document verification retry no-op');
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'document_reject',p_document_id=>(select id from pg_temp.stage4_document)),
  'admin document rejection');
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'category_remove',p_category_id=>pg_temp.sid('category')),'category remove');
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'area_remove',p_city_id=>pg_temp.lid('city'),p_district_id=>pg_temp.lid('district')),
  'district area remove');
select pg_temp.assert_ok(public.admin_change_technician(pg_temp.sid('admin'),pg_temp.sid('tech1'),
  'area_remove',p_city_id=>pg_temp.lid('city')),'city area remove');
reset role;

select pg_temp.assert_ok((select count(*)=1 from public.operational_events
  where entity_id=pg_temp.sid('tech1') and event_type='technician.category_added'),
  'category add event exactly once');
select pg_temp.assert_ok((select count(*)=1 from public.operational_events
  where entity_id=pg_temp.sid('tech1') and event_type='technician.availability_changed'),
  'availability event exactly once');
select pg_temp.assert_ok((select count(*)=1 from public.operational_events
  where entity_id=pg_temp.sid('tech1') and event_type='technician.document_verified'),
  'document verification event exactly once');
select pg_temp.assert_ok((select count(*)=1 from public.operational_events
  where entity_id=pg_temp.sid('tech1') and event_type='technician.category_removed'),
  'category removal event exactly once');
select pg_temp.assert_ok((select count(*)=2 from public.operational_events
  where entity_id=pg_temp.sid('tech1') and event_type='technician.area_removed'),
  'city and district removal events exactly once');

-- RLS is tested with real authenticated role and different JWT subjects.
set role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.sid('tech1')::text,true);
select pg_temp.assert_ok((select count(*)=1 from public.technician_profiles
  where user_id=pg_temp.sid('tech1')),'technician reads own profile');
select pg_temp.assert_ok((select count(*)=0 from public.technician_profiles
  where user_id=pg_temp.sid('tech2')),'technician cannot read another profile');
select pg_temp.assert_ok((select count(*)=1 from public.technician_documents
  where technician_id=pg_temp.sid('tech1')),'technician reads own document metadata');
select set_config('request.jwt.claim.sub',pg_temp.sid('customer')::text,true);
select pg_temp.assert_ok((select count(*)=0 from public.technician_documents),
  'customer cannot read document metadata');
select pg_temp.assert_ok((select count(*)=0 from public.technician_profiles
  where user_id=pg_temp.sid('tech1')),'customer cannot read internal technician profile');
select set_config('request.jwt.claim.sub',pg_temp.sid('admin')::text,true);
select pg_temp.assert_ok((select count(*)=2 from public.technician_profiles
  where user_id in (pg_temp.sid('tech1'),pg_temp.sid('tech2'))),'admin reads all profiles');
select pg_temp.assert_ok((select count(*)=1 from public.technician_documents
  where technician_id=pg_temp.sid('tech1')),'admin reads document metadata');
reset role;

rollback;
