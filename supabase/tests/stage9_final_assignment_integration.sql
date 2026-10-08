-- Disposable PostgreSQL only. The harness must set up the operation fixture,
-- Stage 9 migrations and a database named tekniko_operation_test first.
\set ON_ERROR_STOP on
do $$ begin
  if current_database()<>'tekniko_operation_test' then
    raise exception 'Refusing Stage 9.3 integration test outside disposable database';
  end if;
end $$;
begin;

create temporary table stage93_ids(k text primary key,v uuid not null);
insert into stage93_ids values
  ('customer',gen_random_uuid()),('admin',gen_random_uuid()),
  ('a',gen_random_uuid()),('b',gen_random_uuid()),('c',gen_random_uuid()),
  ('request',gen_random_uuid()),('quote',gen_random_uuid()),
  ('exhausted_request',gen_random_uuid()),('exhausted_quote',gen_random_uuid()),
  ('second_exhausted_request',gen_random_uuid()),('second_exhausted_quote',gen_random_uuid()),
  ('appointment_request',gen_random_uuid()),('appointment_quote',gen_random_uuid()),
  ('urgent_request',gen_random_uuid()),('urgent_quote',gen_random_uuid());
create function pg_temp.stage93_id(k text) returns uuid language sql as $$
  select v from pg_temp.stage93_ids where stage93_ids.k=$1
