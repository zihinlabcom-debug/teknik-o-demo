-- Disposable PostgreSQL only. Never run against a linked Supabase project.
\set ON_ERROR_STOP on
do $$ begin
  if current_database()<>'tekniko_stage10_test' then
    raise exception 'Refusing Stage 12 finance tests outside disposable database';
  end if;
end $$;

create or replace function pg_temp.assert_true(value boolean,message text)
returns void language plpgsql as $$
begin
  if value is distinct from true then raise exception 'ASSERT: %',message; end if;
end $$;

create or replace function pg_temp.expect_error(statement text,pattern text)
returns void language plpgsql as $$
declare failed boolean:=false;detail text;
begin
  begin execute statement;
  exception when others then failed:=true;detail:=sqlerrm; end;
  if not failed then raise exception 'ASSERT: expected failure for %',statement; end if;
  if detail !~* pattern then
    raise exception 'ASSERT: wrong failure %, expected %',detail,pattern;
  end if;
end $$;

do $$
#variable_conflict use_variable
declare
  customer_id uuid:='12000000-0000-4000-8000-000000000001';
  other_customer_id uuid:='12000000-0000-4000-8000-000000000002';
  technician_id uuid:='12000000-0000-4000-8000-000000000003';
  address_id uuid:='12000000-0000-4000-8000-000000000011';
  other_address_id uuid:='12000000-0000-4000-8000-000000000012';
  city_id bigint;district_id bigint;category_id uuid;
  result jsonb;request_id uuid;quote_id uuid;intent_id uuid;dispatch_id uuid;job_id uuid;
  second jsonb;second_request uuid;second_intent uuid;
  third jsonb;third_request uuid;third_intent uuid;
  refund jsonb;snapshot jsonb;
