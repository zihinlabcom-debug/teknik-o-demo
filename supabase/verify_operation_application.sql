\set ON_ERROR_STOP on

do $$ begin
  if to_regprocedure('public.start_service_job(uuid,uuid)') is null
     or to_regprocedure('public.complete_service_job(uuid,uuid)') is null then
    raise exception 'Lifecycle RPC missing';
  end if;
  if to_regprocedure('public.can_read_offered_dispatch(uuid)') is null
     or to_regprocedure('public.can_read_offered_quote(uuid)') is null
     or to_regprocedure('public.can_read_service_job(uuid)') is null
     or to_regprocedure('public.can_read_service_appointment(uuid)') is null then
    raise exception 'Operation visibility helper missing';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.service_jobs'::regclass
      and tgname='service_jobs_lifecycle_guard' and tgenabled<>'D'
  ) then raise exception 'Job lifecycle guard missing'; end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.service_appointments'::regclass
      and tgname='service_appointments_job_link_guard' and tgenabled<>'D'
  ) then raise exception 'Appointment link guard missing'; end if;
  if has_table_privilege('authenticated','public.operational_events','INSERT')
     or has_table_privilege('authenticated','public.operational_events','UPDATE')
     or has_table_privilege('authenticated','public.operational_events','DELETE')
     or has_table_privilege('authenticated','public.operational_events','TRUNCATE') then
    raise exception 'Authenticated operational-event mutation privilege present';
  end if;
  if has_table_privilege('service_role','public.operational_events','UPDATE')
     or has_table_privilege('service_role','public.operational_events','DELETE')
     or has_table_privilege('service_role','public.operational_events','TRUNCATE') then
    raise exception 'service_role append-only ACL is too broad';
  end if;
  if not has_table_privilege('service_role','public.operational_events','SELECT')
     or not has_table_privilege('service_role','public.operational_events','INSERT') then
    raise exception 'service_role operational-event privileges missing';
  end if;
end $$;