$$;
create function pg_temp.stage93_assert(ok boolean,label text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAILED: %',label; end if;
end $$;

insert into auth.users(id)
select v from stage93_ids where k in ('customer','admin','a','b','c');
insert into public.users(id,name,role,is_active) values
  (pg_temp.stage93_id('customer'),'STAGE93 CUSTOMER','customer',true),
  (pg_temp.stage93_id('admin'),'STAGE93 ADMIN','admin',true),
  (pg_temp.stage93_id('a'),'STAGE93 A','technician',true),
  (pg_temp.stage93_id('b'),'STAGE93 B','technician',true),
  (pg_temp.stage93_id('c'),'STAGE93 C','technician',true);
insert into public.customer_profiles(user_id) values(pg_temp.stage93_id('customer'));
insert into public.cities default values;
insert into public.districts(city_id)
select id from public.cities order by id desc limit 1;
insert into public.customer_addresses(customer_id,city_id,district_id)
select pg_temp.stage93_id('customer'),c.id,d.id
from public.cities c join public.districts d on d.city_id=c.id
order by c.id desc limit 1;
insert into public.technician_profiles(user_id,approval_status,is_available) values
  (pg_temp.stage93_id('a'),'approved',true),
  (pg_temp.stage93_id('b'),'approved',true),
  (pg_temp.stage93_id('c'),'approved',false);
insert into public.technician_service_categories(technician_id,category_id,approval_status)
select pg_temp.stage93_id(x.k),c.id,'approved'
from (values('a'),('b'),('c')) x(k)
cross join public.service_categories c where c.code='boiler';
insert into public.technician_service_areas(technician_id,city_id,district_id)
select pg_temp.stage93_id(x.k),c.id,null
from (values('a'),('b'),('c')) x(k)
cross join lateral (select id from public.cities order by id desc limit 1)c;

insert into public.service_requests(id,customer_id,category_id,address_id)
select x.r,pg_temp.stage93_id('customer'),c.id,a.id
from (values
  (pg_temp.stage93_id('request')),
  (pg_temp.stage93_id('exhausted_request')),
  (pg_temp.stage93_id('second_exhausted_request')),
  (pg_temp.stage93_id('appointment_request')),
  (pg_temp.stage93_id('urgent_request'))
) x(r)
cross join public.service_categories c
cross join lateral (
  select id from public.customer_addresses
  where customer_id=pg_temp.stage93_id('customer') order by id desc limit 1
) a
where c.code='boiler';
insert into public.service_quotes(id,service_request_id,version,status,currency,subtotal,service_fee,total_amount,offered_at)
values
  (pg_temp.stage93_id('quote'),pg_temp.stage93_id('request'),1,'offered','TRY',100,15,115,now()),
  (pg_temp.stage93_id('exhausted_quote'),pg_temp.stage93_id('exhausted_request'),1,'offered','TRY',100,15,115,now()),
  (pg_temp.stage93_id('second_exhausted_quote'),pg_temp.stage93_id('second_exhausted_request'),1,'offered','TRY',100,15,115,now()),
  (pg_temp.stage93_id('appointment_quote'),pg_temp.stage93_id('appointment_request'),1,'offered','TRY',100,15,115,now()),
  (pg_temp.stage93_id('urgent_quote'),pg_temp.stage93_id('urgent_request'),1,'offered','TRY',100,15,115,now());
select public.accept_service_quote(pg_temp.stage93_id(x.q),pg_temp.stage93_id('customer'))
from (values('quote'),('exhausted_quote'),('second_exhausted_quote'),('appointment_quote'),('urgent_quote'))x(q);

-- A: first accepted automatic job times out; B: the second and last cycle.
select public.start_service_distribution_cycle(pg_temp.stage93_id('request'),pg_temp.stage93_id('quote'),null);
do $$ begin
  perform pg_temp.stage93_assert((select count(*)=1 from public.service_distribution_cycles
    where service_request_id=pg_temp.stage93_id('request')),'initial cycle');
  perform pg_temp.stage93_assert((select current_round=1 and next_round_at>now()
    from public.service_distribution_cycles where service_request_id=pg_temp.stage93_id('request')),'seven-minute first round');
end $$;

select public.accept_service_dispatch(d.id,pg_temp.stage93_id('a'),'stage93-auto-a')
from public.service_dispatches d
where d.service_request_id=pg_temp.stage93_id('request')
  and d.round_no=1 order by d.created_at desc limit 1;
update public.service_jobs set assigned_at=now()-interval '61 minutes'
where idempotency_key='stage93-auto-a';
select public.timeout_service_job_for_missing_appointment(id)
from public.service_jobs where idempotency_key='stage93-auto-a';
do $$ begin
  perform pg_temp.stage93_assert((select count(*)=2 from public.service_distribution_cycles
    where service_request_id=pg_temp.stage93_id('request')),'second cycle starts');
  perform pg_temp.stage93_assert((select public.automatic_appointment_timeout_count(pg_temp.stage93_id('request'))=1),'first verified automatic failure');
  perform pg_temp.stage93_assert(not public.admin_manual_assignment_ready(pg_temp.stage93_id('request')),'admin closed during second cycle');
  perform pg_temp.stage93_assert((select count(*)=1 from public.service_request_technician_exclusions
    where service_request_id=pg_temp.stage93_id('request') and technician_id=pg_temp.stage93_id('a')),'A permanently excluded');
  begin
    perform public.start_service_distribution_cycle(pg_temp.stage93_id('request'),pg_temp.stage93_id('quote'),
      (select id from public.service_jobs where idempotency_key='stage93-auto-a'));
  exception when others then
    raise exception 'idempotent redistribution retry unexpectedly failed: %',sqlerrm;
  end;
end $$;

select public.accept_service_dispatch(d.id,pg_temp.stage93_id('b'),'stage93-auto-b')
from public.service_dispatches d
join public.service_distribution_cycles c on c.id=d.distribution_cycle_id
where d.service_request_id=pg_temp.stage93_id('request')
  and c.source_job_id is not null and d.round_no=1
order by d.created_at desc limit 1;
update public.service_jobs set assigned_at=now()-interval '61 minutes'
where idempotency_key='stage93-auto-b';
select public.timeout_service_job_for_missing_appointment(id)
from public.service_jobs where idempotency_key='stage93-auto-b';
do $$ begin
  perform pg_temp.stage93_assert((select count(*)=2 from public.service_distribution_cycles
    where service_request_id=pg_temp.stage93_id('request')),'third cycle blocked');
  perform pg_temp.stage93_assert((select public.automatic_appointment_timeout_count(pg_temp.stage93_id('request'))=2),'second verified automatic failure');
  perform pg_temp.stage93_assert(public.admin_manual_assignment_ready(pg_temp.stage93_id('request')),'admin opens after second timeout');
  perform pg_temp.stage93_assert((select count(*)=1 from public.operational_events
    where service_request_id=pg_temp.stage93_id('request')
      and event_type='distribution.manual_assignment_required'),'handoff event once');
  perform pg_temp.stage93_assert(
    not has_function_privilege('authenticated','public.admin_manual_assign_service_job(uuid,uuid,uuid,text,text)','EXECUTE'),
    'authenticated role cannot invoke manual assignment');
  begin
    perform public.admin_manual_assign_service_job(pg_temp.stage93_id('request'),pg_temp.stage93_id('a'),
      pg_temp.stage93_id('admin'),'Excluded technician','stage93-reject-a');
    raise exception 'excluded technician unexpectedly assigned';
  exception when raise_exception then
    if sqlerrm<>'Technician is excluded from this request' then raise; end if;
  end;
  begin
    perform public.admin_manual_assign_service_job(pg_temp.stage93_id('request'),pg_temp.stage93_id('customer'),
      pg_temp.stage93_id('admin'),'Wrong role technician','stage93-reject-customer');
    raise exception 'non-technician unexpectedly assigned';
  exception when raise_exception then
    if sqlerrm<>'Technician account is not active' then raise; end if;
  end;
  begin
    perform public.admin_manual_assignment_candidates(pg_temp.stage93_id('request'),pg_temp.stage93_id('customer'));
    raise exception 'non-admin candidate lookup unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm<>'Active admin account required' then raise; end if;
  end;
  begin
    perform public.start_service_distribution_cycle(pg_temp.stage93_id('request'),pg_temp.stage93_id('quote'),
      (select id from public.service_jobs where idempotency_key='stage93-auto-b'));
    raise exception 'third cycle unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm='third cycle unexpectedly accepted' then raise; end if;
  end;
end $$;

select pg_temp.stage93_assert((select count(*)=1 from public.admin_manual_assignment_candidates(
  pg_temp.stage93_id('request'),pg_temp.stage93_id('admin'))),'only eligible nonexcluded C listed');
select public.admin_manual_assign_service_job(
  pg_temp.stage93_id('request'),pg_temp.stage93_id('c'),pg_temp.stage93_id('admin'),
  'İki otomatik randevu süresi doldu','stage93-manual-c');
do $$ begin
  perform pg_temp.stage93_assert((select assignment_source='admin_manual' from public.service_jobs
    where idempotency_key='stage93-manual-c'),'manual source');
  perform pg_temp.stage93_assert((select count(*)=1 from public.operational_events
    where service_request_id=pg_temp.stage93_id('request') and event_type='admin.manual_assignment'),'manual audit once');
  perform pg_temp.stage93_assert(not public.admin_manual_assignment_ready(pg_temp.stage93_id('request')),'no second manual assignment');
  begin
    update public.service_jobs set assignment_source='automatic'
    where idempotency_key='stage93-manual-c';
    raise exception 'assignment source unexpectedly changed';
  exception when raise_exception then
    if sqlerrm<>'Job assignment source is immutable' then raise; end if;
  end;
end $$;

select pg_temp.stage93_assert(public.timeout_service_job_for_missing_appointment(
  (select id from public.service_jobs where idempotency_key='stage93-manual-c')) is null,
  'manual job keeps its sixty-minute appointment window');
update public.service_jobs set assigned_at=now()-interval '61 minutes'
where idempotency_key='stage93-manual-c';
select pg_temp.stage93_assert(
  (public.run_service_distribution_automation()->>'appointment_timeouts')::integer=1,
  'manual timeout counted by existing automation without new cycle');
do $$ begin
  perform pg_temp.stage93_assert((select status='technician_unavailable' from public.service_requests
    where id=pg_temp.stage93_id('request')),'terminal request status');
  perform pg_temp.stage93_assert((select count(*)=3 from public.service_request_technician_exclusions
    where service_request_id=pg_temp.stage93_id('request')),'manual technician excluded');
  perform pg_temp.stage93_assert((select count(*)=1 from public.operational_events
    where service_request_id=pg_temp.stage93_id('request') and event_type='request.technician_unavailable'
      and payload->>'reason'='manual_appointment_timeout'),'terminal reason once');
  perform pg_temp.stage93_assert((select count(*)=2 from public.service_distribution_cycles
    where service_request_id=pg_temp.stage93_id('request')),'manual timeout does not redistribute');
  perform pg_temp.stage93_assert(
    (public.run_service_distribution_automation()->>'appointment_timeouts')::integer=0,
    'repeated automation no-op');
  perform pg_temp.stage93_assert(public.timeout_service_job_for_missing_appointment(
    (select id from public.service_jobs where idempotency_key='stage93-manual-c')) is null,
    'repeated manual timeout no-op');
  begin
    update public.service_requests set status='diagnosing'
    where id=pg_temp.stage93_id('request');
    raise exception 'terminal request reopened';
  exception when raise_exception then
    if sqlerrm='terminal request reopened' then raise; end if;
  end;
  begin
    perform public.admin_manual_assign_service_job(pg_temp.stage93_id('request'),pg_temp.stage93_id('c'),
      pg_temp.stage93_id('admin'),'Retry blocked','stage93-manual-retry');
    raise exception 'terminal manual assignment accepted';
  exception when raise_exception then
    if sqlerrm='terminal manual assignment accepted' then raise; end if;
  end;
  begin
    perform public.start_service_distribution_cycle(pg_temp.stage93_id('request'),pg_temp.stage93_id('quote'),null);
    raise exception 'terminal automatic distribution accepted';
  exception when raise_exception then
    if sqlerrm<>'Terminal service request cannot be redistributed' then raise; end if;
  end;
  begin
    insert into public.service_distribution_cycles(service_request_id,quote_id,status,current_round)
    values(pg_temp.stage93_id('request'),pg_temp.stage93_id('quote'),'active',0);
    raise exception 'terminal direct cycle insert accepted';
  exception when raise_exception then
    if sqlerrm<>'Terminal service request cannot be assigned or redistributed' then raise; end if;
  end;
  begin
    insert into public.service_jobs(
      service_request_id,dispatch_id,accepted_quote_id,technician_id,status,assignment_source
    ) values(
      pg_temp.stage93_id('request'),
      (select dispatch_id from public.service_jobs where idempotency_key='stage93-manual-c'),
      pg_temp.stage93_id('quote'),pg_temp.stage93_id('a'),'assigned','automatic'
    );
    raise exception 'terminal direct job insert accepted';
  exception when raise_exception then
    if sqlerrm<>'Terminal service request cannot be assigned or redistributed' then raise; end if;
  end;
end $$;


-- Existing jobs and cycles cannot be moved between requests.
do $$ begin
  begin
    update public.service_jobs
    set service_request_id=pg_temp.stage93_id('exhausted_request')
    where idempotency_key='stage93-manual-c';
    raise exception 'terminal job moved unexpectedly';
  exception when raise_exception then
    if sqlerrm not in ('Assignment service request is immutable','Job request, dispatch and accepted-price references are immutable') then raise; end if;
  end;

  begin
    update public.service_distribution_cycles
    set service_request_id=pg_temp.stage93_id('exhausted_request')
    where service_request_id=pg_temp.stage93_id('request');
    raise exception 'terminal cycle moved unexpectedly';
  exception when raise_exception then
    if sqlerrm<>'Assignment service request is immutable' then raise; end if;
  end;
end $$;

-- A separate three-round cycle has no accepted technician, then opens admin.
select public.start_service_distribution_cycle(pg_temp.stage93_id('exhausted_request'),pg_temp.stage93_id('exhausted_quote'),null);
do $$ declare i integer; begin
  for i in 1..3 loop
    update public.service_distribution_cycles set next_round_at=now()-interval '1 minute'
    where service_request_id=pg_temp.stage93_id('exhausted_request') and status='active';
    perform public.advance_service_distribution_cycles();
  end loop;
  perform pg_temp.stage93_assert((select status='exhausted' and current_round=3
    from public.service_distribution_cycles where service_request_id=pg_temp.stage93_id('exhausted_request')),'three rounds exhausted');
  perform pg_temp.stage93_assert(public.admin_manual_assignment_ready(pg_temp.stage93_id('exhausted_request')),'exhausted admin readiness');
end $$;

-- First appointment timeout starts cycle two; its unanswered three rounds
-- also hand the request to admin without creating a third cycle.
select public.start_service_distribution_cycle(pg_temp.stage93_id('second_exhausted_request'),pg_temp.stage93_id('second_exhausted_quote'),null);
select public.accept_service_dispatch(d.id,pg_temp.stage93_id('a'),'stage93-second-exhaust-a')
from public.service_dispatches d
where d.service_request_id=pg_temp.stage93_id('second_exhausted_request')
and d.round_no=1 order by d.created_at desc limit 1;
update public.service_jobs set assigned_at=now()-interval '61 minutes'
where idempotency_key='stage93-second-exhaust-a';
select public.timeout_service_job_for_missing_appointment(id)
from public.service_jobs where idempotency_key='stage93-second-exhaust-a';
do $$ declare i integer; begin
  for i in 1..3 loop
    update public.service_distribution_cycles set next_round_at=now()-interval '1 minute'
    where service_request_id=pg_temp.stage93_id('second_exhausted_request') and status='active';
    perform public.advance_service_distribution_cycles();
  end loop;
  perform pg_temp.stage93_assert((select count(*)=2 from public.service_distribution_cycles
    where service_request_id=pg_temp.stage93_id('second_exhausted_request')),'second exhausted cycle count');
  perform pg_temp.stage93_assert((select status='exhausted' and current_round=3
    from public.service_distribution_cycles where service_request_id=pg_temp.stage93_id('second_exhausted_request')
    order by (source_job_id is not null) desc,started_at desc limit 1),'second cycle exhausted');
  perform pg_temp.stage93_assert(public.admin_manual_assignment_ready(pg_temp.stage93_id('second_exhausted_request')),'second exhaustion admin readiness');
end $$;

-- The appointment and emergency direct-completion branches remain unaffected.
select public.start_service_distribution_cycle(pg_temp.stage93_id('appointment_request'),pg_temp.stage93_id('appointment_quote'),null);
select public.accept_service_dispatch(d.id,pg_temp.stage93_id('a'),'stage93-appointment-job')
from public.service_dispatches d where d.service_request_id=pg_temp.stage93_id('appointment_request')
and d.round_no=1 order by d.created_at desc limit 1;
select public.create_service_appointment(
  j.id,
  pg_temp.stage93_id('a'),
  case
    when (now() at time zone 'Europe/Istanbul')::time < time '19:30'
      then now()+interval '30 minutes'
    else (
      ((now() at time zone 'Europe/Istanbul')::date + 1 + time '10:00')
      at time zone 'Europe/Istanbul'
    )
  end
)
from public.service_jobs j where j.idempotency_key='stage93-appointment-job';
update public.service_jobs set assigned_at=now()-interval '61 minutes' where idempotency_key='stage93-appointment-job';
select pg_temp.stage93_assert(public.timeout_service_job_for_missing_appointment(
  (select id from public.service_jobs where idempotency_key='stage93-appointment-job')) is null,'appointment protects assigned job');

select public.start_service_distribution_cycle(pg_temp.stage93_id('urgent_request'),pg_temp.stage93_id('urgent_quote'),null);
select public.accept_service_dispatch(d.id,pg_temp.stage93_id('b'),'stage93-urgent-job')
from public.service_dispatches d where d.service_request_id=pg_temp.stage93_id('urgent_request')
and d.round_no=1 order by d.created_at desc limit 1;
select public.complete_service_job(j.id,pg_temp.stage93_id('b'))
from public.service_jobs j where j.idempotency_key='stage93-urgent-job';
select pg_temp.stage93_assert((select status='completed' from public.service_jobs
  where idempotency_key='stage93-urgent-job'),'urgent direct completion');

rollback;
select 'PASS: Stage 9.3 disposable PostgreSQL behavior' as result;