begin
  update public.finance_runtime_config
  set gate_mode='test_only',provider='fake',environment='sandbox'
  where id=1;

  insert into auth.users(id,phone,phone_confirmed_at) values
    (customer_id,'+905551200001',now()),
    (other_customer_id,'+905551200002',now()),
    (technician_id,'+905551200003',now());
  insert into public.users(id,name,role,is_active,is_test) values
    (customer_id,'STAGE12 TEST CUSTOMER','customer',true,true),
    (other_customer_id,'STAGE12 OTHER CUSTOMER','customer',true,true),
    (technician_id,'STAGE12 TEST TECHNICIAN','technician',true,true);
  insert into public.customer_profiles(user_id) values(customer_id),(other_customer_id);
  select c.id into city_id from public.cities c order by c.id limit 1;
  select d.id into district_id from public.districts d where d.city_id=city_id order by d.id limit 1;
  select c.id into category_id from public.service_categories c where c.code='boiler';
  insert into public.customer_addresses(
    id,customer_id,label,city,district,address_line,city_id,district_id,
    is_default,profile_slot,profile_archived_at
  ) values
    (address_id,customer_id,'Adres 1','Test','Test','Stage 12 test address',city_id,district_id,true,1,null),
    (other_address_id,other_customer_id,'Adres 1','Test','Test','Other test address',city_id,district_id,true,1,null);
  insert into public.technician_profiles(user_id,approval_status,is_available)
    values(technician_id,'approved',true)
    on conflict(user_id) do update set
      approval_status=excluded.approval_status,is_available=excluded.is_available;
  insert into public.technician_service_categories(technician_id,category_id,approval_status)
    values(technician_id,category_id,'approved');
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    values(technician_id,city_id,null);

  perform pg_temp.assert_true(
    not has_table_privilege('anon','public.finance_payment_intents','SELECT')
    and not has_table_privilege('authenticated','public.finance_payment_intents','SELECT'),
    'finance intents must be server-only');
  perform pg_temp.assert_true(
    not has_table_privilege('authenticated','public.finance_transactions','INSERT')
    and not has_table_privilege('authenticated','public.finance_ledger_entries','SELECT'),
    'authenticated finance audit access must be closed');
  perform pg_temp.assert_true(
    has_table_privilege('service_role','public.finance_payment_intents','SELECT')
    and not has_table_privilege('service_role','public.finance_payment_intents','INSERT')
    and not has_table_privilege('service_role','public.finance_payment_intents','UPDATE')
    and not has_table_privilege('service_role','public.finance_transactions','INSERT'),
    'service role must read finance tables but mutate only through RPCs');
  perform pg_temp.assert_true(
    not has_function_privilege('authenticated',
      'public.finance_fake_authorize(uuid,text,boolean)','EXECUTE')
    and has_function_privilege('service_role',
      'public.finance_fake_authorize(uuid,text,boolean)','EXECUTE'),
    'fake authorization must be service-role only');

  -- The legacy priced RPC must roll back when the database gate is enabled.
  perform pg_temp.expect_error(format($sql$
    select public.create_priced_service_request(
      %L::uuid,'boiler',%L::uuid,'Legacy bypass','Legacy bypass',
      'stage12:legacy','stage12-legacy-request',
      '{"schemaVersion":"1","category":"boiler"}'::jsonb,
      'TRY',100,15,115,'{}'::jsonb,'immediate',null)
  $sql$,customer_id,address_id),'Payment authorization required');
  perform pg_temp.assert_true(not exists(
    select 1 from public.service_requests r
    where r.customer_id=customer_id and r.request_key='stage12-legacy-request'),
    'legacy bypass must roll back the request and quote');

  select public.create_payment_pending_service_request_v2(
    customer_id,'boiler',address_id,'Finance test','Finance test request',
    'stage12:finance','stage12-finance-request-1',
    '{"schemaVersion":"1","category":"boiler"}'::jsonb,
    'immediate',null,'TRY',100,15,115,'{}'::jsonb,
    'pending:stage12-finance-request-1'
  ) into result;
  request_id:=(result->>'id')::uuid;
  quote_id:=(result->>'quoteId')::uuid;
  intent_id:=(result->>'paymentIntentId')::uuid;
  select r.category_id into category_id
  from public.service_requests r where r.id=request_id;
  update public.technician_service_categories c
  set approval_status='approved'
  where c.technician_id=technician_id and c.category_id=category_id;
  if not found then
    insert into public.technician_service_categories(
      technician_id,category_id,approval_status
    ) values(technician_id,category_id,'approved');
  end if;
  perform pg_temp.assert_true(result->>'paymentStatus'='pending_authorization',
    'new request must wait for authorization');
  perform pg_temp.assert_true(not exists(select 1 from public.service_distribution_cycles c
    where c.service_request_id=request_id),'pending request must not distribute');

  select public.create_payment_pending_service_request_v2(
    customer_id,'boiler',address_id,'Finance test','Finance test request',
    'stage12:finance','stage12-finance-request-1',
    '{"schemaVersion":"1","category":"boiler"}'::jsonb,
    'immediate',null,'TRY',100,15,115,'{}'::jsonb,
    'pending:stage12-finance-request-1'
  ) into result;
  perform pg_temp.assert_true((result->>'id')::uuid=request_id
    and (result->>'paymentIntentId')::uuid=intent_id,
    'payment-pending retry must reuse request and intent');
  perform pg_temp.assert_true((select count(*)=1 from public.finance_payment_intents i
    where i.service_request_id=request_id),'one intent per request');

  perform pg_temp.expect_error(format($sql$
    select public.create_payment_pending_service_request_v2(
      %L::uuid,'boiler',%L::uuid,'Finance test','Finance test request',
      'stage12:finance','stage12-finance-request-1',
      '{"schemaVersion":"1","category":"boiler"}'::jsonb,
      'immediate',null,'TRY',100,15,115,'{}'::jsonb,'pending:different-key')
  $sql$,customer_id,address_id),'Existing payment intent mismatch');

  perform pg_temp.expect_error(format(
    'select public.start_service_distribution_cycle(%L::uuid,%L::uuid,null)',
    request_id,quote_id),'Payment authorization required');

  select public.finance_fake_authorize(intent_id,'decline:stage12-1',false)
    into result;
  perform pg_temp.assert_true(result->>'currentIntentStatus'='authorization_failed',
    'decline must persist failure');
  perform pg_temp.assert_true(not exists(select 1 from public.service_distribution_cycles c
    where c.service_request_id=request_id),'decline must not distribute');
  select public.finance_fake_authorize(intent_id,'decline:stage12-1',false)
    into result;
  perform pg_temp.assert_true((result->>'idempotentReplay')::boolean,
    'decline retry must be idempotent');
  perform pg_temp.assert_true((select count(*)=1 from public.finance_transactions t
    where t.intent_id=intent_id and t.operation='authorize'
      and t.idempotency_key='decline:stage12-1'),'decline retry must not duplicate audit');

  select public.finance_fake_authorize(intent_id,'approve:stage12-1',true)
    into result;
  perform pg_temp.assert_true(result->>'currentIntentStatus'='authorized',
    'retry approval must authorize');
  select public.finance_fake_authorize(intent_id,'decline:stage12-1',false)
    into result;
  perform pg_temp.assert_true(result->>'currentIntentStatus'='authorized',
    'old decline replay must not downgrade current authorization');

  select public.finance_release_fake_sandbox_request(request_id) into result;
  perform pg_temp.assert_true((result->>'distributionStarted')::boolean,
    'authorized request must release distribution');
  select public.finance_release_fake_sandbox_request(request_id) into second;
  perform pg_temp.assert_true(result->>'distributionCycleId'=second->>'distributionCycleId',
    'release retry must reuse initial cycle');
  perform pg_temp.assert_true((select count(*)=1 from public.service_distribution_cycles c
    where c.service_request_id=request_id and c.source_job_id is null),
    'one initial cycle after retries');

  select d.id into dispatch_id
  from public.service_dispatches d
  where d.service_request_id=request_id and d.status='broadcasting'
  order by d.created_at desc
  limit 1;
  perform pg_temp.assert_true(dispatch_id is not null,
    'released request must have a broadcasting dispatch');
  insert into public.service_dispatch_candidates(
    dispatch_id,technician_id,status,offered_at
  )
  select dispatch_id,technician_id,'offered',now()
  where not exists(
    select 1 from public.service_dispatch_candidates c
    where c.dispatch_id=dispatch_id and c.technician_id=technician_id
  );
  job_id:=public.accept_service_dispatch(
    dispatch_id,technician_id,'stage12:accept:request-1');
  perform public.complete_service_job(job_id,technician_id);
  perform pg_temp.assert_true((select status='captured' and captured_amount=amount
    from public.finance_payment_intents where id=intent_id),
    'job completion must capture exactly the authorized amount');
  perform public.complete_service_job(job_id,technician_id);
  perform pg_temp.assert_true((select count(*)=1 from public.finance_transactions t
    where t.intent_id=intent_id and t.operation='capture' and t.status='succeeded'),
    'completion retry must not duplicate capture');
  perform pg_temp.assert_true(not exists(
    select 1 from public.finance_ledger_entries l where l.intent_id=intent_id
    group by l.transaction_id having
      coalesce(sum(l.amount) filter(where l.direction='debit'),0)<>
      coalesce(sum(l.amount) filter(where l.direction='credit'),0)),
    'capture ledger must balance');

  select public.finance_fake_refund(intent_id,'refund:stage12-1',40,'partial test refund')
    into refund;
  perform pg_temp.assert_true(refund->>'status'='partially_refunded',
    'partial refund status');
  select public.finance_fake_refund(intent_id,'refund:stage12-1',40,'partial test refund')
    into refund;
  perform pg_temp.assert_true((refund->>'idempotentReplay')::boolean,
    'refund retry must be idempotent');
  select public.finance_fake_refund(intent_id,'refund:stage12-2',75,'remaining test refund')
    into refund;
  perform pg_temp.assert_true(refund->>'status'='refunded',
    'full refund status');
  perform pg_temp.expect_error(format(
    'select public.finance_fake_refund(%L::uuid,''refund:stage12-3'',1,''excess refund'')',
    intent_id),'Refund exceeds captured balance');
  perform pg_temp.assert_true(not exists(
    select 1 from public.finance_ledger_entries l where l.intent_id=intent_id
    group by l.transaction_id having
      coalesce(sum(l.amount) filter(where l.direction='debit'),0)<>
      coalesce(sum(l.amount) filter(where l.direction='credit'),0)),
    'refund ledgers must balance');

  -- Authorized, undistributed request cancellation voids the hold.
  select public.create_payment_pending_service_request_v2(
    customer_id,'boiler',address_id,'Void test','Void request','stage12:void',
    'stage12-finance-request-2','{"schemaVersion":"1","category":"boiler"}'::jsonb,
    'immediate',null,'TRY',200,30,230,'{}'::jsonb,
    'pending:stage12-finance-request-2'
  ) into second;
  second_request:=(second->>'id')::uuid;second_intent:=(second->>'paymentIntentId')::uuid;
  perform public.finance_fake_authorize(second_intent,'approve:stage12-2',true);
  update public.service_requests set status='cancelled' where id=second_request;
  perform pg_temp.assert_true((select status='voided' from public.finance_payment_intents
    where id=second_intent),'terminal cancellation must void authorization');

  -- A declined pending request can be cancelled without a financial movement.
  select public.create_payment_pending_service_request_v2(
    customer_id,'boiler',address_id,'Cancel test','Cancel request','stage12:cancel',
    'stage12-finance-request-3','{"schemaVersion":"1","category":"boiler"}'::jsonb,
    'immediate',null,'TRY',300,45,345,'{}'::jsonb,
    'pending:stage12-finance-request-3'
  ) into third;
  third_request:=(third->>'id')::uuid;third_intent:=(third->>'paymentIntentId')::uuid;
  perform public.finance_fake_authorize(third_intent,'decline:stage12-3',false);
  update public.service_requests set status='cancelled' where id=third_request;
  perform pg_temp.assert_true((select status='cancelled' from public.finance_payment_intents
    where id=third_intent),'failed authorization cancellation must close the intent');

  select public.finance_reconciliation_snapshot(request_id) into snapshot;
  perform pg_temp.assert_true(snapshot->>'intentStatus'='refunded'
    and (snapshot->>'ledgerDebit')::numeric=(snapshot->>'ledgerCredit')::numeric,
    'reconciliation snapshot must expose balanced final state');

  perform pg_temp.expect_error(format(
    'update public.finance_transactions set error_code=''tamper'' where intent_id=%L::uuid',
    intent_id),'append only');
end
$$;

select 'STAGE 12 FINANCE INTEGRATION: PASS' as result;
