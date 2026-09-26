-- Read-only verification to run before and after the migrations in SQL Editor.
-- The first query is the preflight inventory; save its result before applying.
select jsonb_pretty(jsonb_build_object(
  'tables', (select jsonb_agg(jsonb_build_object(
    'table',c.relname,'rls',c.relrowsecurity,
    'rows',case when c.relname='official_error_codes_raw'
      then (select count(*) from public.official_error_codes_raw)
      else null end) order by c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and c.relname=any(array[
      'users','customer_profiles','technician_profiles','customer_addresses',
      'service_requests','diagnostic_logs','official_error_codes_raw',
      'cities','districts','service_categories','service_types',
      'technician_service_categories','technician_service_areas'])),
  'columns', (select jsonb_agg(jsonb_build_object(
    'table',table_name,'column',column_name,'type',data_type,
    'nullable',is_nullable,'default',column_default) order by table_name,ordinal_position)
    from information_schema.columns where table_schema='public' and table_name=any(array[
      'users','customer_profiles','technician_profiles','customer_addresses',
      'service_requests','diagnostic_logs','official_error_codes_raw',
      'cities','districts','service_categories','service_types',
      'technician_service_categories','technician_service_areas'])),
  'constraints', (select jsonb_agg(jsonb_build_object(
    'table',c.relname,'name',k.conname,'type',k.contype,
    'definition',pg_get_constraintdef(k.oid)) order by c.relname,k.conname)
    from pg_constraint k join pg_class c on c.oid=k.conrelid
    where k.connamespace='public'::regnamespace
      and c.relname=any(array[
        'users','customer_profiles','technician_profiles','customer_addresses',
        'service_requests','diagnostic_logs','official_error_codes_raw',
        'cities','districts','service_categories','service_types',
        'technician_service_categories','technician_service_areas'])),
  'policies', (select jsonb_agg(jsonb_build_object(
    'table',tablename,'name',policyname,'command',cmd,'roles',roles,
    'using',qual,'check',with_check) order by tablename,policyname)
    from pg_policies where schemaname='public' and tablename=any(array[
      'users','customer_profiles','technician_profiles','customer_addresses',
      'service_requests','diagnostic_logs','official_error_codes_raw',
      'cities','districts','service_categories','service_types',
      'technician_service_categories','technician_service_areas']))
)) as schema_inventory;

-- Post-migration invariants. All should return true; the first gives the
-- authoritative count (an anon PostgREST count may be filtered by RLS).
select 'official_raw_count' as check_name,
       (select count(*)=1422 from public.official_error_codes_raw) as passed,
       (select count(*)::text from public.official_error_codes_raw) as detail
union all
select 'four_active_categories',
       (select count(*)=4 from public.service_categories where is_active and
          (code,name) in (('boiler','Kombi'),('painting','Boya'),('cleaning','Temizlik'),
                          ('upholstery_carpet','Koltuk & Halı Yıkama'))) and
       (select count(*)=4 from public.service_categories where is_active),
       (select count(*)::text from public.service_categories where is_active)
union all
select 'no_duplicate_category_code',
       not exists(select 1 from public.service_categories group by code having count(*)>1),
       null
union all
select 'all_application_rls_enabled',
       (select count(*)=13 from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relrowsecurity and c.relname=any(array[
          'users','customer_profiles','technician_profiles','customer_addresses',
          'service_requests','diagnostic_logs','official_error_codes_raw',
          'cities','districts','service_categories','service_types',
          'technician_service_categories','technician_service_areas'])),
       null
union all
select 'users_id_has_no_default',
       (select column_default is null from information_schema.columns
        where table_schema='public' and table_name='users' and column_name='id'),
       null;
