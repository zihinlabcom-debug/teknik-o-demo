-- Run against the linked project with `supabase db query --linked` after migration.
-- The CLI's Management API query endpoint is read-only, so these checks inspect
-- installed constraints rather than inserting test rows.
do $$
declare
  expected text[] := array[
    'boiler_model_families','boiler_official_models','boiler_model_aliases',
    'boiler_fault_candidates','boiler_diagnostic_questions','boiler_question_effects',
    'boiler_repair_pricing','boiler_diagnosis_sessions','boiler_diagnosis_answers',
    'boiler_diagnosis_candidates','boiler_field_results','boiler_field_parts',
    'boiler_followups'
  ];
  t text;
begin
  if (select count(*) from public.official_error_codes_raw) <> 1422 then
    raise exception 'Raw manufacturer data count changed';
  end if;
  if (select count(*) from public.service_categories) <> 4
     or not exists (select 1 from public.service_categories where code='boiler') then
    raise exception 'Service categories changed';
  end if;
  if (select count(*) from public.cities) <> 81
     or (select count(*) from public.districts) <> 973 then
    raise exception 'Location catalog changed';
  end if;
  foreach t in array expected loop
    if to_regclass('public.' || t) is null then
      raise exception 'Missing table %', t;
    end if;
    if not (select relrowsecurity from pg_class where oid=('public.' || t)::regclass) then
      raise exception 'RLS disabled on %', t;
    end if;
    if not exists (select 1 from pg_constraint
                   where conrelid=('public.' || t)::regclass and contype='p') then
      raise exception 'Missing primary key on %', t;
    end if;
    if has_table_privilege('anon', 'public.' || t, 'INSERT')
       or has_table_privilege('anon', 'public.' || t, 'UPDATE')
       or has_table_privilege('anon', 'public.' || t, 'DELETE')
       or has_table_privilege('authenticated', 'public.' || t, 'INSERT')
       or has_table_privilege('authenticated', 'public.' || t, 'UPDATE')
       or has_table_privilege('authenticated', 'public.' || t, 'DELETE') then
      raise exception 'Unexpected client write privilege on %', t;
    end if;
  end loop;
  if (select count(*) from pg_policies where schemaname='public'
      and tablename=any(expected) and cmd='SELECT') <> 13 then
    raise exception 'Expected one SELECT policy per boiler table';
  end if;
  if (select count(*) from pg_constraint k join pg_class c on c.oid=k.conrelid
      where c.relname=any(expected) and k.contype='f') <> 24 then
    raise exception 'Boiler foreign key inventory changed';
  end if;
  if exists (select 1 from pg_policies where schemaname='public'
             and tablename=any(expected) and cmd <> 'SELECT') then
    raise exception 'Unexpected client mutation policy';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name=any(expected)
               and column_name in ('name','phone','email','address','address_line')) then
    raise exception 'PII column found in boiler tables';
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.boiler_fault_candidates'::regclass
                 and confrelid='public.official_error_codes_raw'::regclass and contype='f')
     or not exists (select 1 from pg_constraint where conrelid='public.boiler_diagnosis_sessions'::regclass
                    and confrelid='public.service_requests'::regclass and contype='f')
     or not exists (select 1 from pg_constraint where conrelid='public.boiler_field_results'::regclass
                    and confrelid='public.service_requests'::regclass and contype='f') then
    raise exception 'Critical foreign key is missing';
  end if;
  if (select count(*) from public.boiler_fault_candidates) <> 0
     or (select count(*) from public.boiler_diagnostic_questions) <> 0
     or (select count(*) from public.boiler_field_results) <> 0 then
    raise exception 'Technical or field records were seeded unexpectedly';
  end if;

  if not exists (select 1 from pg_constraint where conrelid='public.boiler_question_effects'::regclass
                 and contype='c' and pg_get_constraintdef(oid) like '%unknown%neutral%')
     or not exists (select 1 from pg_constraint where conrelid='public.boiler_fault_candidates'::regclass
                    and conname='boiler_fault_candidates_verified_evidence_check'
                    and pg_get_constraintdef(oid) like '%COALESCE%')
     or not exists (select 1 from pg_constraint where conrelid='public.boiler_diagnosis_candidates'::regclass
                    and contype='c' and pg_get_constraintdef(oid) like '%probability_percent%100%')
     or (select count(*) from pg_constraint where conrelid='public.boiler_diagnosis_sessions'::regclass
         and contype='c' and (pg_get_constraintdef(oid) like '%question_completion_percent%100%'
                           or pg_get_constraintdef(oid) like '%diagnosis_confidence_percent%100%')) <> 2 then
    raise exception 'Required CHECK constraint is missing';
  end if;
end $$;

select
  (select count(*) from public.official_error_codes_raw) as raw_count,
  (select count(*) from public.cities) as cities_count,
  (select count(*) from public.districts) as districts_count,
  (select count(*) from public.service_categories) as categories_count,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' and c.relname like 'boiler_%') as boiler_table_count,
  (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
   where c.relname like 'boiler_%' and t.tgname like '%_set_updated_at'
     and not t.tgisinternal) as updated_at_trigger_count;
