-- Run with psql on tekniko_operation_test after the three Stage 1.5 migrations.
\set ON_ERROR_STOP on
begin;
create temp table operation_ids (key text primary key,id uuid not null);
create function pg_temp.test_id(p_key text) returns uuid language sql as $$
  select id from pg_temp.operation_ids where key=p_key
$$;
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
insert into pg_temp.operation_ids(key,id) values
 ('customer',gen_random_uuid()),('tech1',gen_random_uuid()),('tech2',gen_random_uuid()),
 ('tech3',gen_random_uuid()),('request1',gen_random_uuid()),('request2',gen_random_uuid()),
 ('quote1',gen_random_uuid()),('quote2',gen_random_uuid()),('dispatch1',gen_random_uuid()),
 ('dispatch2',gen_random_uuid()),('dispatch3',gen_random_uuid()),('dispatch4',gen_random_uuid()),
 ('dispatch5',gen_random_uuid()),('request_no_area',gen_random_uuid()),('dispatch_no_area',gen_random_uuid());
insert into auth.users(id) select id from pg_temp.operation_ids where key in ('customer','tech1','tech2','tech3');
insert into public.users(id,name,role) values
 (pg_temp.test_id('customer'),'TEST CUSTOMER','customer'),
 (pg_temp.test_id('tech1'),'TEST TECH 1','technician'),
 (pg_temp.test_id('tech2'),'TEST TECH 2','technician'),
 (pg_temp.test_id('tech3'),'TEST TECH 3','technician');
insert into public.customer_profiles(user_id) values (pg_temp.test_id('customer'));
insert into public.cities default values;
insert into public.districts(city_id) select id from public.cities limit 1;
insert into public.customer_addresses(customer_id,city_id,district_id)
  select pg_temp.test_id('customer'),c.id,d.id from public.cities c join public.districts d on d.city_id=c.id limit 1;
insert into public.technician_profiles(user_id,approval_status,is_available) values
 (pg_temp.test_id('tech1'),'approved',true),(pg_temp.test_id('tech2'),'approved',true),
 (pg_temp.test_id('tech3'),'pending',true)
on conflict (user_id) do update set approval_status=excluded.approval_status,is_available=excluded.is_available;
insert into public.technician_service_areas(technician_id,city_id,district_id)
  select pg_temp.test_id('tech1'),c.id,null from public.cities c limit 1;
insert into public.technician_service_areas(technician_id,city_id,district_id)
  select pg_temp.test_id('tech2'),d.city_id,d.id from public.districts d limit 1;
insert into public.technician_service_areas(technician_id,city_id,district_id)
  select pg_temp.test_id('tech3'),c.id,null from public.cities c limit 1;
insert into public.technician_service_categories(technician_id,category_id)
  select pg_temp.test_id(k),c.id from public.service_categories c
  cross join (values ('tech1'),('tech2')) as x(k) where c.code='boiler';
insert into public.service_requests(id,customer_id,category_id,address_id)
  select pg_temp.test_id('request1'),pg_temp.test_id('customer'),c.id,a.id
  from public.service_categories c cross join public.customer_addresses a
  where c.code='boiler' and a.customer_id=pg_temp.test_id('customer');
insert into public.service_requests(id,customer_id,category_id,address_id)
  select pg_temp.test_id('request2'),pg_temp.test_id('customer'),c.id,a.id
  from public.service_categories c cross join public.customer_addresses a
  where c.code='boiler' and a.customer_id=pg_temp.test_id('customer');
insert into public.service_requests(id,customer_id,category_id,address_id)
  select pg_temp.test_id('request_no_area'),pg_temp.test_id('customer'),c.id,null
  from public.service_categories c where c.code='boiler';

-- 1-3: versions, duplicate and nonnegative price checks.
insert into public.service_quotes(id,service_request_id,version,status,subtotal,total_amount)
 values (pg_temp.test_id('quote1'),pg_temp.test_id('request1'),1,'offered',100,115),
        (pg_temp.test_id('quote2'),pg_temp.test_id('request1'),2,'offered',120,138);
