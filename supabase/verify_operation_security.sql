do $$
declare missing text[];
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='can_access_service_request' and p.prosecdef
  ) then raise exception 'can_access_service_request security-definer function missing'; end if;

  select array_agg(x.name) into missing
  from (values ('service_requests_read'),('diagnostic_logs_read'),('service_quotes_read'),
    ('service_dispatches_read'),('service_dispatch_candidates_read'),('service_jobs_read'),
    ('service_appointments_read')) as x(name)
  where not exists (select 1 from pg_policies p where p.schemaname='public' and p.policyname=x.name);
  if missing is not null then raise exception 'Missing Stage 4 policies: %',missing; end if;

  if not has_table_privilege('authenticated','public.service_quotes','SELECT')
     or not has_table_privilege('authenticated','public.service_dispatches','SELECT')
     or not has_table_privilege('authenticated','public.service_dispatch_candidates','SELECT')
     or not has_table_privilege('authenticated','public.service_jobs','SELECT')
     or not has_table_privilege('authenticated','public.service_appointments','SELECT') then
    raise exception 'Expected authenticated read grants are missing';
  end if;

  if has_table_privilege('authenticated','public.service_quotes','INSERT')
     or has_table_privilege('authenticated','public.service_quotes','UPDATE')
     or has_table_privilege('authenticated','public.service_quotes','DELETE')
     or has_table_privilege('authenticated','public.service_jobs','INSERT')
     or has_table_privilege('authenticated','public.service_jobs','UPDATE')
     or has_table_privilege('authenticated','public.service_jobs','DELETE')
     or has_table_privilege('authenticated','public.operational_events','SELECT') then
    raise exception 'Authenticated operation-table privilege is too broad';
  end if;

  if has_function_privilege('authenticated','public.accept_service_dispatch(uuid,uuid,text)','EXECUTE') then
    raise exception 'accept_service_dispatch must not be callable by authenticated clients';
  end if;
  if not has_function_privilege('service_role','public.accept_service_dispatch(uuid,uuid,text)','EXECUTE') then
    raise exception 'service_role must retain accept_service_dispatch execute';
  end if;
end $$;
