-- Creates one legacy resolved authorization whose unknown reconciliation issue
-- is intentionally left open by the pre-fix function.
\set ON_ERROR_STOP on

do $$
#variable_conflict use_variable
declare
  customer_id uuid:='12000000-0000-4000-8000-000000000001';
  address_id uuid:='12000000-0000-4000-8000-000000000011';
  seeded jsonb;request_id uuid;intent_id uuid;claim jsonb;token uuid;
  unknown_revision integer;result jsonb;evidence jsonb;evidence_token uuid;
begin
  update public.finance_runtime_config
  set gate_mode='test_only',provider='fake',environment='sandbox',
      iyzico_sandbox_enabled=false where id=1;

  select public.create_payment_pending_service_request_v2(
    customer_id,'boiler',address_id,'Stage 5 reconciliation upgrade',
    'Disposable migration upgrade verification','stage5:iyzico-reconciliation-upgrade',
    'stage5-iyzico-reconciliation-upgrade-request-1',
    '{"schemaVersion":"1","category":"boiler"}'::jsonb,
    'immediate',null,'TRY',700,105,805,'{}'::jsonb,
    'pending:stage5-iyzico-reconciliation-upgrade-request-1'
  ) into seeded;
  request_id:=(seeded->>'id')::uuid;
  intent_id:=(seeded->>'paymentIntentId')::uuid;

  alter table public.finance_payment_intents disable trigger finance_payment_intents_guard_update;
  update public.finance_payment_intents set provider='iyzico',environment='sandbox'
  where id=intent_id;
  alter table public.finance_payment_intents enable trigger finance_payment_intents_guard_update;

  update public.finance_runtime_config
  set gate_mode='test_only',provider='iyzico',environment='sandbox',
      iyzico_sandbox_enabled=true where id=1;

  select public.finance_iyzico_claim_operation(
    intent_id,request_id,customer_id,null,'authorize',
    'stage5:upgrade:authorize','stage5:upgrade:business:authorize',
    'stage5:upgrade:conversation:authorize',repeat('e',64),805,'TRY',request_id::text,
    null,null,null
  ) into claim;
  token:=(claim->>'claimToken')::uuid;
  select public.finance_iyzico_finalize_operation(
    'stage5:upgrade:authorize',token,'unknown',null,null,null,null,false,false,
    'transport_timeout'
  ) into result;
  unknown_revision:=(result->>'revision')::integer;

  insert into public.finance_reconciliation_issues(
    service_request_id,intent_id,code,status,detail
  ) values
    (request_id,intent_id,'iyzico_authorize_unknown','open','{"source":"upgrade_test"}'::jsonb),
    (request_id,intent_id,'iyzico_distribution_release_failed','open','{"source":"upgrade_test"}'::jsonb);

  select public.finance_iyzico_claim_operation(
    intent_id,request_id,customer_id,null,'retrieve',
    'stage5:upgrade:retrieve','stage5:upgrade:business:retrieve',
    'stage5:upgrade:conversation:retrieve',repeat('f',64),805,'TRY',request_id::text,
    'stage5-upgrade-payment',null,'stage5:upgrade:conversation:authorize'
  ) into evidence;
  evidence_token:=(evidence->>'claimToken')::uuid;
  perform public.finance_iyzico_finalize_operation(
    'stage5:upgrade:retrieve',evidence_token,'succeeded','stage5-upgrade-payment',
    null,'stage5-upgrade-host','PRE_AUTH',true,false,null);
  perform public.finance_iyzico_resolve_unknown(
    'stage5:upgrade:authorize',unknown_revision,'stage5:upgrade:retrieve','succeeded');

  if not exists(select 1 from public.finance_reconciliation_issues as issue
      where issue.intent_id=intent_id and issue.code='iyzico_authorize_unknown' and issue.status='open') then
    raise exception 'Pre-fix unknown issue unexpectedly closed';
  end if;

  update public.finance_runtime_config
  set iyzico_sandbox_enabled=false,gate_mode='disabled',provider='fake',environment='sandbox'
  where id=1;
end
$$;