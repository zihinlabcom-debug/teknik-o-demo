\set ON_ERROR_STOP on
begin;

create temporary table stage15_ids(k text primary key,v uuid not null);
grant select on stage15_ids to authenticated, service_role;
insert into stage15_ids values
 ('customer',gen_random_uuid()),('tech',gen_random_uuid()),('othertech',gen_random_uuid()),('admin',gen_random_uuid()),
 ('request',gen_random_uuid()),('quote',gen_random_uuid()),('dispatch',gen_random_uuid()),('job',gen_random_uuid()),('appointment',gen_random_uuid());
create function pg_temp.id(k text) returns uuid language sql as $$select v from stage15_ids where stage15_ids.k=$1$$;

insert into auth.users(id) select v from stage15_ids where k in ('customer','tech','othertech','admin');
insert into public.users(id,name,role,is_active) values
 (pg_temp.id('customer'),'CUSTOMER','customer',true),(pg_temp.id('tech'),'TECH','technician',true),(pg_temp.id('othertech'),'OTHER','technician',true),(pg_temp.id('admin'),'ADMIN','admin',true);
insert into public.customer_profiles(user_id) values(pg_temp.id('customer'));
insert into public.technician_profiles(user_id,approval_status,is_available) values(pg_temp.id('tech'),'approved',true),(pg_temp.id('othertech'),'approved',true);
insert into public.cities default values;
insert into public.districts(city_id) select id from public.cities order by id desc limit 1;
insert into public.customer_addresses(customer_id,city_id,district_id) select pg_temp.id('customer'),c.id,d.id from public.cities c join public.districts d on d.city_id=c.id order by c.id desc limit 1;
insert into public.technician_service_categories(technician_id,category_id) select pg_temp.id('tech'),id from public.service_categories where code='boiler';
insert into public.technician_service_categories(technician_id,category_id) select pg_temp.id('othertech'),id from public.service_categories where code='boiler';
insert into public.technician_service_areas(technician_id,city_id) select pg_temp.id('tech'),c.id from public.cities c order by c.id desc limit 1;
insert into public.technician_service_areas(technician_id,city_id) select pg_temp.id('othertech'),c.id from public.cities c order by c.id desc limit 1;
insert into public.service_requests(id,customer_id,category_id,address_id) select pg_temp.id('request'),pg_temp.id('customer'),c.id,a.id from public.service_categories c cross join public.customer_addresses a where c.code='boiler' and a.customer_id=pg_temp.id('customer') limit 1;
insert into public.service_quotes(id,service_request_id,version,status,currency,subtotal,service_fee,total_amount,offered_at) values(pg_temp.id('quote'),pg_temp.id('request'),1,'offered','TRY',100,15,115,now());
set role service_role;
select public.accept_service_quote(pg_temp.id('quote'),pg_temp.id('customer'));
reset role;
insert into public.service_dispatches(id,service_request_id,quote_id,status) values(pg_temp.id('dispatch'),pg_temp.id('request'),pg_temp.id('quote'),'broadcasting');
insert into public.service_dispatch_candidates(dispatch_id,technician_id,status) values(pg_temp.id('dispatch'),pg_temp.id('tech'),'offered'),(pg_temp.id('dispatch'),pg_temp.id('othertech'),'offered');

-- RLS: offered technician sees dispatch; unrelated customer cannot.
select set_config('request.jwt.claim.sub',pg_temp.id('tech')::text,true);
set role authenticated;
do $$begin if (select count(*) from public.service_dispatches where id=pg_temp.id('dispatch'))<>1 then raise exception 'offered technician cannot see dispatch'; end if; end$$;
reset role;
select set_config('request.jwt.claim.sub',pg_temp.id('customer')::text,true);
set role authenticated;
do $$begin if (select count(*) from public.service_requests where id=pg_temp.id('request'))<>1 then raise exception 'customer cannot see own request'; end if; end$$;
reset role;

set role service_role;
select public.accept_service_dispatch(pg_temp.id('dispatch'),pg_temp.id('tech'),'stage15-a7a8-job');
reset role;
select id into temporary table created_job from public.service_jobs where dispatch_id=pg_temp.id('dispatch');
update stage15_ids set v=(select id from created_job) where k='job';

-- Another technician must not see the accepted job.
select set_config('request.jwt.claim.sub',pg_temp.id('othertech')::text,true);
set role authenticated;
do $$begin if exists(select 1 from public.service_jobs where id=pg_temp.id('job')) then raise exception 'other technician sees private job'; end if; end$$;
reset role;

set role service_role;
select public.start_service_job(pg_temp.id('job'),pg_temp.id('tech'));
select public.complete_service_job(pg_temp.id('job'),pg_temp.id('tech'));
reset role;

do $$begin
  begin update public.service_jobs set status='in_progress',completed_at=null where id=pg_temp.id('job'); raise exception 'terminal transition unexpectedly succeeded';
  exception when others then if sqlerrm='terminal transition unexpectedly succeeded' then raise; end if; end;
end$$;

do $$begin
  if (select count(*) from public.operational_events where job_id=pg_temp.id('job') and event_type='job.started')<>1 then raise exception 'job.started event missing'; end if;
  if (select count(*) from public.operational_events where job_id=pg_temp.id('job') and event_type='job.completed')<>1 then raise exception 'job.completed event missing'; end if;
end$$;

rollback;