select public.accept_service_quote(pg_temp.test_id('quote1'),pg_temp.test_id('customer'));
do $$ begin
  perform pg_temp.assert_ok((select count(*)=2 from public.service_quotes where service_request_id=pg_temp.test_id('request1')),'quote versions');
  begin
    insert into public.service_quotes(service_request_id,version,status,subtotal,total_amount)
      values(pg_temp.test_id('request1'),1,'draft',1,1);
    raise exception 'Duplicate quote version accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.service_quotes(service_request_id,version,status,subtotal,total_amount)
      values(pg_temp.test_id('request1'),3,'draft',-1,1);
    raise exception 'Negative subtotal accepted';
  exception when check_violation then null; end;
end $$;

-- 4-8: repeat dispatch, candidate uniqueness, cross-dispatch candidate,
--       request/dispatch/quote consistency and repeat job history.
insert into public.service_dispatches(id,service_request_id,quote_id,status) values
 (pg_temp.test_id('dispatch1'),pg_temp.test_id('request1'),pg_temp.test_id('quote1'),'broadcasting'),
 (pg_temp.test_id('dispatch2'),pg_temp.test_id('request1'),null,'broadcasting'),
 (pg_temp.test_id('dispatch3'),pg_temp.test_id('request2'),null,'broadcasting'),
 (pg_temp.test_id('dispatch4'),pg_temp.test_id('request2'),null,'broadcasting'),
 (pg_temp.test_id('dispatch5'),pg_temp.test_id('request2'),null,'broadcasting'),
 (pg_temp.test_id('dispatch_no_area'),pg_temp.test_id('request_no_area'),null,'broadcasting');
insert into public.service_dispatch_candidates(dispatch_id,technician_id,status) values
 (pg_temp.test_id('dispatch1'),pg_temp.test_id('tech1'),'offered'),
 (pg_temp.test_id('dispatch1'),pg_temp.test_id('tech2'),'offered'),
 (pg_temp.test_id('dispatch2'),pg_temp.test_id('tech1'),'offered'),
 (pg_temp.test_id('dispatch3'),pg_temp.test_id('tech1'),'offered'),
 (pg_temp.test_id('dispatch4'),pg_temp.test_id('tech1'),'offered'),
 (pg_temp.test_id('dispatch5'),pg_temp.test_id('tech1'),'offered'),
 (pg_temp.test_id('dispatch5'),pg_temp.test_id('tech2'),'offered'),
 (pg_temp.test_id('dispatch5'),pg_temp.test_id('tech3'),'offered'),
 (pg_temp.test_id('dispatch_no_area'),pg_temp.test_id('tech2'),'offered');
do $$ begin
  perform pg_temp.assert_ok((select count(*)=2 from public.service_dispatches where service_request_id=pg_temp.test_id('request1')),'repeat dispatch');
  begin
    insert into public.service_dispatch_candidates(dispatch_id,technician_id,status)
      values(pg_temp.test_id('dispatch1'),pg_temp.test_id('tech1'),'offered');
    raise exception 'Duplicate dispatch candidate accepted';
  exception when unique_violation then null; end;
  perform pg_temp.assert_ok((select count(*)=2 from public.service_dispatch_candidates where technician_id=pg_temp.test_id('tech1') and dispatch_id in (pg_temp.test_id('dispatch1'),pg_temp.test_id('dispatch2'))),'candidate on different dispatches');
  begin
    insert into public.service_jobs(service_request_id,dispatch_id,technician_id,status)
      values(pg_temp.test_id('request2'),pg_temp.test_id('dispatch1'),pg_temp.test_id('tech1'),'completed');
    raise exception 'Mismatched job/request accepted';
  exception when raise_exception then
    if sqlerrm <> 'Job must use its dispatch accepted-price reference' then raise; end if;
  end;
  begin
    insert into public.service_dispatches(service_request_id,quote_id,status)
      values(pg_temp.test_id('request2'),pg_temp.test_id('quote1'),'pending');
    raise exception 'Mismatched dispatch/quote accepted';
  exception when foreign_key_violation then null; end;
