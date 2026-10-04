\set ON_ERROR_STOP on

do $$ begin
  if to_regprocedure('public.create_service_request(uuid,text,uuid,text,text,text,text)') is null then
    raise exception 'create_service_request RPC missing';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_requests' and column_name='request_key') then
    raise exception 'service_requests.request_key missing';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_requests' and column_name='pricing_reference') then
    raise exception 'service_requests.pricing_reference missing';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_requests' and column_name='problem_description') then
    raise exception 'service_requests.problem_description missing';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='service_requests' and column_name='requested_at') then
    raise exception 'service_requests.requested_at missing';
  end if;
  if has_function_privilege('anon','public.create_service_request(uuid,text,uuid,text,text,text,text)','EXECUTE') then
    raise exception 'anon can execute create_service_request';
  end if;
  if has_function_privilege('authenticated','public.create_service_request(uuid,text,uuid,text,text,text,text)','EXECUTE') then
    raise exception 'authenticated can execute create_service_request';
  end if;
  if not has_function_privilege('service_role','public.create_service_request(uuid,text,uuid,text,text,text,text)','EXECUTE') then
    raise exception 'service_role cannot execute create_service_request';
  end if;
end $$;
