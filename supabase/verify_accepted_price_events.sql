-- Read-only Stage 1.5 / Stages 5+6 verification.
do $$
declare trigger_name text;
begin
  if to_regclass('public.service_quotes_one_accepted_per_request_idx') is null
     or not exists (select 1 from pg_index where indexrelid='public.service_quotes_one_accepted_per_request_idx'::regclass
                    and indisunique and indpred is not null) then
    raise exception 'Accepted quote partial unique index missing';
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.service_quotes'::regclass
                 and conname='service_quotes_accepted_timestamp_check' and convalidated) then
    raise exception 'Accepted quote timestamp constraint missing';
  end if;
  if not exists (select 1 from pg_proc where oid='public.accept_service_quote(uuid,uuid)'::regprocedure
                 and prosecdef and proconfig @> array['search_path=""']::text[]) then
    raise exception 'Quote acceptance security guard missing';
  end if;
  if has_function_privilege('anon','public.accept_service_quote(uuid,uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.accept_service_quote(uuid,uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.accept_service_quote(uuid,uuid)','EXECUTE') then
    raise exception 'Quote acceptance execute grant mismatch';
  end if;
  if has_table_privilege('authenticated','public.service_quotes','INSERT')
     or has_table_privilege('authenticated','public.service_quotes','UPDATE')
     or has_table_privilege('authenticated','public.service_quotes','DELETE')
     or has_table_privilege('authenticated','public.operational_events','INSERT')
     or has_table_privilege('authenticated','public.operational_events','UPDATE')
     or has_table_privilege('authenticated','public.operational_events','DELETE') then
    raise exception 'Critical client DML grant is open';
  end if;
  foreach trigger_name in array array[
    'service_quotes_accepted_guard','service_jobs_accepted_quote_guard',
    'service_dispatches_assigned_quote_guard','operational_events_append_only',
    'service_jobs_history','service_appointments_history'
  ] loop
    if not exists (select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
                   where t.tgname=trigger_name and c.relnamespace='public'::regnamespace
                     and not t.tgisinternal and t.tgenabled='O') then
      raise exception 'Required operation trigger missing: %',trigger_name;
    end if;
  end loop;
  if not exists (select 1 from pg_policies where schemaname='public' and policyname='service_quotes_read')
     or not exists (select 1 from pg_policies where schemaname='public' and policyname='service_jobs_read')
     or exists (select 1 from pg_policies where schemaname='public' and tablename='operational_events') then
    raise exception 'Stage 4 read policy/server-only events regressed';
  end if;
end $$;
