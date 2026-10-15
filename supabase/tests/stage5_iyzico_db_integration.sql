-- Disposable Stage 5.2 PostgreSQL only. The runner verifies the exact labelled
-- container, network isolation, volume and database name before executing this.
\set ON_ERROR_STOP on

do $$ begin
  if current_database()<>'tekniko_stage10_test' then
    raise exception 'Refusing Stage 5.2 tests outside disposable database';
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
  address_id uuid:='12000000-0000-4000-8000-000000000011';
  seeded jsonb;request_id uuid;intent_id uuid;quote_id uuid;
  claim jsonb;claim_token uuid;result jsonb;unknown_claim jsonb;
  unknown_token uuid;unknown_revision integer;evidence_claim jsonb;evidence_token uuid;
begin
  perform pg_temp.assert_true(
    to_regclass('public.finance_iyzico_operations') is not null,
    'iyzico operation journal must exist');
  perform pg_temp.assert_true(
    exists(select 1 from information_schema.columns
      where table_schema='public' and table_name='finance_runtime_config'
        and column_name='iyzico_sandbox_enabled'),
    'runtime kill switch must exist');
  perform pg_temp.assert_true(
    (select not iyzico_sandbox_enabled from public.finance_runtime_config where id=1),
    'migration must leave iyzico disabled');
  perform pg_temp.assert_true(
    not has_table_privilege('anon','public.finance_iyzico_operations','SELECT')
    and not has_table_privilege('authenticated','public.finance_iyzico_operations','SELECT')
    and not has_table_privilege('service_role','public.finance_iyzico_operations','SELECT'),
    'journal must have no direct API-role access');
  perform pg_temp.assert_true(
    not has_function_privilege('anon',
      'public.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text)',
      'EXECUTE')
    and not has_function_privilege('authenticated',
      'public.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text)',
      'EXECUTE')
    and has_function_privilege('service_role',
      'public.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text)',
      'EXECUTE'),
    'journal RPC must be service-role only');
  perform pg_temp.assert_true(not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='finance_iyzico_operations'
      and column_name~*'(pan|card|cvc|raw|payload|secret)'),
    'journal must not expose card, secret or raw-payload columns');

  perform pg_temp.expect_error(
    $sql$update public.finance_runtime_config set iyzico_sandbox_enabled=true where id=1$sql$,
    'finance_runtime_iyzico_sandbox_guard');

  -- The activation migration is intentionally absent. Seed a pending request
  -- through the existing fake path, then change only its provider inside this
  -- disposable fixture so the new provider journal can be exercised.
  update public.finance_runtime_config
    set gate_mode='test_only',provider='fake',environment='sandbox',
        iyzico_sandbox_enabled=false where id=1;
  select public.create_payment_pending_service_request_v2(
    customer_id,'boiler',address_id,'Stage 5 iyzico local',
    'Disposable provider journal verification','stage5:iyzico-local',
    'stage5-iyzico-local-request-1',
    '{"schemaVersion":"1","category":"boiler"}'::jsonb,
    'immediate',null,'TRY',500,75,575,'{}'::jsonb,
    'pending:stage5-iyzico-local-request-1'
  ) into seeded;
  request_id:=(seeded->>'id')::uuid;
  quote_id:=(seeded->>'quoteId')::uuid;
  intent_id:=(seeded->>'paymentIntentId')::uuid;

  alter table public.finance_payment_intents
    disable trigger finance_payment_intents_guard_update;
  update public.finance_payment_intents
    set provider='iyzico',environment='sandbox'
    where id=intent_id;
  alter table public.finance_payment_intents
    enable trigger finance_payment_intents_guard_update;

  update public.finance_runtime_config
    set gate_mode='test_only',provider='iyzico',environment='sandbox',
        iyzico_sandbox_enabled=true where id=1;

  perform pg_temp.assert_true(
    (public.finance_iyzico_intent_context(intent_id,customer_id)->>'intentId')::uuid=intent_id,
    'test customer must resolve its iyzico intent');
  perform pg_temp.expect_error(format(
    'select public.finance_iyzico_intent_context(%L::uuid,%L::uuid)',
    intent_id,other_customer_id),'not found');

  select public.finance_iyzico_claim_operation(
    intent_id,request_id,customer_id,null,'authorize',
    'stage5:authorize:0001','stage5:business:authorize:0001',
    'stage5:conversation:0001',repeat('a',64),575,'TRY',request_id::text,
    null,null,null
  ) into claim;
  perform pg_temp.assert_true(claim->>'kind'='claimed','first claim must win');
  claim_token:=(claim->>'claimToken')::uuid;

  select public.finance_iyzico_claim_operation(
    intent_id,request_id,customer_id,null,'authorize',
    'stage5:authorize:0001','stage5:business:authorize:0001',
    'stage5:conversation:0001',repeat('a',64),575,'TRY',request_id::text,
    null,null,null
  ) into result;
  perform pg_temp.assert_true(result->>'kind'='existing',
    'same operation retry must be idempotent');

  select public.finance_iyzico_claim_operation(
    intent_id,request_id,customer_id,null,'authorize',
    'stage5:authorize:0001','stage5:business:authorize:0001',
    'stage5:conversation:0001',repeat('b',64),575,'TRY',request_id::text,
    null,null,null
  ) into result;
  perform pg_temp.assert_true(result->>'kind'='conflict'
    and result->>'reason'='operation_id','fingerprint mismatch must conflict');

  perform pg_temp.expect_error(format(
    'select public.finance_iyzico_finalize_operation(%L,%L::uuid,''succeeded'',null,null,null,''PRE_AUTH'',true,false,null)',
    'stage5:authorize:0001','00000000-0000-4000-8000-000000000099'),
    'claim lost');

  select public.finance_iyzico_finalize_operation(
    'stage5:authorize:0001',claim_token,'succeeded','stage5-payment-0001',
    'stage5-payment-transaction-0001','stage5-host-0001','PRE_AUTH',true,false,null
  ) into result;
  perform pg_temp.assert_true(result->>'state'='succeeded',
    'verified PRE_AUTH must finalize authorization');
  select public.finance_apply_iyzico_operation(intent_id,'stage5:authorize:0001') into result;
  perform pg_temp.assert_true(result->>'intentStatus'='authorized'
    and not (result->>'idempotentReplay')::boolean,
    'verified authorization must update finance core once');
  select public.finance_apply_iyzico_operation(intent_id,'stage5:authorize:0001') into result;
  perform pg_temp.assert_true((result->>'idempotentReplay')::boolean,
    'core application retry must reuse transaction');
  perform pg_temp.assert_true((select count(*)=1 from public.finance_transactions t
    where t.intent_id=intent_id and t.idempotency_key='iyzico:stage5:authorize:0001'),
    'authorization application must create one transaction');
  select public.finance_release_iyzico_sandbox_request(
    request_id,'stage5:authorize:0001') into result;
  perform pg_temp.assert_true((result->>'distributionStarted')::boolean,
    'distribution must start only after verified authorization');

  select public.finance_iyzico_claim_operation(
    intent_id,request_id,customer_id,null,'authorize',
    'stage5:authorize:unknown','stage5:business:authorize:unknown',
    'stage5:conversation:unknown',repeat('c',64),575,'TRY',request_id::text,
    null,null,null
  ) into unknown_claim;
  unknown_token:=(unknown_claim->>'claimToken')::uuid;
  select public.finance_iyzico_finalize_operation(
    'stage5:authorize:unknown',unknown_token,'unknown',null,null,null,null,
    false,false,'transport_timeout'
  ) into result;
  unknown_revision:=(result->>'revision')::integer;
  perform pg_temp.expect_error(format(
    'select public.finance_apply_iyzico_operation(%L::uuid,%L)',
    intent_id,'stage5:authorize:unknown'),'verified terminal');

  select public.finance_iyzico_claim_operation(
    intent_id,request_id,customer_id,null,'retrieve',
    'stage5:retrieve:evidence','stage5:business:retrieve:evidence',
    'stage5:conversation:evidence',repeat('d',64),575,'TRY',request_id::text,
    'stage5-payment-0001',null,'stage5:conversation:unknown'
  ) into evidence_claim;
  evidence_token:=(evidence_claim->>'claimToken')::uuid;
  perform public.finance_iyzico_finalize_operation(
    'stage5:retrieve:evidence',evidence_token,'succeeded','stage5-payment-0001',
    null,'stage5-host-evidence','PRE_AUTH',true,false,null);
  insert into public.finance_reconciliation_issues(
    service_request_id,intent_id,code,status,detail
  ) values
    (request_id,intent_id,'iyzico_authorize_unknown','open','{"source":"runtime_test"}'::jsonb),
    (request_id,intent_id,'iyzico_distribution_release_failed','open','{"source":"runtime_test"}'::jsonb);

  select public.finance_iyzico_resolve_unknown(
    'stage5:authorize:unknown',unknown_revision,'stage5:retrieve:evidence','succeeded'
  ) into result;
  perform pg_temp.assert_true(result->>'state'='succeeded'
    and result->>'resolutionEvidenceOperationId'='stage5:retrieve:evidence',
    'unknown authorization must require signed retrieve evidence');
  perform pg_temp.assert_true(exists(
    select 1 from public.finance_reconciliation_issues as issue
    where issue.intent_id=intent_id and issue.code='iyzico_authorize_unknown'
      and issue.status='resolved' and issue.resolved_at is not null),
    'signed retrieve resolution must close the matching unknown issue');
  perform pg_temp.assert_true(exists(
    select 1 from public.finance_reconciliation_issues as issue
    where issue.intent_id=intent_id and issue.code='iyzico_distribution_release_failed'
      and issue.status='open' and issue.resolved_at is null),
    'retrieve resolution must preserve unrelated reconciliation issues');
  perform pg_temp.expect_error(format(
    'select public.finance_iyzico_resolve_unknown(%L,%s,%L,%L)',
    'stage5:authorize:unknown',unknown_revision,
    'stage5:retrieve:evidence','succeeded'),'conflict');

  -- Restore fake mode and prove the existing path still works after the draft.
  update public.finance_runtime_config
    set iyzico_sandbox_enabled=false,gate_mode='test_only',provider='fake',
        environment='sandbox' where id=1;
  select public.create_payment_pending_service_request_v2(
    customer_id,'boiler',address_id,'Stage 5 fake regression',
    'Fake path after iyzico draft','stage5:fake-regression',
    'stage5-fake-regression-request-1',
    '{"schemaVersion":"1","category":"boiler"}'::jsonb,
    'immediate',null,'TRY',100,15,115,'{}'::jsonb,
    'pending:stage5-fake-regression-request-1'
  ) into seeded;
  perform public.finance_fake_authorize(
    (seeded->>'paymentIntentId')::uuid,'approve:stage5-fake-regression',true);
  select public.finance_release_fake_sandbox_request((seeded->>'id')::uuid) into result;
  perform pg_temp.assert_true((result->>'distributionStarted')::boolean,
    'fake distribution must remain functional after iyzico draft');
end
$$;

select 'STAGE 5 IYZICO DATABASE INTEGRATION: PASS' as result;