end $$;

-- 9-13: appointment chronology/history, event context, RLS.
insert into public.service_jobs(service_request_id,technician_id,status)
 values(pg_temp.test_id('request1'),pg_temp.test_id('tech2'),'completed');
insert into public.service_jobs(service_request_id,technician_id,status)
 values(pg_temp.test_id('request1'),pg_temp.test_id('tech2'),'cancelled');
do $$ declare j uuid; begin
  select id into j from public.service_jobs where technician_id=pg_temp.test_id('tech2') limit 1;
  begin
    insert into public.service_appointments(job_id,starts_at,ends_at,status)
      values(j,now(),now(),'scheduled');
    raise exception 'Invalid appointment time accepted';
  exception when check_violation then null; end;
  insert into public.service_appointments(job_id,starts_at,ends_at,status)
    values(j,now(),now()+interval '1 hour','scheduled'),
          (j,now()+interval '2 hours',null,'rescheduled');
  perform pg_temp.assert_ok((select count(*)=2 from public.service_appointments where job_id=j),'multiple appointments');
  insert into public.operational_events(service_request_id,job_id,dispatch_id,event_type,entity_type)
    values(pg_temp.test_id('request1'),j,pg_temp.test_id('dispatch1'),'created','job');
  begin
    insert into public.operational_events(event_type,entity_type) values('created','job');
    raise exception 'Contextless event accepted';
  exception when check_violation then null; end;
  perform pg_temp.assert_ok(not exists(select 1 from pg_class where oid=any(array[
    'public.service_quotes'::regclass,'public.service_dispatches'::regclass,
    'public.service_dispatch_candidates'::regclass,'public.service_jobs'::regclass,
    'public.service_appointments'::regclass,'public.operational_events'::regclass
  ]) and not relrowsecurity),'all new tables RLS enabled');
  perform pg_temp.assert_ok((select count(*)=2 from public.service_jobs where service_request_id=pg_temp.test_id('request1')),'multiple jobs per request');
end $$;

