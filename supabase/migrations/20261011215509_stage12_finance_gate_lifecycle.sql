-- Stage 12 finance gate and fake-provider lifecycle.
-- The runtime gate stays disabled until an explicit, separately approved
-- staging configuration change sets finance_runtime_config.gate_mode.
begin;

do $$
begin
  if to_regclass('public.finance_payment_intents') is null
     or to_regclass('public.finance_transactions') is null
     or to_regclass('public.finance_ledger_entries') is null
     or to_regclass('public.finance_reconciliation_issues') is null
     or to_regclass('public.service_distribution_cycles') is null
     or to_regprocedure('public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb,text,date)') is null
     or to_regprocedure('public.accept_service_quote(uuid,uuid)') is null
     or to_regprocedure('public.start_service_distribution_cycle(uuid,uuid,uuid)') is null then
    raise exception 'Stage 12 finance lifecycle prerequisites are missing';
  end if;
end
$$;

create or replace function public.finance_gate_required_for_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce((
    select case c.gate_mode
      when 'all' then true
      when 'test_only' then u.is_test
      else false
    end
    from public.finance_runtime_config c
    join public.users u on u.id=p_customer_id
    where c.id=1 and u.role='customer' and u.is_active
  ),false)
$$;

create or replace function public.finance_request_gate_required(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(r.finance_gate_required,false)
    or public.finance_gate_required_for_customer(r.customer_id)
  from public.service_requests r where r.id=p_request_id
$$;

create or replace function public.guard_finance_request_gate()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if tg_op='INSERT' then
    if public.finance_gate_required_for_customer(new.customer_id) then
      new.finance_gate_required:=true;
    end if;
  elsif old.finance_gate_required and not new.finance_gate_required then
    raise exception 'Finance gate cannot be disabled for an existing request';
  elsif public.finance_gate_required_for_customer(new.customer_id)
        and not new.finance_gate_required then
    raise exception 'Finance gate is required for this customer';
  end if;
  return new;
end
$$;

drop trigger if exists service_requests_finance_gate on public.service_requests;
create trigger service_requests_finance_gate
before insert or update of customer_id,finance_gate_required on public.service_requests
for each row execute function public.guard_finance_request_gate();

create or replace function public.finance_assert_distribution_ready(
  p_request_id uuid,p_quote_id uuid
) returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare v_quote public.service_quotes%rowtype;v_intent public.finance_payment_intents%rowtype;
begin
  if not coalesce(public.finance_request_gate_required(p_request_id),false) then
    return true;
  end if;
  if p_quote_id is null then
    raise exception 'Finance-gated distribution requires a quote';
  end if;
  select * into v_quote from public.service_quotes
  where id=p_quote_id and service_request_id=p_request_id and status='accepted';
  if not found then raise exception 'Finance-gated distribution requires an accepted quote'; end if;
  select * into v_intent from public.finance_payment_intents
  where service_request_id=p_request_id and quote_id=p_quote_id and purpose='initial';
  if not found or v_intent.status<>'authorized'
     or v_intent.currency is distinct from v_quote.currency
     or v_intent.amount is distinct from v_quote.total_amount
     or v_intent.authorized_amount is distinct from v_intent.amount then
    raise exception 'Payment authorization required before distribution';
  end if;
  return true;
end
$$;

create or replace function public.guard_finance_distribution_write()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_request_id uuid;v_quote_id uuid;v_guard boolean;
begin
  if tg_table_name='service_distribution_cycles' then
    if new.status<>'active' then return new; end if;
    v_request_id:=new.service_request_id;v_quote_id:=new.quote_id;
  elsif tg_table_name='service_dispatches' then
    if new.status not in ('pending','broadcasting') then return new; end if;
    v_request_id:=new.service_request_id;v_quote_id:=new.quote_id;
  elsif tg_table_name='service_jobs' then
    if new.status not in ('assigned','in_progress') then return new; end if;
    v_request_id:=new.service_request_id;v_quote_id:=new.accepted_quote_id;
  else
    raise exception 'Unsupported finance distribution guard target';
  end if;
  v_guard:=public.finance_assert_distribution_ready(v_request_id,v_quote_id);
  return new;
end
$$;

drop trigger if exists service_distribution_cycles_finance_guard on public.service_distribution_cycles;
create trigger service_distribution_cycles_finance_guard
before insert or update of status,quote_id on public.service_distribution_cycles
for each row execute function public.guard_finance_distribution_write();
drop trigger if exists service_dispatches_finance_guard on public.service_dispatches;
create trigger service_dispatches_finance_guard
before insert or update of status,quote_id on public.service_dispatches
for each row execute function public.guard_finance_distribution_write();
drop trigger if exists service_jobs_finance_distribution_guard on public.service_jobs;
create trigger service_jobs_finance_distribution_guard
before insert or update of status,accepted_quote_id on public.service_jobs
for each row execute function public.guard_finance_distribution_write();

create or replace function public.create_payment_pending_service_request_v2(
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
  if not found or v_config.gate_mode='disabled' or v_config.provider<>'fake'
     or v_config.environment<>'sandbox'
     or not public.finance_gate_required_for_customer(p_customer_id) then
    raise exception 'Stage 12 fake finance gate is disabled';
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
       or v_intent.provider<>'fake' or v_intent.environment<>'sandbox'
       or v_intent.currency<>p_currency or v_intent.amount<>p_total_amount
       or v_intent.creation_idempotency_key<>p_payment_idempotency_key then
      raise exception 'Existing payment intent mismatch';
    end if;
  else
    insert into public.finance_payment_intents(
      service_request_id,quote_id,customer_id,provider,environment,purpose,status,
      currency,amount,creation_idempotency_key
    ) values(
      v_request.id,v_quote.id,p_customer_id,'fake','sandbox','initial',
      'pending_authorization',p_currency,p_total_amount,p_payment_idempotency_key
    ) returning * into v_intent;
    insert into public.operational_events(
      service_request_id,actor_user_id,event_type,entity_type,entity_id,payload
    ) values(
      v_request.id,p_customer_id,'finance.payment_pending','finance_payment_intent',
      v_intent.id,jsonb_build_object('provider','fake','environment','sandbox',
        'currency',v_intent.currency,'amount',v_intent.amount)
    );
  end if;

  return jsonb_build_object(
    'id',v_request.id,'quoteId',v_quote.id,'totalAmount',v_quote.total_amount,
    'currency',v_quote.currency,'paymentIntentId',v_intent.id,
    'paymentStatus',v_intent.status,'distributionStarted',false
  );
end
$$;

create or replace function public.finance_fake_authorize(
  p_intent_id uuid,p_idempotency_key text,p_approved boolean
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_request_id uuid;v_intent public.finance_payment_intents%rowtype;
  v_transaction public.finance_transactions%rowtype;v_result text;
begin
  if p_intent_id is null or p_approved is null or p_idempotency_key is null
     or p_idempotency_key!~'^[A-Za-z0-9:_-]{8,128}$' then
    raise exception 'Invalid fake authorization request';
  end if;
  select service_request_id into v_request_id from public.finance_payment_intents
  where id=p_intent_id;
  if not found then raise exception 'Payment intent not found'; end if;
  perform 1 from public.service_requests where id=v_request_id for update;
  select * into v_intent from public.finance_payment_intents
  where id=p_intent_id for update;
  if v_intent.provider<>'fake' or v_intent.environment<>'sandbox'
     or v_intent.purpose<>'initial'
     or not exists(select 1 from public.users
       where id=v_intent.customer_id and role='customer' and is_active and is_test)
     or not public.finance_request_gate_required(v_intent.service_request_id) then
    raise exception 'Fake authorization is not allowed';
  end if;

  select * into v_transaction from public.finance_transactions
  where intent_id=v_intent.id and operation='authorize'
    and idempotency_key=p_idempotency_key;
  if found then
    if coalesce((v_transaction.metadata->>'approved')::boolean,false)
       is distinct from p_approved then
      raise exception 'Authorization idempotency payload mismatch';
    end if;
    return jsonb_build_object(
      'intentId',v_intent.id,'status',v_transaction.metadata->>'resultStatus',
      'currentIntentStatus',v_intent.status,'transactionId',v_transaction.id,
      'idempotentReplay',true
    );
  end if;

  if v_intent.status in ('authorized','captured','partially_refunded','refunded','voided','cancelled') then
    v_result:=v_intent.status;
    insert into public.finance_transactions(
      intent_id,service_request_id,operation,status,amount,currency,idempotency_key,
      provider_reference,metadata
    ) values(
      v_intent.id,v_intent.service_request_id,'authorize','no_op',0,v_intent.currency,
      p_idempotency_key,v_intent.provider_reference,
      jsonb_build_object('approved',p_approved,'resultStatus',v_result)
    ) returning * into v_transaction;
  elsif p_approved then
    if v_intent.status not in ('pending_authorization','authorization_failed','authorized') then
      raise exception 'Payment intent cannot be authorized';
    end if;
    if v_intent.status<>'authorized' then
      update public.finance_payment_intents set
        status='authorized',authorized_amount=amount,authorized_at=coalesce(authorized_at,now()),
        provider_reference=coalesce(provider_reference,'fake:'||id::text)
      where id=v_intent.id returning * into v_intent;
    end if;
    v_result:='authorized';
    insert into public.finance_transactions(
      intent_id,service_request_id,operation,status,amount,currency,idempotency_key,
      provider_reference,metadata
    ) values(
      v_intent.id,v_intent.service_request_id,'authorize','succeeded',v_intent.amount,
      v_intent.currency,p_idempotency_key,v_intent.provider_reference,
      jsonb_build_object('approved',true,'resultStatus',v_result)
    ) returning * into v_transaction;
    insert into public.operational_events(
      service_request_id,event_type,entity_type,entity_id,payload
    ) values(
      v_intent.service_request_id,'finance.authorized','finance_payment_intent',
      v_intent.id,jsonb_build_object('transaction_id',v_transaction.id)
    );
  else
    if v_intent.status not in ('pending_authorization','authorization_failed') then
      raise exception 'Payment intent cannot be declined';
    end if;
    if v_intent.status<>'authorization_failed' then
      update public.finance_payment_intents set status='authorization_failed'
      where id=v_intent.id returning * into v_intent;
    end if;
    v_result:='authorization_failed';
    insert into public.finance_transactions(
      intent_id,service_request_id,operation,status,amount,currency,idempotency_key,
      error_code,metadata
    ) values(
      v_intent.id,v_intent.service_request_id,'authorize','failed',0,v_intent.currency,
      p_idempotency_key,'fake_declined',
      jsonb_build_object('approved',false,'resultStatus',v_result)
    ) returning * into v_transaction;
    insert into public.operational_events(
      service_request_id,event_type,entity_type,entity_id,payload
    ) values(
      v_intent.service_request_id,'finance.authorization_failed',
      'finance_payment_intent',v_intent.id,
      jsonb_build_object('transaction_id',v_transaction.id,'code','fake_declined')
    );
  end if;

  return jsonb_build_object(
    'intentId',v_intent.id,'status',v_result,
    'currentIntentStatus',v_intent.status,'transactionId',v_transaction.id,
    'idempotentReplay',false
  );
end
$$;

create or replace function public.finance_record_reconciliation_issue(
  p_request_id uuid,p_intent_id uuid,p_code text,p_detail jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_id uuid;
begin
  if p_code is null or length(p_code) not between 3 and 100
     or p_detail is null or jsonb_typeof(p_detail)<>'object'
     or octet_length(p_detail::text)>8192
     or not exists(select 1 from public.finance_payment_intents
       where id=p_intent_id and service_request_id=p_request_id) then
    raise exception 'Invalid reconciliation issue';
  end if;
  insert into public.finance_reconciliation_issues(
    service_request_id,intent_id,code,status,detail
  ) values(p_request_id,p_intent_id,p_code,'open',p_detail)
  on conflict(intent_id,code) where status='open'
  do update set detail=excluded.detail
  returning id into v_id;
  return v_id;
end
$$;

create or replace function public.finance_release_fake_sandbox_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_request public.service_requests%rowtype;v_intent public.finance_payment_intents%rowtype;
  v_cycle_id uuid;v_guard boolean;
begin
  select * into v_request from public.service_requests where id=p_request_id for update;
  if not found or not public.finance_request_gate_required(v_request.id)
     or not exists(select 1 from public.users where id=v_request.customer_id
       and role='customer' and is_active and is_test) then
    raise exception 'Finance-gated test request required';
  end if;
  select * into v_intent from public.finance_payment_intents
  where service_request_id=v_request.id and purpose='initial' for update;
  if not found or v_intent.provider<>'fake' or v_intent.environment<>'sandbox'
     or v_intent.status<>'authorized' then
    raise exception 'Successful fake authorization required';
  end if;
  v_guard:=public.finance_assert_distribution_ready(v_request.id,v_intent.quote_id);
  v_cycle_id:=public.start_service_distribution_cycle(
    v_request.id,v_intent.quote_id,null);
  update public.finance_reconciliation_issues set
    status='resolved',resolved_at=now()
  where intent_id=v_intent.id and status='open'
    and code in ('distribution_release_failed','distribution_release_unconfirmed');
  return jsonb_build_object(
    'requestId',v_request.id,'intentId',v_intent.id,
    'distributionStarted',true,'distributionCycleId',v_cycle_id
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
declare v_intent public.finance_payment_intents%rowtype;
  v_transaction public.finance_transactions%rowtype;v_key text;
begin
  perform 1 from public.service_requests where id=p_request_id for update;
  if not coalesce(public.finance_request_gate_required(p_request_id),false) then
    return null;
  end if;
  select * into v_intent from public.finance_payment_intents
  where service_request_id=p_request_id and quote_id=p_quote_id and purpose='initial'
  for update;
  if not found or v_intent.provider<>'fake' or v_intent.environment<>'sandbox' then
    raise exception 'Finance intent required before completion';
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

create or replace function public.capture_finance_on_job_completion()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_transaction_id uuid;
begin
  if new.status='completed' and old.status<>'completed' then
    v_transaction_id:=public.finance_capture_completed_job(
      new.id,new.service_request_id,new.accepted_quote_id);
  end if;
  return new;
end
$$;

drop trigger if exists service_jobs_finance_capture on public.service_jobs;
create trigger service_jobs_finance_capture
before update of status on public.service_jobs
for each row execute function public.capture_finance_on_job_completion();

create or replace function public.finance_fake_refund(
  p_intent_id uuid,p_idempotency_key text,p_amount numeric,p_reason text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_request_id uuid;v_intent public.finance_payment_intents%rowtype;
  v_transaction public.finance_transactions%rowtype;v_new_refunded numeric;v_new_status text;
begin
  if p_intent_id is null or p_idempotency_key is null
     or p_idempotency_key!~'^[A-Za-z0-9:_-]{8,128}$'
     or p_amount is null or p_amount<=0 or p_amount::text in ('NaN','Infinity','-Infinity')
     or p_reason is null or length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'Invalid fake refund request';
  end if;
  select service_request_id into v_request_id from public.finance_payment_intents
  where id=p_intent_id;
  if not found then raise exception 'Payment intent not found'; end if;
  perform 1 from public.service_requests where id=v_request_id for update;
  select * into v_intent from public.finance_payment_intents
  where id=p_intent_id for update;
  if v_intent.provider<>'fake' or v_intent.environment<>'sandbox'
     or not exists(select 1 from public.users where id=v_intent.customer_id and is_test) then
    raise exception 'Fake sandbox intent required';
  end if;
  select * into v_transaction from public.finance_transactions
  where intent_id=v_intent.id and operation='refund'
    and idempotency_key=p_idempotency_key;
  if found then
    if v_transaction.amount is distinct from p_amount
       or v_transaction.metadata->>'reason' is distinct from btrim(p_reason) then
      raise exception 'Refund idempotency payload mismatch';
    end if;
    return jsonb_build_object('intentId',v_intent.id,'status',v_intent.status,
      'transactionId',v_transaction.id,'refundedAmount',v_intent.refunded_amount,
      'idempotentReplay',true);
  end if;
  if v_intent.status not in ('captured','partially_refunded')
     or p_amount>v_intent.captured_amount-v_intent.refunded_amount then
    raise exception 'Refund exceeds captured balance';
  end if;
  v_new_refunded:=v_intent.refunded_amount+p_amount;
  v_new_status:=case when v_new_refunded=v_intent.captured_amount
    then 'refunded' else 'partially_refunded' end;
  insert into public.finance_transactions(
    intent_id,service_request_id,operation,status,amount,currency,idempotency_key,
    provider_reference,metadata
  ) values(
    v_intent.id,v_intent.service_request_id,'refund','succeeded',p_amount,
    v_intent.currency,p_idempotency_key,v_intent.provider_reference,
    jsonb_build_object('reason',btrim(p_reason))
  ) returning * into v_transaction;
  insert into public.finance_ledger_entries(
    transaction_id,intent_id,service_request_id,account,direction,amount,currency
  ) values
    (v_transaction.id,v_intent.id,v_intent.service_request_id,'service_settlement','debit',p_amount,v_intent.currency),
    (v_transaction.id,v_intent.id,v_intent.service_request_id,'provider_clearing','credit',p_amount,v_intent.currency);
  update public.finance_payment_intents set
    status=v_new_status,refunded_amount=v_new_refunded,refunded_at=now()
  where id=v_intent.id returning * into v_intent;
  insert into public.operational_events(
    service_request_id,event_type,entity_type,entity_id,payload
  ) values(
    v_intent.service_request_id,'finance.refunded','finance_transaction',
    v_transaction.id,jsonb_build_object('intent_id',v_intent.id,'amount',p_amount,
      'currency',v_intent.currency,'status',v_intent.status)
  );
  return jsonb_build_object('intentId',v_intent.id,'status',v_intent.status,
    'transactionId',v_transaction.id,'refundedAmount',v_intent.refunded_amount,
    'idempotentReplay',false);
end
$$;

create or replace function public.finance_settle_terminal_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare v_intent public.finance_payment_intents%rowtype;v_transaction_id uuid;
  v_remaining numeric;v_refund jsonb;
begin
  select * into v_intent from public.finance_payment_intents
  where service_request_id=p_request_id and purpose='initial' for update;
  if not found then return false; end if;
  if v_intent.provider<>'fake' or v_intent.environment<>'sandbox' then
    raise exception 'Provider cancellation integration required';
  end if;
  if v_intent.status in ('pending_authorization','authorization_failed') then
    insert into public.finance_transactions(
      intent_id,service_request_id,operation,status,amount,currency,idempotency_key,
      metadata
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
        v_intent.id,'terminal-refund:'||p_request_id::text,v_remaining,
        'terminal_request');
    end if;
  end if;
  return true;
end
$$;

create or replace function public.settle_finance_on_request_terminal()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_settled boolean;
begin
  if new.status in ('cancelled','technician_unavailable')
     and old.status is distinct from new.status then
    v_settled:=public.finance_settle_terminal_request(new.id);
  end if;
  return new;
end
$$;

drop trigger if exists service_requests_finance_terminal on public.service_requests;
create trigger service_requests_finance_terminal
before update of status on public.service_requests
for each row execute function public.settle_finance_on_request_terminal();

create or replace function public.finance_reconciliation_snapshot(p_request_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select jsonb_build_object(
    'requestId',r.id,
    'gateRequired',public.finance_request_gate_required(r.id),
    'intentId',i.id,
    'intentStatus',i.status,
    'amount',i.amount,
    'authorizedAmount',i.authorized_amount,
    'capturedAmount',i.captured_amount,
    'refundedAmount',i.refunded_amount,
    'ledgerDebit',coalesce((select sum(l.amount) from public.finance_ledger_entries l
      where l.intent_id=i.id and l.direction='debit'),0),
    'ledgerCredit',coalesce((select sum(l.amount) from public.finance_ledger_entries l
      where l.intent_id=i.id and l.direction='credit'),0),
    'distributionStarted',exists(select 1 from public.service_distribution_cycles c
      where c.service_request_id=r.id),
    'openIssueCount',(select count(*) from public.finance_reconciliation_issues x
      where x.intent_id=i.id and x.status='open')
  )
  from public.service_requests r
  left join public.finance_payment_intents i
    on i.service_request_id=r.id and i.purpose='initial'
  where r.id=p_request_id
$$;

revoke all on function public.finance_gate_required_for_customer(uuid),
  public.finance_request_gate_required(uuid),public.guard_finance_request_gate(),
  public.finance_assert_distribution_ready(uuid,uuid),
  public.guard_finance_distribution_write(),
  public.create_payment_pending_service_request_v2(
    uuid,text,uuid,text,text,text,text,jsonb,text,date,
    text,numeric,numeric,numeric,jsonb,text),
  public.finance_fake_authorize(uuid,text,boolean),
  public.finance_record_reconciliation_issue(uuid,uuid,text,jsonb),
  public.finance_release_fake_sandbox_request(uuid),
  public.finance_capture_completed_job(uuid,uuid,uuid),
  public.capture_finance_on_job_completion(),
  public.finance_fake_refund(uuid,text,numeric,text),
  public.finance_settle_terminal_request(uuid),
  public.settle_finance_on_request_terminal(),
  public.finance_reconciliation_snapshot(uuid)
from public,anon,authenticated;

grant execute on function public.finance_gate_required_for_customer(uuid),
  public.finance_request_gate_required(uuid),
  public.finance_assert_distribution_ready(uuid,uuid),
  public.create_payment_pending_service_request_v2(
    uuid,text,uuid,text,text,text,text,jsonb,text,date,
    text,numeric,numeric,numeric,jsonb,text),
  public.finance_fake_authorize(uuid,text,boolean),
  public.finance_record_reconciliation_issue(uuid,uuid,text,jsonb),
  public.finance_release_fake_sandbox_request(uuid),
  public.finance_fake_refund(uuid,text,numeric,text),
  public.finance_reconciliation_snapshot(uuid)
to service_role;

revoke all on function public.guard_finance_request_gate(),
  public.guard_finance_distribution_write(),
  public.finance_capture_completed_job(uuid,uuid,uuid),
  public.capture_finance_on_job_completion(),
  public.finance_settle_terminal_request(uuid),
  public.settle_finance_on_request_terminal()
from service_role;

commit;
