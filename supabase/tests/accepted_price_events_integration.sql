-- Disposable local PostgreSQL only; all records and probes roll back.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database()<>'tekniko_operation_test' then
    raise exception 'Refusing accepted-price test outside disposable local database';
  end if;
end $$;
create temp table accepted_test_ids(k text primary key,id uuid not null);
create function pg_temp.test_id(p_key text) returns uuid language sql security definer set search_path='' as $$
  select id from pg_temp.accepted_test_ids where k=p_key
$$;
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
insert into pg_temp.accepted_test_ids(k,id) values
  ('customer',gen_random_uuid()),('stranger',gen_random_uuid()),('technician',gen_random_uuid()),
  ('admin',gen_random_uuid()),('request',gen_random_uuid()),('request2',gen_random_uuid()),
  ('quote1',gen_random_uuid()),('quote2',gen_random_uuid()),('quote3',gen_random_uuid()),
  ('dispatch',gen_random_uuid()),('appointment',gen_random_uuid());
insert into auth.users(id) select id from pg_temp.accepted_test_ids where k in ('customer','stranger','technician','admin');
insert into public.users(id,name,role) values
  (pg_temp.test_id('customer'),'TEST CUSTOMER','customer'),
  (pg_temp.test_id('stranger'),'TEST STRANGER','customer'),
  (pg_temp.test_id('technician'),'TEST TECHNICIAN','technician'),
  (pg_temp.test_id('admin'),'TEST ADMIN','admin');
insert into public.customer_profiles(user_id) values(pg_temp.test_id('customer'));
insert into public.cities default values;
insert into public.districts(city_id) select id from public.cities order by id desc limit 1;
insert into public.customer_addresses(customer_id,city_id,district_id)
  select pg_temp.test_id('customer'),c.id,d.id from public.cities c
  join public.districts d on d.city_id=c.id order by c.id desc,d.id desc limit 1;
insert into public.technician_profiles(user_id,approval_status,is_available)
  values(pg_temp.test_id('technician'),'approved',true);
insert into public.technician_service_areas(technician_id,city_id,district_id)
  select pg_temp.test_id('technician'),id,null from public.cities order by id desc limit 1;
insert into public.technician_service_categories(technician_id,category_id)
  select pg_temp.test_id('technician'),id from public.service_categories where code='boiler';
insert into public.service_requests(id,customer_id,category_id,address_id)
  select pg_temp.test_id('request'),pg_temp.test_id('customer'),c.id,a.id
  from public.service_categories c cross join public.customer_addresses a
  where c.code='boiler' and a.customer_id=pg_temp.test_id('customer') limit 1;
insert into public.service_requests(id,customer_id)
  values(pg_temp.test_id('request2'),pg_temp.test_id('customer'));
insert into public.service_quotes(id,service_request_id,version,status,currency,subtotal,service_fee,total_amount,breakdown,offered_at)
  values
    (pg_temp.test_id('quote1'),pg_temp.test_id('request'),1,'offered','TRY',100.00,15.00,115.00,'{"source":"test"}'::jsonb,now()),
    (pg_temp.test_id('quote2'),pg_temp.test_id('request'),2,'offered','TRY',120.00,18.00,138.00,'{}'::jsonb,now());
insert into public.service_quotes(id,service_request_id,version,status,subtotal,total_amount)
  values(pg_temp.test_id('quote3'),pg_temp.test_id('request2'),1,'offered',50.00,50.00);

-- Only the server role can invoke acceptance; the first result is the snapshot.
set local role service_role;
select pg_temp.assert_ok(
  public.accept_service_quote(pg_temp.test_id('quote1'),pg_temp.test_id('customer'))=pg_temp.test_id('quote1'),
  'quote accepted by service role');
select pg_temp.assert_ok(
  public.accept_service_quote(pg_temp.test_id('quote1'),pg_temp.test_id('customer'))=pg_temp.test_id('quote1'),
  'same acceptance returns existing snapshot');
reset role;

do $$ begin
  perform pg_temp.assert_ok((select status='accepted' and accepted_at is not null
    and subtotal=100.00 and service_fee=15.00 and total_amount=115.00
    and breakdown='{"source":"test"}'::jsonb
    from public.service_quotes where id=pg_temp.test_id('quote1')),'numeric snapshot locked');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events
    where event_type='quote.accepted' and entity_id=pg_temp.test_id('quote1')
      and actor_user_id=pg_temp.test_id('customer') and payload='{}'::jsonb),'one quote event with actor');
  begin
    update public.service_quotes set total_amount=999 where id=pg_temp.test_id('quote1');
    raise exception 'Accepted amount mutated';
  exception when raise_exception then
    if sqlerrm <> 'Accepted price snapshot cannot be changed' then raise; end if;
  end;
  begin
    update public.service_quotes set breakdown='{}'::jsonb where id=pg_temp.test_id('quote1');
    raise exception 'Accepted breakdown mutated';
  exception when raise_exception then
    if sqlerrm <> 'Accepted price snapshot cannot be changed' then raise; end if;
  end;
  begin
    delete from public.service_quotes where id=pg_temp.test_id('quote1');
    raise exception 'Accepted quote deleted';
  exception when raise_exception then
    if sqlerrm <> 'Accepted price snapshot cannot be deleted' then raise; end if;
  end;
  begin
    update public.service_quotes set total_amount=999 where id=pg_temp.test_id('quote2');
    raise exception 'Presented offer amount changed without a new version';
  exception when raise_exception then
    if sqlerrm <> 'Offered quote terms cannot change; create a new version' then raise; end if;
  end;
  begin
    insert into public.service_quotes(service_request_id,version,status,subtotal,total_amount,accepted_at)
      values(pg_temp.test_id('request'),3,'accepted',1,1,now());
    raise exception 'Direct accepted quote insert allowed';
  exception when raise_exception then
    if sqlerrm <> 'Accepted quote must use accept_service_quote' then raise; end if;
  end;
