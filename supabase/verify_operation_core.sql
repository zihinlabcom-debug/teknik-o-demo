-- Read-only Stage 1.5 operation verification; no fixed global table count.
do $$
declare t text;
declare required_name text;
declare relation_pair text[];
begin
  foreach t in array array[
    'service_quotes','service_dispatches','service_dispatch_candidates',
    'service_jobs','service_appointments','operational_events'
  ] loop
    if to_regclass('public.' || t) is null then raise exception 'Missing table %',t; end if;
    if not (select relrowsecurity from pg_class where oid=('public.' || t)::regclass) then
      raise exception 'RLS disabled on %',t;
    end if;
    if exists (select 1 from pg_policies where schemaname='public' and tablename=t) then
      raise exception 'Unexpected client policy on %',t;
    end if;
  end loop;
  foreach required_name in array array[
    'service_quotes_request_version_key','service_dispatches_quote_request_fk',
    'service_dispatch_candidates_dispatch_technician_key',
    'service_jobs_dispatch_request_fk','service_jobs_quote_request_fk',
    'service_appointments_time_check','operational_events_context_check'
  ] loop
    if not exists (select 1 from pg_constraint where connamespace='public'::regnamespace
                   and conname=required_name and convalidated) then
      raise exception 'Missing or unvalidated constraint %',required_name;
    end if;
  end loop;
  foreach relation_pair slice 1 in array array[
    array['service_quotes','service_requests'],
    array['service_dispatches','service_requests'],
    array['service_dispatch_candidates','service_dispatches'],
    array['service_dispatch_candidates','users'],
    array['service_jobs','service_requests'],
    array['service_jobs','users'],
    array['service_appointments','service_jobs'],
    array['operational_events','service_requests'],
    array['operational_events','service_jobs'],
    array['operational_events','service_dispatches'],
    array['operational_events','users']
  ] loop
    if not exists (select 1 from pg_constraint
                   where conrelid=('public.' || relation_pair[1])::regclass
                     and confrelid=('public.' || relation_pair[2])::regclass
                     and contype='f' and convalidated and confdeltype='a') then
      raise exception 'Missing history-preserving FK % -> %',relation_pair[1],relation_pair[2];
    end if;
  end loop;
  foreach required_name in array array[
    'service_dispatches_request_status_idx','service_dispatch_candidates_dispatch_status_idx',
    'service_dispatch_candidates_technician_status_idx',
    'service_dispatch_candidates_one_accepted_idx','service_jobs_request_idx',
    'service_jobs_technician_status_idx','service_jobs_dispatch_unique_idx',
    'service_jobs_idempotency_unique_idx','service_appointments_job_starts_idx',
    'operational_events_request_occurred_idx','operational_events_job_occurred_idx',
    'operational_events_dispatch_occurred_idx'
  ] loop
    if to_regclass('public.' || required_name) is null then
      raise exception 'Missing index %',required_name;
    end if;
  end loop;
  if to_regprocedure('public.accept_service_dispatch(uuid,uuid,text)') is null
     or to_regprocedure('public.enforce_service_job_capacity()') is null then
    raise exception 'Missing dispatch/capacity function';
  end if;
  if not exists (select 1 from pg_proc
                 where oid='public.accept_service_dispatch(uuid,uuid,text)'::regprocedure
                   and prosecdef and proconfig @> array['search_path=""']::text[]) then
    raise exception 'Accept function SECURITY DEFINER/search_path guard missing';
  end if;
  if has_function_privilege('anon','public.accept_service_dispatch(uuid,uuid,text)','EXECUTE')
     or has_function_privilege('authenticated','public.accept_service_dispatch(uuid,uuid,text)','EXECUTE')
     or not has_function_privilege('service_role','public.accept_service_dispatch(uuid,uuid,text)','EXECUTE') then
    raise exception 'Unexpected accept function grants';
  end if;

  if position('technician_service_areas' in pg_get_functiondef('public.accept_service_dispatch(uuid,uuid,text)'::regprocedure)) = 0
     or position('is_available' in pg_get_functiondef('public.accept_service_dispatch(uuid,uuid,text)'::regprocedure)) = 0
     or position('operational_events' in pg_get_functiondef('public.accept_service_dispatch(uuid,uuid,text)'::regprocedure)) = 0
     or position('dispatch.accepted' in pg_get_functiondef('public.accept_service_dispatch(uuid,uuid,text)'::regprocedure)) = 0 then
    raise exception 'Accept function area/availability/event hardening missing';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid='public.service_jobs'::regclass
                 and tgname='service_jobs_capacity_guard' and not tgisinternal) then
    raise exception 'Missing capacity trigger';
  end if;
end $$;
