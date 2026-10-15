-- Stage 12 iyzico lifecycle activation bridge.
-- This migration preserves fake finance, leaves runtime switches unchanged, and
-- only adds provider-aware service lifecycle behavior.
begin;

do $$
begin
  if to_regclass('public.finance_payment_intents') is null
     or to_regclass('public.finance_iyzico_operations') is null
     or to_regprocedure('public.finance_iyzico_integration_status()') is null
     or to_regprocedure('public.finance_apply_iyzico_operation(uuid,text)') is null
     or to_regprocedure('public.finance_release_iyzico_sandbox_request(uuid,text)') is null
     or to_regprocedure('public.create_payment_pending_service_request_v2(uuid,text,uuid,text,text,text,text,jsonb,text,date,text,numeric,numeric,numeric,jsonb,text)') is null then
    raise exception 'Stage 12 iyzico activation prerequisites are missing';
  end if;
end
$$;
create or replace function public.create_iyzico_payment_pending_service_request_v3(
  p_customer_id uuid,
  p_category_code text,
  p_address_id uuid,
  p_issue_title text,
  p_problem_description text,
  p_pricing_reference text,
  p_request_key text,
  p_assessment_snapshot jsonb,
  p_requested_service_mode text,
  p_requested_service_date date,
  p_currency text,
  p_subtotal numeric,
  p_service_fee numeric,
  p_total_amount numeric,
  p_breakdown jsonb,
  p_payment_idempotency_key text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_request public.service_requests%rowtype;
  v_quote public.service_quotes%rowtype;
  v_intent public.finance_payment_intents%rowtype;
  v_config public.finance_runtime_config%rowtype;
begin
  select * into v_config from public.finance_runtime_config where id=1;
  if not found or v_config.gate_mode<>'test_only' or v_config.provider<>'iyzico'
     or not v_config.iyzico_sandbox_enabled
     or v_config.environment<>'sandbox'
     or not public.finance_gate_required_for_customer(p_customer_id) then
    raise exception 'Iyzico Sandbox finance gate is disabled';
  end if;
  if not exists(select 1 from public.users
    where id=p_customer_id and role='customer' and is_active and is_test) then
    raise exception 'Active test customer required';
  end if;
  if p_currency is distinct from 'TRY' or p_total_amount is null or p_total_amount<=0
     or p_subtotal is null or p_subtotal<0 or p_service_fee is null or p_service_fee<0
     or p_subtotal+p_service_fee<>p_total_amount
     or p_total_amount::text in ('NaN','Infinity','-Infinity')
     or p_subtotal::text in ('NaN','Infinity','-Infinity')
     or p_service_fee::text in ('NaN','Infinity','-Infinity')
     or p_breakdown is null or jsonb_typeof(p_breakdown)<>'object'
     or octet_length(p_breakdown::text)>16384
     or p_payment_idempotency_key is null
     or length(p_payment_idempotency_key) not between 8 and 128
     or p_payment_idempotency_key<>btrim(p_payment_idempotency_key) then
    raise exception 'Invalid payment-pending request';
  end if;

  v_request.id:=public.create_service_request(
    p_customer_id,p_category_code,p_address_id,p_issue_title,p_problem_description,
    p_pricing_reference,p_request_key,p_assessment_snapshot,
    p_requested_service_mode,p_requested_service_date);

  select * into v_request from public.service_requests
  where id=v_request.id for update;
  if v_request.customer_id is distinct from p_customer_id
     or v_request.assessment_snapshot is distinct from p_assessment_snapshot then
    raise exception 'Existing request assessment mismatch';
  end if;
  if exists(select 1 from public.service_distribution_cycles
       where service_request_id=v_request.id)
     or exists(select 1 from public.service_dispatches
       where service_request_id=v_request.id)
     or exists(select 1 from public.service_jobs
       where service_request_id=v_request.id) then
    raise exception 'Existing request already entered distribution';
  end if;
  if not v_request.finance_gate_required then
    update public.service_requests set finance_gate_required=true where id=v_request.id;
  end if;

  select * into v_quote from public.service_quotes
  where service_request_id=v_request.id and status='accepted'
  order by version desc limit 1;
  if found then
    if v_quote.currency<>p_currency or v_quote.subtotal<>p_subtotal
       or v_quote.service_fee<>p_service_fee or v_quote.total_amount<>p_total_amount
       or v_quote.breakdown is distinct from p_breakdown then
      raise exception 'Existing accepted price mismatch';
    end if;
  else
    if exists(select 1 from public.service_quotes where service_request_id=v_request.id) then
      raise exception 'Existing quote requires review';
    end if;
    insert into public.service_quotes(
      service_request_id,version,status,currency,subtotal,service_fee,total_amount,
      breakdown,offered_at
    ) values(
      v_request.id,1,'offered',p_currency,p_subtotal,p_service_fee,p_total_amount,
      p_breakdown,now()
    ) returning * into v_quote;
    perform public.accept_service_quote(v_quote.id,p_customer_id);
    select * into v_quote from public.service_quotes where id=v_quote.id;
  end if;

  select * into v_intent from public.finance_payment_intents
  where service_request_id=v_request.id and purpose='initial' for update;
  if found then
    if v_intent.quote_id is distinct from v_quote.id
       or v_intent.customer_id is distinct from p_customer_id
       or v_intent.provider<>'iyzico' or v_intent.environment<>'sandbox'
       or v_intent.currency<>p_currency or v_intent.amount<>p_total_amount
       or v_intent.creation_idempotency_key<>p_payment_idempotency_key then
      raise exception 'Existing payment intent mismatch';
    end if;
  else
    insert into public.finance_payment_intents(
      service_request_id,quote_id,customer_id,provider,environment,purpose,status,
      currency,amount,creation_idempotency_key
    ) values(
      v_request.id,v_quote.id,p_customer_id,'iyzico','sandbox','initial',
      'pending_authorization',p_currency,p_total_amount,p_payment_idempotency_key
    ) returning * into v_intent;
    insert into public.operational_events(
      service_request_id,actor_user_id,event_type,entity_type,entity_id,payload
    ) values(
      v_request.id,p_customer_id,'finance.payment_pending','finance_payment_intent',
      v_intent.id,jsonb_build_object('provider','iyzico','environment','sandbox',
        'currency',v_intent.currency,'amount',v_intent.amount)
    );
  end if;

  return jsonb_build_object(
    'id',v_request.id,'quoteId',v_quote.id,'totalAmount',v_quote.total_amount,
    'currency',v_quote.currency,'paymentIntentId',v_intent.id,
    'paymentStatus',v_intent.status,'paymentProvider','iyzico','distributionStarted',false
  );
end
$$;
create or replace function public.finance_capture_completed_job(
  p_job_id uuid,p_request_id uuid,p_quote_id uuid
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_intent public.finance_payment_intents%rowtype;
  v_transaction public.finance_transactions%rowtype;
  v_config public.finance_runtime_config%rowtype;
  v_key text;
begin
  perform 1 from public.service_requests where id=p_request_id for update;
  if not coalesce(public.finance_request_gate_required(p_request_id),false) then
    return null;
  end if;
  select * into v_intent from public.finance_payment_intents
  where service_request_id=p_request_id and quote_id=p_quote_id and purpose='initial'
  for update;
  if not found or v_intent.environment<>'sandbox' then
    raise exception 'Finance intent required before completion';
  end if;

  if v_intent.provider='iyzico' then
    select * into v_config from public.finance_runtime_config where id=1;
    if not found or not v_config.iyzico_sandbox_enabled
       or v_config.gate_mode<>'test_only' or v_config.provider<>'iyzico'
       or v_config.environment<>'sandbox' then
      raise exception 'Iyzico Sandbox integration is disabled';
    end if;
    if v_intent.status<>'authorized' or v_intent.authorized_amount<>v_intent.amount then
      raise exception 'Authorized iyzico payment required before completion';
    end if;
    -- External PostAuth runs server-side after complete_service_job commits.
    -- The application uses a deterministic operation id and durable CAS journal.
    return null;
  end if;

  if v_intent.provider<>'fake' then
    raise exception 'Unsupported finance provider before completion';
  end if;
  v_key:='capture:'||p_job_id::text;
  select * into v_transaction from public.finance_transactions
  where intent_id=v_intent.id and operation='capture' and idempotency_key=v_key;
  if found then return v_transaction.id; end if;
  if v_intent.status<>'authorized' then
    raise exception 'Authorized payment required before completion';
  end if;
  insert into public.finance_transactions(
    intent_id,service_request_id,operation,status,amount,currency,idempotency_key,
    provider_reference,metadata
  ) values(
    v_intent.id,p_request_id,'capture','succeeded',v_intent.amount,v_intent.currency,
    v_key,v_intent.provider_reference,jsonb_build_object('jobId',p_job_id)
  ) returning * into v_transaction;
  insert into public.finance_ledger_entries(
    transaction_id,intent_id,service_request_id,account,direction,amount,currency
  ) values
    (v_transaction.id,v_intent.id,p_request_id,'provider_clearing','debit',v_intent.amount,v_intent.currency),
    (v_transaction.id,v_intent.id,p_request_id,'service_settlement','credit',v_intent.amount,v_intent.currency);
  update public.finance_payment_intents set
    status='captured',captured_amount=amount,captured_at=now()
  where id=v_intent.id;
  insert into public.operational_events(
    service_request_id,job_id,event_type,entity_type,entity_id,payload
  ) values(
    p_request_id,p_job_id,'finance.captured','finance_transaction',v_transaction.id,
    jsonb_build_object('intent_id',v_intent.id,'amount',v_intent.amount,
      'currency',v_intent.currency)
  );
  return v_transaction.id;
end
$$;

create or replace function public.finance_settle_terminal_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_intent public.finance_payment_intents%rowtype;
  v_transaction_id uuid;
  v_remaining numeric;
  v_refund jsonb;
begin
  select * into v_intent from public.finance_payment_intents
  where service_request_id=p_request_id and purpose='initial' for update;
  if not found then return false; end if;

  if v_intent.provider='iyzico' and v_intent.environment='sandbox' then
    if v_intent.status in ('pending_authorization','authorization_failed') then
      insert into public.finance_transactions(
        intent_id,service_request_id,operation,status,amount,currency,idempotency_key,metadata
      ) values(
        v_intent.id,p_request_id,'void','no_op',0,v_intent.currency,
        'terminal-void:'||p_request_id::text,jsonb_build_object('reason','terminal_request','provider','iyzico')
      ) on conflict(intent_id,operation,idempotency_key) do nothing;
      update public.finance_payment_intents set status='cancelled' where id=v_intent.id;
      return true;
    end if;
    if v_intent.status in ('voided','refunded','cancelled') then return true; end if;
    if v_intent.status in ('authorized','capture_failed','requires_review') then
      raise exception 'Verified iyzico cancellation required before terminal request';
    end if;
    if v_intent.status in ('captured','partially_refunded') then
      raise exception 'Verified iyzico refund required before terminal request';
    end if;
    raise exception 'Unsupported iyzico terminal settlement state';
  end if;

  if v_intent.provider<>'fake' or v_intent.environment<>'sandbox' then
    raise exception 'Provider cancellation integration required';
  end if;
  if v_intent.status in ('pending_authorization','authorization_failed') then
    insert into public.finance_transactions(
      intent_id,service_request_id,operation,status,amount,currency,idempotency_key,metadata
    ) values(
      v_intent.id,p_request_id,'void','no_op',0,v_intent.currency,
      'terminal-void:'||p_request_id::text,jsonb_build_object('reason','terminal_request')
    ) on conflict(intent_id,operation,idempotency_key) do nothing;
    update public.finance_payment_intents set status='cancelled' where id=v_intent.id;
  elsif v_intent.status in ('authorized','capture_failed','requires_review') then
    insert into public.finance_transactions(
      intent_id,service_request_id,operation,status,amount,currency,idempotency_key,
      provider_reference,metadata
    ) values(
      v_intent.id,p_request_id,'void','succeeded',v_intent.authorized_amount,
      v_intent.currency,'terminal-void:'||p_request_id::text,
      v_intent.provider_reference,jsonb_build_object('reason','terminal_request')
    ) on conflict(intent_id,operation,idempotency_key) do nothing
    returning id into v_transaction_id;
    update public.finance_payment_intents set status='voided',voided_at=now()
    where id=v_intent.id and status in ('authorized','capture_failed','requires_review');
    if v_transaction_id is not null then
      insert into public.operational_events(
        service_request_id,event_type,entity_type,entity_id,payload
      ) values(
        p_request_id,'finance.voided','finance_transaction',v_transaction_id,
        jsonb_build_object('intent_id',v_intent.id)
      );
    end if;
  elsif v_intent.status in ('captured','partially_refunded') then
    v_remaining:=v_intent.captured_amount-v_intent.refunded_amount;
    if v_remaining>0 then
      v_refund:=public.finance_fake_refund(
        v_intent.id,'terminal-refund:'||p_request_id::text,v_remaining,'terminal_request');
    end if;
  end if;
  return true;
end
$$;

create or replace function public.finance_iyzico_refund_context(
  p_intent_id uuid,p_customer_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_config public.finance_runtime_config%rowtype;
  v_intent public.finance_payment_intents%rowtype;
  v_operation public.finance_iyzico_operations%rowtype;
  v_remaining numeric;
begin
  select * into v_config from public.finance_runtime_config where id=1;
  if not found or not v_config.iyzico_sandbox_enabled
     or v_config.gate_mode<>'test_only' or v_config.provider<>'iyzico'
     or v_config.environment<>'sandbox' then
    raise exception 'Iyzico Sandbox integration is disabled';
  end if;
  select * into v_intent from public.finance_payment_intents
  where id=p_intent_id and customer_id=p_customer_id and provider='iyzico'
    and environment='sandbox' and purpose='initial' for share;
  if not found or v_intent.status not in ('captured','partially_refunded')
     or not exists(select 1 from public.users where id=p_customer_id
       and role='customer' and is_active and is_test) then
    raise exception 'Refundable iyzico Sandbox intent not found';
  end if;
  select * into v_operation from public.finance_iyzico_operations
  where intent_id=v_intent.id and operation='authorize' and state='succeeded'
    and signature_verified and payment_transaction_id is not null
  order by created_at limit 1;
  if not found then raise exception 'Verified iyzico transaction reference required'; end if;
  v_remaining:=v_intent.captured_amount-v_intent.refunded_amount;
  if v_remaining<=0 then raise exception 'No refundable iyzico balance'; end if;
  return jsonb_build_object('remainingAmount',v_remaining::text,
    'paymentTransactionId',v_operation.payment_transaction_id);
end
$$;

create or replace function public.finance_iyzico_mark_manual_review(
  p_intent_id uuid,p_code text,p_detail jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_intent public.finance_payment_intents%rowtype;v_issue_id uuid;
begin
  if p_code is null or p_code!~'^iyzico_[a-z0-9_]{3,92}$'
     or p_detail is null or jsonb_typeof(p_detail)<>'object'
     or octet_length(p_detail::text)>8192 then
    raise exception 'Invalid iyzico review code';
  end if;
  select * into v_intent from public.finance_payment_intents
  where id=p_intent_id for update;
  if not found or v_intent.provider<>'iyzico' or v_intent.environment<>'sandbox' then
    raise exception 'Iyzico Sandbox intent not found';
  end if;
  insert into public.finance_reconciliation_issues(
    service_request_id,intent_id,code,status,detail
  ) values(v_intent.service_request_id,v_intent.id,p_code,'open',p_detail)
  on conflict(intent_id,code) where status='open'
  do update set detail=excluded.detail
  returning id into v_issue_id;
  if v_intent.status not in ('voided','refunded','cancelled') then
    update public.finance_payment_intents set status='requires_review'
    where id=v_intent.id returning * into v_intent;
  end if;
  return jsonb_build_object('intentId',v_intent.id,'intentStatus',v_intent.status,
    'manualReviewRequired',v_intent.status='requires_review','issueId',v_issue_id);
end
$$;

revoke all on function public.create_iyzico_payment_pending_service_request_v3(
  uuid,text,uuid,text,text,text,text,jsonb,text,date,text,numeric,numeric,numeric,jsonb,text),
  public.finance_iyzico_refund_context(uuid,uuid),
  public.finance_iyzico_mark_manual_review(uuid,text,jsonb)
from public,anon,authenticated;

grant execute on function public.create_iyzico_payment_pending_service_request_v3(
  uuid,text,uuid,text,text,text,text,jsonb,text,date,text,numeric,numeric,numeric,jsonb,text),
  public.finance_iyzico_refund_context(uuid,uuid),
  public.finance_iyzico_mark_manual_review(uuid,text,jsonb)
to service_role;

-- Keep trigger-only lifecycle functions unavailable as direct service_role RPCs.
revoke all on function public.finance_capture_completed_job(uuid,uuid,uuid),
  public.finance_settle_terminal_request(uuid)
from public,anon,authenticated,service_role;

comment on function public.create_iyzico_payment_pending_service_request_v3(
  uuid,text,uuid,text,text,text,text,jsonb,text,date,text,numeric,numeric,numeric,jsonb,text) is
  'Creates a test-only iyzico Sandbox intent without starting distribution.';

-- Deliberately leave finance_runtime_config values unchanged and disabled.
commit;
