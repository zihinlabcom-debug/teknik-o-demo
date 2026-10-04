-- PostgreSQL integration regression. Run ONLY on a disposable local database
-- after the forward migration, with tekniko.stage15_local_test=on. Everything
-- inserted below is rolled back, including the intentional failure probes.
begin;

do $$
declare
  boiler_id uuid;
  painting_id uuid;
  extra_id uuid;
  boiler_type_id uuid;
  code_suffix text := replace(gen_random_uuid()::text, '-', '');
  violated_constraint text;
  required_table text;
begin
  if current_setting('tekniko.stage15_local_test', true) is distinct from 'on' then
    raise exception 'Local-only integration test; set tekniko.stage15_local_test=on';
  end if;

  if exists (
    select 1 from (values
      ('boiler','Kombi'),('painting','Boya'),('cleaning','Temizlik'),
      ('upholstery_carpet','Koltuk & Halı Yıkama')
    ) as required(code,name)
    left join public.service_categories c on c.code=required.code
    where c.id is null or c.name is distinct from required.name
      or c.is_active is distinct from true
  ) then
    raise exception 'Initial four active seed categories are incomplete';
  end if;

  select id into strict boiler_id from public.service_categories where code='boiler';
  select id into strict painting_id from public.service_categories where code='painting';
  insert into public.service_categories(code,name)
  values ('stage15_extra_' || code_suffix, 'Stage 1.5 local test') returning id into extra_id;
  if not exists (select 1 from public.service_categories where id=extra_id and is_active)
     or (select count(*) from public.service_categories where is_active) < 5 then
    raise exception 'Fifth active category was not accepted';
  end if;

  begin
    insert into public.service_categories(code,name) values ('boiler','Duplicate local test');
    raise exception 'Duplicate category code was accepted';
  exception when unique_violation then
    get stacked diagnostics violated_constraint = constraint_name;
    if violated_constraint is distinct from 'service_categories_code_key' then
      raise exception 'Unexpected uniqueness constraint: %', violated_constraint;
    end if;
  end;

  insert into public.service_types(category_id,code,name)
  values (boiler_id,'stage15_type_' || code_suffix,'Stage 1.5 local test')
  returning id into boiler_type_id;

  -- A matching pair is valid.
  insert into public.service_requests(category_id,service_type_id)
  values (boiler_id,boiler_type_id);

  -- Both references exist independently, but the mismatched pair must fail
  -- specifically on the new composite FK.
  begin
    insert into public.service_requests(category_id,service_type_id)
    values (painting_id,boiler_type_id);
    raise exception 'Mismatched category/service type was accepted';
  exception when foreign_key_violation then
    get stacked diagnostics violated_constraint = constraint_name;
    if violated_constraint is distinct from 'service_requests_service_type_category_fk' then
      raise exception 'Wrong FK rejected the mismatched pair: %', violated_constraint;
    end if;
  end;

  -- MATCH SIMPLE permits legacy rows with either optional value absent.
  insert into public.service_requests(category_id,service_type_id)
  values (boiler_id,null), (null,boiler_type_id);

  if (select count(*) from public.official_error_codes_raw) < 1422
     or (select count(*) from public.official_error_codes_raw where brand='Vaillant') < 1422 then
    raise exception 'Original error-code baseline is incomplete';
  end if;
  insert into public.official_error_codes_raw(brand,official_model,error_code)
  values ('Stage 1.5 local test','Synthetic model','TEST');
  if (select count(*) from public.official_error_codes_raw) <= 1422 then
    raise exception 'Expanded error-code catalog was rejected';
  end if;

  foreach required_table in array array[
    'users','customer_profiles','technician_profiles','customer_addresses',
    'service_requests','diagnostic_logs','official_error_codes_raw',
    'cities','districts','service_categories','service_types',
    'technician_service_categories','technician_service_areas'
  ] loop
    if not coalesce((select relrowsecurity from pg_class
                     where oid=('public.' || required_table)::regclass),false) then
      raise exception 'RLS disabled on critical table %', required_table;
    end if;
  end loop;
end $$;

rollback;
