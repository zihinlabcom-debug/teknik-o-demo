-- Closed field-test access. Client-side mutations are intentionally narrow;
-- privileged provisioning/approval is performed with server-side service_role.
begin;

-- RLS policies combine permissively. Unknown pre-existing policies require a
-- live review; otherwise they could override the restrictions below.
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies where schemaname='public'
      and tablename = any(array['users','customer_profiles','technician_profiles','customer_addresses',
        'service_categories','service_types','technician_service_categories','technician_service_areas',
        'service_requests','diagnostic_logs','cities','districts','official_error_codes_raw'])
  loop
    if p.policyname <> all(array['users_read','users_update_self','customer_profiles_read',
      'technician_profiles_read','technician_profiles_update_self','customer_addresses_read',
      'customer_addresses_insert','customer_addresses_update','customer_addresses_delete',
      'cities_read_active','districts_read_active','service_categories_read_active',
      'service_types_read_active','technician_service_categories_read','technician_service_areas_read',
      'service_requests_read','diagnostic_logs_read','official_error_codes_raw_read']) then
      raise exception 'Review existing RLS policy %.% before applying migration',p.tablename,p.policyname;
    end if;
  end loop;
end $$;

create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin' and u.is_active
  );
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['users','customer_profiles','technician_profiles','customer_addresses',
    'service_categories','service_types','technician_service_categories','technician_service_areas',
    'service_requests','diagnostic_logs','cities','districts','official_error_codes_raw'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
  end loop;
end $$;

-- An authenticated user can read their own account and edit contact fields.
-- Role and is_active are never client-editable, preventing self-promotion.
grant select on public.users to authenticated;
grant update (name,phone,email) on public.users to authenticated;
drop policy if exists users_read on public.users;
create policy users_read on public.users for select to authenticated
  using (id = (select auth.uid()) or (select public.is_app_admin()));
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update to authenticated
  using (id = (select auth.uid()) and is_active)
  with check (id = (select auth.uid()) and is_active);

grant select on public.customer_profiles to authenticated;
drop policy if exists customer_profiles_read on public.customer_profiles;
create policy customer_profiles_read on public.customer_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_app_admin()));

grant select on public.technician_profiles to authenticated;
grant update (is_available) on public.technician_profiles to authenticated;
drop policy if exists technician_profiles_read on public.technician_profiles;
create policy technician_profiles_read on public.technician_profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_app_admin()));
drop policy if exists technician_profiles_update_self on public.technician_profiles;
create policy technician_profiles_update_self on public.technician_profiles for update to authenticated
  using (user_id = (select auth.uid()) and approval_status = 'approved')
  with check (user_id = (select auth.uid()) and approval_status = 'approved');

grant select, insert, update, delete on public.customer_addresses to authenticated;
drop policy if exists customer_addresses_read on public.customer_addresses;
create policy customer_addresses_read on public.customer_addresses for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_app_admin()));
drop policy if exists customer_addresses_insert on public.customer_addresses;
create policy customer_addresses_insert on public.customer_addresses for insert to authenticated
  with check (customer_id = (select auth.uid()));
drop policy if exists customer_addresses_update on public.customer_addresses;
create policy customer_addresses_update on public.customer_addresses for update to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
drop policy if exists customer_addresses_delete on public.customer_addresses;
create policy customer_addresses_delete on public.customer_addresses for delete to authenticated
  using (customer_id = (select auth.uid()));

grant select on public.cities, public.districts, public.service_categories, public.service_types to authenticated;
drop policy if exists cities_read_active on public.cities;
create policy cities_read_active on public.cities for select to authenticated
  using (is_active or (select public.is_app_admin()));
drop policy if exists districts_read_active on public.districts;
create policy districts_read_active on public.districts for select to authenticated
  using ((is_active and exists (select 1 from public.cities c where c.id=city_id and c.is_active))
         or (select public.is_app_admin()));
drop policy if exists service_categories_read_active on public.service_categories;
create policy service_categories_read_active on public.service_categories for select to authenticated
  using (is_active or (select public.is_app_admin()));
drop policy if exists service_types_read_active on public.service_types;
create policy service_types_read_active on public.service_types for select to authenticated
  using ((is_active and exists (select 1 from public.service_categories c where c.id=category_id and c.is_active))
         or (select public.is_app_admin()));

grant select on public.technician_service_categories, public.technician_service_areas to authenticated;
drop policy if exists technician_service_categories_read on public.technician_service_categories;
create policy technician_service_categories_read on public.technician_service_categories for select to authenticated
  using (technician_id = (select auth.uid()) or (select public.is_app_admin()));
drop policy if exists technician_service_areas_read on public.technician_service_areas;
create policy technician_service_areas_read on public.technician_service_areas for select to authenticated
  using (technician_id = (select auth.uid()) or (select public.is_app_admin()));

grant select on public.service_requests, public.diagnostic_logs to authenticated;
drop policy if exists service_requests_read on public.service_requests;
create policy service_requests_read on public.service_requests for select to authenticated
  using (customer_id = (select auth.uid()) or technician_id = (select auth.uid())
         or (select public.is_app_admin()));
drop policy if exists diagnostic_logs_read on public.diagnostic_logs;
create policy diagnostic_logs_read on public.diagnostic_logs for select to authenticated
  using (exists (select 1 from public.service_requests r where r.id=request_id));

-- Raw manufacturer data is readable only after authentication; client writes
-- remain denied. Existing rows are untouched.
grant select on public.official_error_codes_raw to authenticated;
drop policy if exists official_error_codes_raw_read on public.official_error_codes_raw;
create policy official_error_codes_raw_read on public.official_error_codes_raw
  for select to authenticated using (true);

commit;
