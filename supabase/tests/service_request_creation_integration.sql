\set ON_ERROR_STOP on
begin;

do $$ begin
  if current_database()<>'tekniko_operation_test' then
    raise exception 'Refusing Stage 2 test outside disposable local database';
  end if;
end $$;

create temporary table stage2_ids(k text primary key,v uuid not null) on commit drop;
insert into stage2_ids values
 ('customer',gen_random_uuid()),('other_customer',gen_random_uuid()),('address',gen_random_uuid());
create function pg_temp.sid(p_k text) returns uuid language sql stable security definer set search_path='' as $$
  select v from pg_temp.stage2_ids where k=p_k
$$;
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',label; end if; end $$;

insert into auth.users(id) values(pg_temp.sid('customer')),(pg_temp.sid('other_customer'));
insert into public.users(id,name,role,is_active) values
 (pg_temp.sid('customer'),'STAGE2 CUSTOMER','customer',true),
 (pg_temp.sid('other_customer'),'STAGE2 OTHER','customer',true);
insert into public.customer_profiles(user_id) values(pg_temp.sid('customer')),(pg_temp.sid('other_customer'));

insert into public.cities default values;
insert into public.districts(city_id) select id from public.cities order by id desc limit 1;
insert into public.customer_addresses(id,customer_id,city_id,district_id)
select pg_temp.sid('address'),pg_temp.sid('customer'),c.id,d.id
from public.cities c join public.districts d on d.city_id=c.id
order by c.id desc,d.id desc limit 1;

create temporary table stage2_results(k text primary key,v uuid not null) on commit drop;
insert into stage2_results values
 ('first',public.create_service_request(
   pg_temp.sid('customer'),'boiler',pg_temp.sid('address'),
   'Stage2 issue','Stage2 problem','conversation-sha256:test','stage2-request-key'
 )),
 ('second',public.create_service_request(
   pg_temp.sid('customer'),'boiler',pg_temp.sid('address'),
   'Changed issue','Changed problem','conversation-sha256:test','stage2-request-key'
 ));

do $$ begin
  perform pg_temp.assert_ok(
    (select v from stage2_results where k='first')=(select v from stage2_results where k='second'),
    'same request key returns same request id');
  perform pg_temp.assert_ok(
    (select count(*)=1 from public.service_requests where customer_id=pg_temp.sid('customer') and request_key='stage2-request-key'),
    'idempotency creates one service request');
  perform pg_temp.assert_ok(
    (select count(*)=1 from public.operational_events
      where service_request_id=(select v from stage2_results where k='first') and event_type='request.created'),
    'request.created event written once');
  perform pg_temp.assert_ok(
    (select address_id=pg_temp.sid('address') from public.service_requests where id=(select v from stage2_results where k='first')),
    'customer address persisted');
  perform pg_temp.assert_ok(
    (select r.status='created' and c.code='boiler'
      from public.service_requests r
      join public.service_categories c on c.id=r.category_id
      where r.id=(select v from stage2_results where k='first')),
    'normalized category and created status persisted');
  perform pg_temp.assert_ok(
    (select problem_description='Stage2 problem' and pricing_reference='conversation-sha256:test'
      from public.service_requests where id=(select v from stage2_results where k='first')),
    'request details persisted');
  perform pg_temp.assert_ok(
    (select payload->>'issue_title'='Stage2 issue'
      from public.operational_events
      where service_request_id=(select v from stage2_results where k='first') and event_type='request.created'),
    'issue title captured in creation event');
end $$;

do $$ begin
  begin
    perform public.create_service_request(
      pg_temp.sid('other_customer'),'boiler',pg_temp.sid('address'),
      'Bad address','Bad address',null,'stage2-bad-address'
    );
    raise exception 'foreign customer address unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Address does not belong to customer' then raise; end if;
  end;
end $$;

do $$ begin
  perform pg_temp.assert_ok(
    has_function_privilege('service_role','public.create_service_request(uuid,text,uuid,text,text,text,text)','EXECUTE'),
    'service role can execute request RPC');
  perform pg_temp.assert_ok(
    not has_function_privilege('authenticated','public.create_service_request(uuid,text,uuid,text,text,text,text)','EXECUTE'),
    'authenticated cannot execute request RPC directly');
  perform pg_temp.assert_ok(
    not has_function_privilege('anon','public.create_service_request(uuid,text,uuid,text,text,text,text)','EXECUTE'),
    'anon cannot execute request RPC directly');
end $$;

rollback;