end $$;

set local role service_role;
do $$ begin
  begin
    update public.service_quotes set status='accepted',accepted_at=now() where id=pg_temp.test_id('quote2');
    raise exception 'Direct accepted status update allowed';
  exception when raise_exception then
    if sqlerrm <> 'Accepted quote must use accept_service_quote' then raise; end if;
  end;
  begin
    perform public.accept_service_quote(pg_temp.test_id('quote2'),pg_temp.test_id('customer'));
    raise exception 'Second quote accepted for same request';
  exception when raise_exception then
    if sqlerrm <> 'Another quote is already accepted for this request' then raise; end if;
  end;
end $$;
reset role;

-- If event insertion fails, the accepted status must roll back with it.
create function pg_temp.fail_quote_event() returns trigger language plpgsql as $$
begin
  if new.event_type='quote.accepted' then raise exception 'test event insert failure'; end if;
  return new;
end $$;
create trigger test_quote_event_failure before insert on public.operational_events
  for each row execute function pg_temp.fail_quote_event();
do $$ begin
  begin
    perform public.accept_service_quote(pg_temp.test_id('quote3'),pg_temp.test_id('customer'));
    raise exception 'Quote accepted despite event failure';
  exception when raise_exception then
    if sqlerrm <> 'test event insert failure' then raise; end if;
  end;
  perform pg_temp.assert_ok((select status='offered' and accepted_at is null
    from public.service_quotes where id=pg_temp.test_id('quote3')),'failed event rolls back acceptance');
  perform pg_temp.assert_ok((select count(*)=0 from public.operational_events
    where entity_id=pg_temp.test_id('quote3')),'failed event leaves no history');
end $$;
drop trigger test_quote_event_failure on public.operational_events;

-- Prepared dispatch uses the accepted quote. Job and dispatch events are atomic.
insert into public.service_dispatches(id,service_request_id,quote_id,status)
  values(pg_temp.test_id('dispatch'),pg_temp.test_id('request'),pg_temp.test_id('quote1'),'broadcasting');
insert into public.service_dispatch_candidates(dispatch_id,technician_id,status)
  values(pg_temp.test_id('dispatch'),pg_temp.test_id('technician'),'offered');
