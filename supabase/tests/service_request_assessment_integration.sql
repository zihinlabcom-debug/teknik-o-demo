\set ON_ERROR_STOP on
begin;

do $$ begin
  if current_database()<>'tekniko_operation_test' then
    raise exception 'Refusing assessment test outside disposable local database';
  end if;
end $$;

create temporary table assessment_ids(k text primary key,v uuid not null) on commit drop;
insert into assessment_ids values
 ('customer',gen_random_uuid()),('other',gen_random_uuid()),('address',gen_random_uuid());
create function pg_temp.sid(p_k text) returns uuid language sql stable as $$
  select v from pg_temp.assessment_ids where k=p_k
$$;
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',label; end if; end $$;

insert into auth.users(id) values(pg_temp.sid('customer')),(pg_temp.sid('other'));
insert into public.users(id,name,role,is_active) values
 (pg_temp.sid('customer'),'SNAPSHOT TEST','customer',true),
 (pg_temp.sid('other'),'OTHER TEST','customer',true);
insert into public.customer_profiles(user_id) values(pg_temp.sid('customer')),(pg_temp.sid('other'));
insert into public.cities default values;
insert into public.districts(city_id) select id from public.cities order by id desc limit 1;
insert into public.customer_addresses(id,customer_id,city_id,district_id)
select pg_temp.sid('address'),pg_temp.sid('customer'),c.id,d.id
from public.cities c join public.districts d on d.city_id=c.id
order by c.id desc,d.id desc limit 1;

create temporary table assessment_results(k text primary key,v uuid not null) on commit drop;
insert into assessment_results values
 ('first',public.create_service_request(pg_temp.sid('customer'),'painting',pg_temp.sid('address'),
   'Duvar Boyama','Duvar Boyama; 300 m² hesaplanan duvar alanı.',
   'conversation-sha256:abc','assessment-request-key',
   '{"schemaVersion":1,"category":"painting","serviceType":"wall_painting", "selections":{"netAreaM2":100,"colorCode":"6269"}}'::jsonb)),
 ('second',public.create_service_request(pg_temp.sid('customer'),'painting',pg_temp.sid('address'),
   'Changed','Changed','conversation-sha256:def','assessment-request-key',
   '{"schemaVersion":1,"category":"painting","selections":{"netAreaM2":1}}'::jsonb));

insert into public.service_requests(customer_id,status,category_id,address_id,problem_description,request_key)
select pg_temp.sid('customer'),'created',c.id,pg_temp.sid('address'),'Legacy request','assessment-legacy-key'
from public.service_categories c where c.code='painting';

do $$ declare rid uuid; begin
  select v into rid from assessment_results where k='first';
  perform pg_temp.assert_ok(rid=(select v from assessment_results where k='second'),
    'same request key returns same id');
  perform pg_temp.assert_ok((select count(*)=1 from public.service_requests
    where customer_id=pg_temp.sid('customer') and request_key='assessment-request-key'),
    'one request');
  perform pg_temp.assert_ok((select assessment_snapshot->'selections'->>'colorCode'='6269'
    from public.service_requests where id=rid),'first snapshot is preserved');
  perform pg_temp.assert_ok((select count(*)=1 from public.operational_events
    where service_request_id=rid and event_type='request.created'),'one creation event');
  perform pg_temp.assert_ok((select assessment_snapshot is null from public.service_requests
    where request_key='assessment-legacy-key'),'legacy row remains nullable');
  begin
    update public.service_requests set assessment_snapshot='{"schemaVersion":1,"category":"painting"}'::jsonb
    where id=rid;
    raise exception 'snapshot unexpectedly mutable';
  exception when raise_exception then
    if sqlerrm <> 'Assessment snapshot is immutable' then raise; end if;
  end;
  begin
    perform public.create_service_request(pg_temp.sid('other'),'painting',pg_temp.sid('address'),
      'Wrong owner','Wrong owner',null,'foreign-address-key',
      '{"schemaVersion":1,"category":"painting"}'::jsonb);
    raise exception 'foreign address unexpectedly accepted';
  exception when raise_exception then
    if sqlerrm <> 'Address does not belong to customer' then raise; end if;
  end;
  perform pg_temp.assert_ok(
    has_function_privilege('service_role',
      'public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb)','EXECUTE'),
    'service role can call snapshot RPC');
  perform pg_temp.assert_ok(
    not has_function_privilege('service_role',
      'public.create_service_request(uuid,text,uuid,text,text,text,text)','EXECUTE'),
    'old RPC is disabled');
  perform pg_temp.assert_ok(
    not has_function_privilege('authenticated',
      'public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb)','EXECUTE'),
    'authenticated cannot call snapshot RPC');
end $$;

rollback;
