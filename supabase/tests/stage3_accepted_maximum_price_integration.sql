-- Run only on the disposable local operation database; every assertion rolls back.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database()<>'tekniko_operation_test' then
    raise exception 'Refusing Stage 3 test outside disposable local database';
  end if;
end $$;

create temporary table stage3_ids(k text primary key,v uuid not null) on commit drop;
insert into stage3_ids values
  ('customer',gen_random_uuid()),('address',gen_random_uuid());
create function pg_temp.sid(p_k text) returns uuid language sql stable security definer set search_path='' as $$
  select v from pg_temp.stage3_ids where k=p_k
$$;
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',label; end if; end $$;

insert into auth.users(id) values(pg_temp.sid('customer'));
insert into public.users(id,name,role,is_active)
  values(pg_temp.sid('customer'),'STAGE 3 TEST','customer',true);
insert into public.customer_profiles(user_id) values(pg_temp.sid('customer'));
insert into public.cities default values;
insert into public.districts(city_id)
  select id from public.cities order by id desc limit 1;
insert into public.customer_addresses(id,customer_id,city_id,district_id)
  select pg_temp.sid('address'),pg_temp.sid('customer'),c.id,d.id
  from public.cities c join public.districts d on d.city_id=c.id
  order by c.id desc,d.id desc limit 1;

select pg_temp.assert_ok(
  has_function_privilege('service_role',
    'public.create_priced_service_request(uuid,text,uuid,text,text,text,text,jsonb,text,numeric,numeric,numeric,jsonb)',
    'EXECUTE'), 'service role can create priced request');
select pg_temp.assert_ok(
  not has_function_privilege('authenticated',
    'public.create_priced_service_request(uuid,text,uuid,text,text,text,text,jsonb,text,numeric,numeric,numeric,jsonb)',
    'EXECUTE'), 'authenticated cannot create priced request');
select pg_temp.assert_ok(
  not has_function_privilege('anon',
    'public.create_priced_service_request(uuid,text,uuid,text,text,text,text,jsonb,text,numeric,numeric,numeric,jsonb)',
    'EXECUTE'), 'anon cannot create priced request');

create temporary table stage3_results(k text primary key,v jsonb not null) on commit drop;
grant insert on stage3_results to service_role;
set role service_role;
insert into pg_temp.stage3_results values ('first',public.create_priced_service_request(
  pg_temp.sid('customer'),'painting',pg_temp.sid('address'),
  'Duvar Boyama','Duvar Boyama; 20 m².',
  'conversation-sha256:stage3','stage3-priced-request',
  '{"schemaVersion":1,"category":"painting","selections":{"netAreaM2":20}}'::jsonb,
  'TRY',1150,150,1300,'{"source":"painting_quote","finalPrice":1300,"serviceFee":150}'::jsonb));
insert into pg_temp.stage3_results values ('retry',public.create_priced_service_request(
  pg_temp.sid('customer'),'painting',pg_temp.sid('address'),
  'Duvar Boyama','Duvar Boyama; 20 m².',
  'conversation-sha256:stage3','stage3-priced-request',
  '{"schemaVersion":1,"category":"painting","selections":{"netAreaM2":20}}'::jsonb,
  'TRY',1150,150,1300,'{"source":"painting_quote","finalPrice":1300,"serviceFee":150}'::jsonb));
reset role;

select pg_temp.assert_ok((select v from pg_temp.stage3_results where k='first')=
  (select v from pg_temp.stage3_results where k='retry'),
  'retry returns the same request and accepted quote');
select pg_temp.assert_ok((select count(*)=1 from public.service_requests
  where request_key='stage3-priced-request'),'one request after retry');
select pg_temp.assert_ok((select count(*)=1 from public.service_quotes q
  join public.service_requests r on r.id=q.service_request_id
  where r.request_key='stage3-priced-request' and q.version=1 and q.status='accepted'
    and q.accepted_at is not null and q.currency='TRY' and q.subtotal=1150
    and q.service_fee=150 and q.total_amount=1300
    and q.breakdown->>'source'='painting_quote'),'one immutable accepted quote');
select pg_temp.assert_ok((select count(*)=1 from public.operational_events e
  join public.service_requests r on r.id=e.service_request_id
  where r.request_key='stage3-priced-request' and e.event_type='request.created'),
  'one request.created event');
select pg_temp.assert_ok((select count(*)=1 from public.operational_events e
  join public.service_requests r on r.id=e.service_request_id
  where r.request_key='stage3-priced-request' and e.event_type='quote.accepted'),
  'one quote.accepted event');

do $$ declare qid uuid; begin
  select q.id into qid from public.service_quotes q
  join public.service_requests r on r.id=q.service_request_id
  where r.request_key='stage3-priced-request';
  begin
    update public.service_quotes set total_amount=1 where id=qid;
    raise exception 'accepted update unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm<>'Accepted price snapshot cannot be changed' then raise; end if;
  end;
  begin
    delete from public.service_quotes where id=qid;
    raise exception 'accepted delete unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm<>'Accepted price snapshot cannot be deleted' then raise; end if;
  end;
end $$;

-- A failed quote acceptance must undo the request and request.created event.
create function pg_temp.reject_stage3_accept() returns trigger language plpgsql as $$
begin
  if new.event_type='quote.accepted' then raise exception 'test quote acceptance failure'; end if;
  return new;
end $$;
create trigger stage3_reject_accept before insert on public.operational_events
for each row execute function pg_temp.reject_stage3_accept();
do $$ begin
  begin
    perform public.create_priced_service_request(
      pg_temp.sid('customer'),'painting',pg_temp.sid('address'),
      'Duvar Boyama','Test','conversation-sha256:failed','stage3-failed-request',
      '{"schemaVersion":1,"category":"painting"}'::jsonb,
      'TRY',90,10,100,'{"source":"painting_quote"}'::jsonb);
    raise exception 'failed acceptance unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm<>'test quote acceptance failure' then raise; end if;
  end;
end $$;
drop trigger stage3_reject_accept on public.operational_events;
select pg_temp.assert_ok(not exists(select 1 from public.service_requests
  where request_key='stage3-failed-request'),'failed quote rolls back request');

-- Manual assessment keeps the existing request-only path.
select public.create_service_request(
  pg_temp.sid('customer'),'painting',pg_temp.sid('address'),
  'Duvar Boyama','Yerinde inceleme','conversation-sha256:manual','stage3-manual-request',
  '{"schemaVersion":1,"category":"painting","selections":{"repairStatus":"serious_plaster_damage"}}'::jsonb);
select pg_temp.assert_ok((select count(*)=0 from public.service_quotes q
  join public.service_requests r on r.id=q.service_request_id
  where r.request_key='stage3-manual-request'),'manual request has no accepted quote');

rollback;