select set_config('request.jwt.claim.sub',pg_temp.test_id('technician')::text,true);
set local role authenticated;
select pg_temp.assert_ok((select count(*)=1 from public.service_quotes where service_request_id=pg_temp.test_id('request')),'offered technician sees only dispatch quote');
select pg_temp.assert_ok((select count(*)=1 from public.service_dispatches where id=pg_temp.test_id('dispatch')),'offered technician sees dispatch');
reset role;
update public.users set is_active=false where id=pg_temp.test_id('technician');
set local role authenticated;
select pg_temp.assert_ok((select count(*)=0 from public.service_quotes where service_request_id=pg_temp.test_id('request')),'inactive technician quote hidden');
select pg_temp.assert_ok((select count(*)=0 from public.service_dispatches where id=pg_temp.test_id('dispatch')),'inactive technician dispatch hidden');
reset role;
update public.users set is_active=true where id=pg_temp.test_id('technician');
set local role service_role;
select public.accept_service_dispatch(pg_temp.test_id('dispatch'),pg_temp.test_id('technician'),'accepted-price-dispatch-test');
select public.accept_service_dispatch(pg_temp.test_id('dispatch'),pg_temp.test_id('technician'),'accepted-price-dispatch-test');
reset role;
select set_config('request.jwt.claim.sub',pg_temp.test_id('technician')::text,true);
set local role authenticated;
select pg_temp.assert_ok((select count(*)=2 from public.service_quotes where service_request_id=pg_temp.test_id('request')),'assigned technician sees job request quotes');
reset role;
do $$ declare job uuid; begin
  select id into strict job from public.service_jobs where dispatch_id=pg_temp.test_id('dispatch');
  perform pg_temp.assert_ok((select accepted_quote_id=pg_temp.test_id('quote1') from public.service_jobs where id=job),'job points to accepted snapshot');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where dispatch_id=pg_temp.test_id('dispatch') and event_type='dispatch.accepted'),'one dispatch acceptance event');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where job_id=job and event_type='job.assigned'),'one job assignment event');
  begin
    update public.service_dispatches set quote_id=null where id=pg_temp.test_id('dispatch');
    raise exception 'Assigned dispatch quote changed';
  exception when raise_exception then
    if sqlerrm <> 'Dispatch quote cannot change after job assignment' then raise; end if;
  end;


  begin
    update public.service_jobs
      set dispatch_id=null,accepted_quote_id=null
      where id=job;
    raise exception 'Job accepted-price chain removed';
  exception when raise_exception then
    if sqlerrm <> 'Job request, dispatch and accepted-price references are immutable' then raise; end if;
  end;

  begin
    insert into public.service_jobs(service_request_id,technician_id,status)
      values(pg_temp.test_id('request'),pg_temp.test_id('technician'),'assigned');
    raise exception 'Job without accepted price created';
  exception when raise_exception then
    if sqlerrm <> 'Job requires dispatch and accepted price snapshot' then raise; end if;
  end;

  update public.service_jobs set status='in_progress',started_at=now() where id=job;
  update public.service_jobs set status='in_progress' where id=job;
  update public.service_jobs set status='completed',completed_at=now() where id=job;
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where job_id=job and event_type='job.started'),'job start one event');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where job_id=job and event_type='job.completed'),'job completion one event');

  insert into public.service_appointments(id,job_id,starts_at,ends_at,status)
    values(pg_temp.test_id('appointment'),job,now()+interval '1 day',now()+interval '1 day 1 hour','scheduled');
  update public.service_appointments set starts_at=starts_at+interval '1 hour',ends_at=ends_at+interval '1 hour'
    where id=pg_temp.test_id('appointment');
  update public.service_appointments set status='confirmed' where id=pg_temp.test_id('appointment');
  update public.service_appointments set status='confirmed' where id=pg_temp.test_id('appointment');
  update public.service_appointments set status='cancelled' where id=pg_temp.test_id('appointment');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where entity_id=pg_temp.test_id('appointment') and event_type='appointment.scheduled'),'appointment insert event');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where entity_id=pg_temp.test_id('appointment') and event_type='appointment.rescheduled'),'appointment reschedule event');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where entity_id=pg_temp.test_id('appointment') and event_type='appointment.confirmed'),'appointment status event idempotent');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events where entity_id=pg_temp.test_id('appointment') and event_type='appointment.cancelled'),'appointment cancellation event');

  begin
    update public.service_jobs
      set status='cancelled',cancelled_at=now()
      where id=job;
    raise exception 'Completed job cancellation allowed';
  exception when raise_exception then
    if sqlerrm <> 'Terminal job status is immutable' then raise; end if;
  end;
  perform pg_temp.assert_ok((select count(*)=0 from public.operational_events
    where job_id=job and event_type='job.cancelled'),'completed job cannot emit cancellation event');

  begin
    update public.operational_events set event_type='tampered' where job_id=job;
    raise exception 'Event update allowed';
  exception when raise_exception then
    if sqlerrm <> 'Operational events are append-only' then raise; end if;
  end;
  begin
    delete from public.operational_events where job_id=job;
    raise exception 'Event delete allowed';
  exception when raise_exception then
    if sqlerrm <> 'Operational events are append-only' then raise; end if;
  end;
end $$;

-- Real role/RLS checks: customer sees own quote, stranger does not, client DML closed.
select set_config('request.jwt.claim.sub',pg_temp.test_id('customer')::text,true);
set local role authenticated;
select pg_temp.assert_ok((select count(*)=2 from public.service_quotes where service_request_id=pg_temp.test_id('request')),'customer sees own quote versions');
select pg_temp.assert_ok(not has_table_privilege(current_user,'public.service_quotes','INSERT')
  and not has_table_privilege(current_user,'public.service_quotes','UPDATE')
  and not has_table_privilege(current_user,'public.operational_events','INSERT')
  and not has_table_privilege(current_user,'public.operational_events','UPDATE')
  and not has_table_privilege(current_user,'public.operational_events','DELETE'),'client critical DML closed');
select pg_temp.assert_ok(not has_function_privilege(current_user,'public.accept_service_quote(uuid,uuid)','EXECUTE')
  and not has_function_privilege(current_user,'public.accept_service_dispatch(uuid,uuid,text)','EXECUTE'),'client RPC closed');
do $$ begin
  begin
    insert into public.operational_events(service_request_id,event_type,entity_type)
      values(pg_temp.test_id('request'),'client.fake','service_request');
    raise exception 'Authenticated event insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.service_quotes set total_amount=999 where id=pg_temp.test_id('quote1');
    raise exception 'Authenticated quote update allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',pg_temp.test_id('stranger')::text,true);
set local role authenticated;
select pg_temp.assert_ok((select count(*)=0 from public.service_quotes where service_request_id=pg_temp.test_id('request')),'stranger quote hidden');
reset role;
select set_config('request.jwt.claim.sub',pg_temp.test_id('admin')::text,true);
set local role authenticated;
select pg_temp.assert_ok((select count(*)=2 from public.service_quotes where service_request_id=pg_temp.test_id('request')),'active admin sees quote');
reset role;
rollback;