-- 19-25: capacity, reopened capacity and idempotency through the real function.
do $$ declare j1 uuid; j2 uuid; j3 uuid; begin
  j1:=public.accept_service_dispatch(pg_temp.test_id('dispatch1'),pg_temp.test_id('tech1'),'op-test-key-1');
  perform pg_temp.assert_ok(j1=public.accept_service_dispatch(pg_temp.test_id('dispatch1'),pg_temp.test_id('tech1'),'op-test-key-1'),'same-key retry');
  perform pg_temp.assert_ok((select count(*)=1 from public.service_jobs where dispatch_id=pg_temp.test_id('dispatch1')),'retry creates one job');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where dispatch_id=pg_temp.test_id('dispatch1') and event_type='dispatch.accepted'),'accept writes one event');
  perform pg_temp.assert_ok((select status='withdrawn' from public.service_dispatch_candidates where dispatch_id=pg_temp.test_id('dispatch1') and technician_id=pg_temp.test_id('tech2')),'loser withdrawn');
  begin
    perform public.accept_service_dispatch(pg_temp.test_id('dispatch2'),pg_temp.test_id('tech1'),'op-test-key-1');
    raise exception 'Cross-context idempotency reuse accepted';
  exception when raise_exception then
    if sqlerrm <> 'Idempotency key belongs to another acceptance' then raise; end if;
  end;
  j2:=public.accept_service_dispatch(pg_temp.test_id('dispatch2'),pg_temp.test_id('tech1'),'op-test-key-2');
  begin
    perform public.accept_service_dispatch(pg_temp.test_id('dispatch3'),pg_temp.test_id('tech1'),'op-test-key-3');
    raise exception 'Third active job accepted';
  exception when raise_exception then
    if sqlerrm <> 'Technician active job capacity reached' then raise; end if;
  end;
  update public.service_jobs set status='completed',completed_at=now() where id=j1;
  j3:=public.accept_service_dispatch(pg_temp.test_id('dispatch3'),pg_temp.test_id('tech1'),'op-test-key-3');
  perform pg_temp.assert_ok(j3 is not null,'completed job frees capacity');
  update public.service_jobs set status='cancelled',cancelled_at=now() where id=j2;
  perform pg_temp.assert_ok(public.accept_service_dispatch(pg_temp.test_id('dispatch4'),pg_temp.test_id('tech1'),'op-test-key-4') is not null,'cancelled job frees capacity');
  begin
    perform public.accept_service_dispatch(pg_temp.test_id('dispatch5'),pg_temp.test_id('tech3'),'op-test-key-5');
    raise exception 'Unapproved technician accepted';
  exception when raise_exception then
    if sqlerrm <> 'Technician is not approved' then raise; end if;
  end;
  update public.technician_profiles set is_available=false where user_id=pg_temp.test_id('tech2');
  begin
    perform public.accept_service_dispatch(pg_temp.test_id('dispatch5'),pg_temp.test_id('tech2'),'op-test-key-unavailable');
    raise exception 'Unavailable technician accepted';
  exception when raise_exception then
    if sqlerrm <> 'Technician is not available' then raise; end if;
  end;
  update public.technician_profiles set is_available=true where user_id=pg_temp.test_id('tech2');
  delete from public.technician_service_areas where technician_id=pg_temp.test_id('tech2');
  begin
    perform public.accept_service_dispatch(pg_temp.test_id('dispatch5'),pg_temp.test_id('tech2'),'op-test-key-area');
    raise exception 'Out-of-area technician accepted';
  exception when raise_exception then
    if sqlerrm <> 'Technician is not eligible for request service area' then raise; end if;
  end;
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    select pg_temp.test_id('tech2'),d.city_id,d.id from public.districts d limit 1;
  begin
    perform public.accept_service_dispatch(pg_temp.test_id('dispatch_no_area'),pg_temp.test_id('tech2'),'op-test-key-no-area');
    raise exception 'Request without normalized area accepted';
  exception when raise_exception then
    if sqlerrm <> 'Request service area is not normalized' then raise; end if;
  end;
  delete from public.technician_service_categories where technician_id=pg_temp.test_id('tech2');
  begin
    perform public.accept_service_dispatch(pg_temp.test_id('dispatch5'),pg_temp.test_id('tech2'),'op-test-key-6');
    raise exception 'Out-of-category technician accepted';
  exception when raise_exception then
    if sqlerrm <> 'Technician is not eligible for request category' then raise; end if;
  end;
  begin
    insert into public.service_jobs(service_request_id,technician_id,status)
      values(pg_temp.test_id('request1'),pg_temp.test_id('tech1'),'assigned');
    raise exception 'Direct third active job accepted';
  exception when raise_exception then
    if sqlerrm <> 'Technician active job capacity reached' then raise; end if;
  end;
  perform pg_temp.assert_ok((select count(*)=1 from public.service_dispatch_candidates where dispatch_id=pg_temp.test_id('dispatch1') and status='accepted'),'one accepted candidate');
  perform pg_temp.assert_ok((select status='accepted' from public.service_dispatches where id=pg_temp.test_id('dispatch1')),'dispatch accepted');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where dispatch_id=pg_temp.test_id('dispatch1') and event_type='dispatch.accepted'),'idempotent retry keeps one accept event');
end $$;

-- 26-28: phase 1 pairing and old request/diagnostic-log relationship intact.
do $$ begin
  perform pg_temp.assert_ok((select count(*) >= 1 from public.service_requests where category_id is null),'legacy nullable request survived');
  perform pg_temp.assert_ok((select count(*) >= 1 from public.diagnostic_logs l join public.service_requests r on r.id=l.request_id),'diagnostic FK relationship survived');
  perform pg_temp.assert_ok(exists(select 1 from pg_constraint where conname='service_requests_service_type_category_fk' and convalidated),'phase 1 category FK survived');
end $$;
rollback;
