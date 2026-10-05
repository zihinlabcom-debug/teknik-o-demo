-- Stage 2: server-side request flow requires narrow read access.
begin;

do $$ begin
  if to_regclass('public.customer_addresses') is null
     or to_regclass('public.service_requests') is null
     or to_regclass('public.service_categories') is null then
    raise exception 'Stage 2 service-role read prerequisites missing';
  end if;
end $$;

grant select on public.customer_addresses to service_role;
grant select on public.service_requests to service_role;
grant select on public.service_categories to service_role;

commit;
