-- Stage 12 iyzico Sandbox integration draft.
-- This migration is intentionally unapplied. It prepares durable operation
-- records while keeping the integration disabled and the fake flow unchanged.
begin;

do $$
begin
  if to_regclass('public.finance_runtime_config') is null
     or to_regclass('public.finance_payment_intents') is null
     or to_regclass('public.finance_transactions') is null
     or to_regclass('public.finance_ledger_entries') is null
     or to_regclass('public.finance_reconciliation_issues') is null
     or to_regprocedure('public.finance_assert_distribution_ready(uuid,uuid)') is null
     or to_regprocedure('public.start_service_distribution_cycle(uuid,uuid,uuid)') is null then
    raise exception 'Stage 12 iyzico integration prerequisites are missing';
  end if;
end
$$;


alter table public.finance_runtime_config
  add column if not exists iyzico_sandbox_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='finance_runtime_iyzico_sandbox_guard'
  ) then
    alter table public.finance_runtime_config
      add constraint finance_runtime_iyzico_sandbox_guard check (
        not iyzico_sandbox_enabled
        or (gate_mode='test_only' and provider='iyzico' and environment='sandbox')
      );
  end if;
end
$$;

-- The default stays closed even if an older row already exists.
update public.finance_runtime_config
set iyzico_sandbox_enabled=false
where id=1 and iyzico_sandbox_enabled is distinct from false;

create table if not exists public.finance_iyzico_operations (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null,
  service_request_id uuid not null,
  customer_id uuid not null references public.users(id) on delete no action,
  job_id uuid references public.service_jobs(id) on delete no action,
  provider text not null default 'iyzico' check (provider='iyzico'),
  environment text not null default 'sandbox' check (environment='sandbox'),
  operation text not null check (operation in ('authorize','capture','cancel','refund','retrieve')),
  operation_id text not null check (operation_id~'^[A-Za-z0-9:_-]{8,128}$'),
  business_operation_key text not null
    check (business_operation_key~'^[A-Za-z0-9:_-]{8,200}$'),
  conversation_id text not null check (conversation_id~'^[A-Za-z0-9:_-]{8,128}$'),
  fingerprint text not null check (fingerprint~'^[0-9a-f]{64}$'),
  state text not null default 'in_flight',
  amount numeric(12,2) not null check (amount>0),
  currency text not null check (currency='TRY'),
  basket_id text check (basket_id is null or length(basket_id) between 1 and 128),
  payment_id text check (payment_id is null or length(payment_id) between 1 and 200),
  payment_transaction_id text
    check (payment_transaction_id is null or length(payment_transaction_id) between 1 and 200),
  payment_conversation_id text
    check (payment_conversation_id is null or length(payment_conversation_id) between 1 and 128),
  host_reference text check (host_reference is null or length(host_reference) between 1 and 200),
  provider_phase text check (provider_phase is null or provider_phase in ('PRE_AUTH','POST_AUTH')),
  signature_verified boolean not null default false,
  retryable boolean not null default false,
  error_code text check (error_code is null or error_code~'^[A-Za-z0-9:_-]{1,100}$'),
  claim_token uuid,
  lease_expires_at timestamptz not null,
  revision integer not null default 1 check (revision>0),
  resolution_evidence_operation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_iyzico_operations_intent_request_fk
    foreign key(intent_id,service_request_id)
    references public.finance_payment_intents(id,service_request_id) on delete no action,
  constraint finance_iyzico_operations_request_customer_fk
    foreign key(service_request_id,customer_id)
    references public.service_requests(id,customer_id) on delete no action,
  constraint finance_iyzico_operations_operation_id_uq
    unique(provider,environment,operation_id),
  constraint finance_iyzico_operations_business_key_uq
    unique(provider,environment,operation,business_operation_key),
  constraint finance_iyzico_operations_conversation_uq
    unique(provider,environment,conversation_id),
  constraint finance_iyzico_operations_state_check check (
    (state='in_flight' and claim_token is not null and error_code is null)
    or (state='unknown' and claim_token is null)
    or (state in ('succeeded','declined') and claim_token is null and signature_verified)
  ),
  constraint finance_iyzico_operations_reference_check check (
    (operation='authorize' and basket_id is not null)
    or (operation='capture' and basket_id is not null and payment_id is not null and job_id is not null)
    or (operation='cancel' and payment_id is not null)
    or (operation='refund' and payment_id is not null and payment_transaction_id is not null)
    or (operation='retrieve' and basket_id is not null
        and (payment_id is not null or payment_conversation_id is not null))
  )
);

create index if not exists finance_iyzico_operations_intent_created_idx
  on public.finance_iyzico_operations(intent_id,created_at desc);
create index if not exists finance_iyzico_operations_state_lease_idx
  on public.finance_iyzico_operations(state,lease_expires_at)
  where state in ('in_flight','unknown');

alter table public.finance_iyzico_operations enable row level security;
revoke all on public.finance_iyzico_operations from public,anon,authenticated,service_role;

create or replace function public.finance_iyzico_operation_json(
  p_operation public.finance_iyzico_operations
) returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'provider',p_operation.provider,
    'environment',p_operation.environment,
    'operation',p_operation.operation,
    'operationId',p_operation.operation_id,
    'businessOperationKey',p_operation.business_operation_key,
    'conversationId',p_operation.conversation_id,
    'fingerprint',p_operation.fingerprint,
    'money',jsonb_build_object('amount',p_operation.amount::text,'currency',p_operation.currency),
    'basketId',p_operation.basket_id,
    'paymentId',p_operation.payment_id,
    'paymentTransactionId',p_operation.payment_transaction_id,
    'paymentConversationId',p_operation.payment_conversation_id,
    'state',p_operation.state,
    'revision',p_operation.revision,
    'createdAt',p_operation.created_at,
    'updatedAt',p_operation.updated_at,
    'leaseExpiresAt',p_operation.lease_expires_at,
    'resolutionEvidenceOperationId',p_operation.resolution_evidence_operation_id,
    'result',case when p_operation.state='in_flight' then null else jsonb_strip_nulls(
      jsonb_build_object(
        'provider','iyzico','operation',p_operation.operation,
        'operationId',p_operation.operation_id,
        'conversationId',p_operation.conversation_id,
        'outcome',p_operation.state,
        'money',jsonb_build_object('amount',p_operation.amount::text,'currency',p_operation.currency),
        'paymentId',p_operation.payment_id,
        'paymentTransactionId',p_operation.payment_transaction_id,
        'hostReference',p_operation.host_reference,
        'providerPhase',p_operation.provider_phase,
        'signatureVerified',p_operation.signature_verified,
        'retryable',p_operation.retryable,
        'errorCode',p_operation.error_code
      )) end
  ))
$$;

create or replace function public.finance_iyzico_integration_status()
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select jsonb_build_object(
    'enabled',c.iyzico_sandbox_enabled,
    'gateMode',c.gate_mode,
    'provider',c.provider,
    'environment',c.environment
  ) from public.finance_runtime_config c where c.id=1
$$;

create or replace function public.finance_iyzico_intent_context(
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
begin
  select * into v_config from public.finance_runtime_config where id=1;
  if not found or not v_config.iyzico_sandbox_enabled
     or v_config.gate_mode<>'test_only' or v_config.provider<>'iyzico'
     or v_config.environment<>'sandbox' then
    raise exception 'Iyzico Sandbox integration is disabled';
  end if;
  select * into v_intent from public.finance_payment_intents
  where id=p_intent_id and customer_id=p_customer_id and provider='iyzico'
    and environment='sandbox' and purpose='initial';
  if not found or not exists(select 1 from public.users
    where id=p_customer_id and role='customer' and is_active and is_test) then
    raise exception 'Iyzico Sandbox intent not found';
  end if;
  return jsonb_build_object(
    'intentId',v_intent.id,'serviceRequestId',v_intent.service_request_id,
    'customerId',v_intent.customer_id,'quoteId',v_intent.quote_id,
    'amount',v_intent.amount::text,'currency',v_intent.currency,
    'basketId',v_intent.service_request_id::text,
    'intentStatus',v_intent.status,'paymentId',v_intent.provider_reference
  );
end
$$;

create or replace function public.finance_iyzico_claim_operation(
  p_intent_id uuid,p_service_request_id uuid,p_customer_id uuid,p_job_id uuid,
  p_operation text,p_operation_id text,p_business_operation_key text,
  p_conversation_id text,p_fingerprint text,p_amount numeric,p_currency text,
  p_basket_id text,p_payment_id text,p_payment_transaction_id text,
  p_payment_conversation_id text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_config public.finance_runtime_config%rowtype;
  v_intent public.finance_payment_intents%rowtype;
  v_record public.finance_iyzico_operations%rowtype;
  v_token uuid:=gen_random_uuid();
  v_reason text;
begin
  if p_operation not in ('authorize','capture','cancel','refund','retrieve')
     or p_operation_id!~'^[A-Za-z0-9:_-]{8,128}$'
     or p_business_operation_key!~'^[A-Za-z0-9:_-]{8,200}$'
     or p_conversation_id!~'^[A-Za-z0-9:_-]{8,128}$'
     or p_fingerprint!~'^[0-9a-f]{64}$'
     or p_amount is null or p_amount<=0 or p_currency<>'TRY' then
    raise exception 'Invalid iyzico operation descriptor';
  end if;
  select * into v_config from public.finance_runtime_config where id=1 for share;
  if not found or not v_config.iyzico_sandbox_enabled
     or v_config.gate_mode<>'test_only'
     or v_config.provider<>'iyzico' or v_config.environment<>'sandbox' then
    raise exception 'Iyzico Sandbox integration is disabled';
  end if;
  select * into v_intent from public.finance_payment_intents
  where id=p_intent_id for update;
  if not found or v_intent.service_request_id is distinct from p_service_request_id
     or v_intent.customer_id is distinct from p_customer_id
     or v_intent.provider<>'iyzico' or v_intent.environment<>'sandbox'
     or v_intent.currency is distinct from p_currency
     or not exists(select 1 from public.users
       where id=p_customer_id and role='customer' and is_active and is_test) then
    raise exception 'Iyzico Sandbox intent scope mismatch';
  end if;
  if p_operation in ('authorize','capture','cancel','retrieve')
     and p_amount is distinct from v_intent.amount then
    raise exception 'Iyzico operation amount mismatch';
  end if;
  if p_operation='refund'
     and (v_intent.status not in ('captured','partially_refunded')
       or p_amount>v_intent.captured_amount-v_intent.refunded_amount) then
    raise exception 'Iyzico refund exceeds captured balance';
  end if;
  if p_operation='capture' and not exists(
    select 1 from public.service_jobs j
    where j.id=p_job_id and j.service_request_id=p_service_request_id
      and j.accepted_quote_id=v_intent.quote_id and j.status='completed'
  ) then
    raise exception 'Completed service job required before iyzico capture';
  end if;
  begin
    insert into public.finance_iyzico_operations(
      intent_id,service_request_id,customer_id,job_id,operation,operation_id,
      business_operation_key,conversation_id,fingerprint,amount,currency,basket_id,
      payment_id,payment_transaction_id,payment_conversation_id,claim_token,
      lease_expires_at
    ) values(
      p_intent_id,p_service_request_id,p_customer_id,p_job_id,p_operation,p_operation_id,
      p_business_operation_key,p_conversation_id,p_fingerprint,p_amount,p_currency,p_basket_id,
      p_payment_id,p_payment_transaction_id,p_payment_conversation_id,v_token,
      clock_timestamp()+interval '5 minutes'
    ) returning * into v_record;
    return jsonb_build_object(
      'kind','claimed','claimToken',v_token::text,
      'record',public.finance_iyzico_operation_json(v_record)
    );
  exception when unique_violation then
    select * into v_record from public.finance_iyzico_operations
    where provider='iyzico' and environment='sandbox' and operation_id=p_operation_id;
    if found then
      if v_record.operation=p_operation
         and v_record.business_operation_key=p_business_operation_key
         and v_record.fingerprint=p_fingerprint then
        return jsonb_build_object(
          'kind','existing','record',public.finance_iyzico_operation_json(v_record)
        );
      end if;
      v_reason:='operation_id';
    else
      select * into v_record from public.finance_iyzico_operations
      where provider='iyzico' and environment='sandbox'
        and operation=p_operation and business_operation_key=p_business_operation_key;
      if found then v_reason:='business_operation';
      else
        select * into v_record from public.finance_iyzico_operations
        where provider='iyzico' and environment='sandbox'
          and conversation_id=p_conversation_id;
        v_reason:='conversation_id';
      end if;
    end if;
    if not found then raise exception 'Iyzico unique operation owner missing'; end if;
    return jsonb_build_object(
      'kind','conflict','reason',v_reason,
      'record',public.finance_iyzico_operation_json(v_record)
    );
  end;
end
$$;

create or replace function public.finance_iyzico_get_operation(p_operation_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare v_record public.finance_iyzico_operations%rowtype;
begin
  select * into v_record from public.finance_iyzico_operations
  where provider='iyzico' and environment='sandbox' and operation_id=p_operation_id;
  if not found then return null; end if;
  return public.finance_iyzico_operation_json(v_record);
end
$$;

create or replace function public.finance_iyzico_finalize_operation(
  p_operation_id text,p_claim_token uuid,p_outcome text,p_payment_id text,
  p_payment_transaction_id text,p_host_reference text,p_provider_phase text,
  p_signature_verified boolean,p_retryable boolean,p_error_code text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_record public.finance_iyzico_operations%rowtype;
begin
  select * into v_record from public.finance_iyzico_operations
  where provider='iyzico' and environment='sandbox' and operation_id=p_operation_id
  for update;
  if not found or v_record.state<>'in_flight'
     or v_record.claim_token is distinct from p_claim_token then
    raise exception 'Iyzico operation claim lost';
  end if;
  if p_outcome not in ('succeeded','declined','unknown')
     or p_signature_verified is null or p_retryable is null
     or (p_outcome in ('succeeded','declined') and not p_signature_verified)
     or (p_outcome='succeeded' and v_record.operation='authorize'
       and p_provider_phase<>'PRE_AUTH')
     or (p_outcome='succeeded' and v_record.operation='capture'
       and p_provider_phase<>'POST_AUTH') then
    raise exception 'Invalid iyzico normalized result';
  end if;
  update public.finance_iyzico_operations set
    state=p_outcome,payment_id=coalesce(p_payment_id,payment_id),
    payment_transaction_id=coalesce(p_payment_transaction_id,payment_transaction_id),
    host_reference=p_host_reference,provider_phase=p_provider_phase,
    signature_verified=p_signature_verified,retryable=p_retryable,error_code=p_error_code,
    claim_token=null,revision=revision+1,updated_at=clock_timestamp()
  where id=v_record.id returning * into v_record;
  return public.finance_iyzico_operation_json(v_record);
end
$$;

create or replace function public.finance_iyzico_mark_interrupted_unknown(
  p_operation_id text,p_expected_revision integer,p_error_code text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_record public.finance_iyzico_operations%rowtype;
begin
  select * into v_record from public.finance_iyzico_operations
  where provider='iyzico' and environment='sandbox' and operation_id=p_operation_id
  for update;
  if not found or v_record.state<>'in_flight'
     or v_record.revision<>p_expected_revision then
    raise exception 'Iyzico interruption conflict';
  end if;
  if clock_timestamp()<v_record.lease_expires_at then
    raise exception 'Iyzico operation lease is active';
  end if;
  update public.finance_iyzico_operations set
    state='unknown',claim_token=null,signature_verified=false,retryable=false,
    error_code=coalesce(p_error_code,'interrupted_before_confirmation'),
    revision=revision+1,updated_at=clock_timestamp()
  where id=v_record.id returning * into v_record;
  return public.finance_iyzico_operation_json(v_record);
end
$$;

create or replace function public.finance_iyzico_resolve_unknown(
  p_operation_id text,p_expected_revision integer,p_evidence_operation_id text,
  p_outcome text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_original public.finance_iyzico_operations%rowtype;
  v_evidence public.finance_iyzico_operations%rowtype;
begin
  select * into v_original from public.finance_iyzico_operations
  where provider='iyzico' and environment='sandbox' and operation_id=p_operation_id
  for update;
  if not found or v_original.state<>'unknown'
     or v_original.revision<>p_expected_revision
     or v_original.operation not in ('authorize','capture') then
    raise exception 'Iyzico resolution conflict';
  end if;
  select * into v_evidence from public.finance_iyzico_operations
  where provider='iyzico' and environment='sandbox'
    and operation_id=p_evidence_operation_id for update;
  if not found or v_evidence.operation<>'retrieve'
     or v_evidence.state not in ('succeeded','declined')
     or not v_evidence.signature_verified or v_evidence.state<>p_outcome
     or v_evidence.intent_id<>v_original.intent_id
     or v_evidence.amount<>v_original.amount or v_evidence.currency<>v_original.currency
     or v_evidence.basket_id is distinct from v_original.basket_id then
    raise exception 'Iyzico resolution evidence mismatch';
  end if;
  if v_original.operation='authorize' and (
       v_evidence.payment_conversation_id is distinct from v_original.conversation_id
       or (p_outcome='succeeded' and v_evidence.provider_phase<>'PRE_AUTH')
     ) then
    raise exception 'Iyzico authorization evidence mismatch';
  end if;
  if v_original.operation='capture' and (
       p_outcome<>'succeeded'
       or v_evidence.payment_id is distinct from v_original.payment_id
       or v_evidence.provider_phase<>'POST_AUTH'
     ) then
    raise exception 'Iyzico capture evidence mismatch';
  end if;
  update public.finance_iyzico_operations set
    state=p_outcome,payment_id=coalesce(v_evidence.payment_id,payment_id),
    payment_transaction_id=coalesce(v_evidence.payment_transaction_id,payment_transaction_id),
    host_reference=v_evidence.host_reference,provider_phase=v_evidence.provider_phase,
    signature_verified=true,retryable=false,error_code=v_evidence.error_code,
    resolution_evidence_operation_id=p_evidence_operation_id,
    revision=revision+1,updated_at=clock_timestamp()
  where id=v_original.id returning * into v_original;
  return public.finance_iyzico_operation_json(v_original);
end
$$;

-- Applies only a finalized, verified provider result to the existing Stage 12
-- intent, transaction and ledger model. Raw provider responses are never stored.
create or replace function public.finance_apply_iyzico_operation(
  p_intent_id uuid,p_operation_id text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_intent public.finance_payment_intents%rowtype;
  v_operation public.finance_iyzico_operations%rowtype;
  v_transaction public.finance_transactions%rowtype;
  v_transaction_operation text;
  v_transaction_status text;
  v_transaction_amount numeric;
  v_new_refunded numeric;
begin
  select * into v_intent from public.finance_payment_intents
  where id=p_intent_id for update;
  if not found then raise exception 'Finance intent not found'; end if;
  select * into v_operation from public.finance_iyzico_operations
  where intent_id=p_intent_id and operation_id=p_operation_id for update;
  if not found or v_intent.provider<>'iyzico' or v_intent.environment<>'sandbox'
     or v_operation.state not in ('succeeded','declined')
     or not v_operation.signature_verified or v_operation.operation='retrieve' then
    raise exception 'Verified terminal iyzico operation required';
  end if;

  v_transaction_operation:=case when v_operation.operation='cancel' then 'void'
    else v_operation.operation end;
  select * into v_transaction from public.finance_transactions
  where intent_id=v_intent.id and operation=v_transaction_operation
    and idempotency_key='iyzico:'||v_operation.operation_id;
  if found then
    return jsonb_build_object(
      'intentId',v_intent.id,'intentStatus',v_intent.status,
      'transactionId',v_transaction.id,'idempotentReplay',true
    );
  end if;

  if v_operation.operation='authorize' then
    if v_operation.state='succeeded' and v_operation.provider_phase='PRE_AUTH'
       and v_intent.status in ('pending_authorization','authorization_failed','requires_review') then
      update public.finance_payment_intents set
        status='authorized',authorized_amount=amount,authorized_at=coalesce(authorized_at,now()),
        provider_reference=coalesce(provider_reference,v_operation.payment_id)
      where id=v_intent.id returning * into v_intent;
      v_transaction_status:='succeeded';v_transaction_amount:=v_intent.amount;
    elsif v_operation.state='declined'
       and v_intent.status in ('pending_authorization','authorization_failed') then
      update public.finance_payment_intents set status='authorization_failed'
      where id=v_intent.id returning * into v_intent;
      v_transaction_status:='failed';v_transaction_amount:=0;
    else raise exception 'Iyzico authorization state mismatch';
    end if;
  elsif v_operation.operation='capture' then
    if v_operation.state='succeeded' and v_operation.provider_phase='POST_AUTH'
       and v_intent.status in ('authorized','capture_failed','requires_review')
       and exists(select 1 from public.service_jobs
         where id=v_operation.job_id and service_request_id=v_intent.service_request_id
           and status='completed') then
      update public.finance_payment_intents set
        status='captured',captured_amount=amount,captured_at=now()
      where id=v_intent.id returning * into v_intent;
      v_transaction_status:='succeeded';v_transaction_amount:=v_intent.amount;
    elsif v_operation.state='declined' and v_intent.status in ('authorized','capture_failed') then
      update public.finance_payment_intents set status='capture_failed'
      where id=v_intent.id returning * into v_intent;
      v_transaction_status:='failed';v_transaction_amount:=0;
    else raise exception 'Iyzico capture state mismatch';
    end if;
  elsif v_operation.operation='cancel' then
    if v_operation.state<>'succeeded'
       or v_intent.status not in ('authorized','capture_failed','requires_review') then
      raise exception 'Iyzico cancellation state mismatch';
    end if;
    update public.finance_payment_intents set status='voided',voided_at=now()
    where id=v_intent.id returning * into v_intent;
    v_transaction_status:='succeeded';v_transaction_amount:=v_intent.authorized_amount;
  elsif v_operation.operation='refund' then
    if v_operation.state<>'succeeded'
       or v_intent.status not in ('captured','partially_refunded')
       or v_operation.amount>v_intent.captured_amount-v_intent.refunded_amount then
      raise exception 'Iyzico refund state mismatch';
    end if;
    v_new_refunded:=v_intent.refunded_amount+v_operation.amount;
    update public.finance_payment_intents set
      status=case when v_new_refunded=captured_amount then 'refunded'
        else 'partially_refunded' end,
      refunded_amount=v_new_refunded,refunded_at=now()
    where id=v_intent.id returning * into v_intent;
    v_transaction_status:='succeeded';v_transaction_amount:=v_operation.amount;
  end if;

  insert into public.finance_transactions(
    intent_id,service_request_id,operation,status,amount,currency,idempotency_key,
    provider_reference,error_code,metadata
  ) values(
    v_intent.id,v_intent.service_request_id,v_transaction_operation,
    v_transaction_status,v_transaction_amount,v_intent.currency,
    'iyzico:'||v_operation.operation_id,v_operation.payment_id,v_operation.error_code,
    jsonb_strip_nulls(jsonb_build_object(
      'providerOperationId',v_operation.operation_id,
      'paymentTransactionId',v_operation.payment_transaction_id,
      'hostReference',v_operation.host_reference,'jobId',v_operation.job_id
    ))
  ) returning * into v_transaction;

  if v_operation.operation='capture' and v_transaction.status='succeeded' then
    insert into public.finance_ledger_entries(
      transaction_id,intent_id,service_request_id,account,direction,amount,currency
    ) values
      (v_transaction.id,v_intent.id,v_intent.service_request_id,
       'provider_clearing','debit',v_transaction.amount,v_transaction.currency),
      (v_transaction.id,v_intent.id,v_intent.service_request_id,
       'service_settlement','credit',v_transaction.amount,v_transaction.currency);
  elsif v_operation.operation='refund' and v_transaction.status='succeeded' then
    insert into public.finance_ledger_entries(
      transaction_id,intent_id,service_request_id,account,direction,amount,currency
    ) values
      (v_transaction.id,v_intent.id,v_intent.service_request_id,
       'service_settlement','debit',v_transaction.amount,v_transaction.currency),
      (v_transaction.id,v_intent.id,v_intent.service_request_id,
       'provider_clearing','credit',v_transaction.amount,v_transaction.currency);
  end if;

  insert into public.operational_events(
    service_request_id,job_id,event_type,entity_type,entity_id,payload
  ) values(
    v_intent.service_request_id,v_operation.job_id,
    'finance.iyzico_'||v_operation.operation||'_'||v_operation.state,
    'finance_transaction',v_transaction.id,
    jsonb_build_object('intent_id',v_intent.id,'operation_id',v_operation.operation_id)
  );
  return jsonb_build_object(
    'intentId',v_intent.id,'intentStatus',v_intent.status,
    'transactionId',v_transaction.id,'idempotentReplay',false
  );
end
$$;

create or replace function public.finance_release_iyzico_sandbox_request(
  p_request_id uuid,p_operation_id text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_config public.finance_runtime_config%rowtype;
  v_request public.service_requests%rowtype;
  v_intent public.finance_payment_intents%rowtype;
  v_operation public.finance_iyzico_operations%rowtype;
  v_cycle_id uuid;
  v_guard boolean;
begin
  select * into v_config from public.finance_runtime_config where id=1;
  if not found or not v_config.iyzico_sandbox_enabled
     or v_config.gate_mode<>'test_only' or v_config.provider<>'iyzico'
     or v_config.environment<>'sandbox' then
    raise exception 'Iyzico Sandbox integration is disabled';
  end if;
  select * into v_request from public.service_requests
  where id=p_request_id for update;
  if not found then raise exception 'Service request not found'; end if;
  select * into v_intent from public.finance_payment_intents
  where service_request_id=p_request_id and purpose='initial' for update;
  if not found then raise exception 'Finance intent not found'; end if;
  select * into v_operation from public.finance_iyzico_operations
  where operation_id=p_operation_id and intent_id=v_intent.id;
  if not found or v_intent.provider<>'iyzico' or v_intent.environment<>'sandbox'
     or v_intent.status<>'authorized' or v_operation.operation<>'authorize'
     or v_operation.state<>'succeeded' or not v_operation.signature_verified
     or v_operation.provider_phase<>'PRE_AUTH'
     or not exists(select 1 from public.users where id=v_request.customer_id
       and role='customer' and is_active and is_test) then
    raise exception 'Verified iyzico authorization required';
  end if;
  v_guard:=public.finance_assert_distribution_ready(v_request.id,v_intent.quote_id);
  v_cycle_id:=public.start_service_distribution_cycle(
    v_request.id,v_intent.quote_id,null);
  update public.finance_reconciliation_issues set
    status='resolved',resolved_at=now()
  where intent_id=v_intent.id and status='open'
    and code in ('iyzico_distribution_release_failed','iyzico_distribution_release_unconfirmed');
  return jsonb_build_object(
    'requestId',v_request.id,'intentId',v_intent.id,
    'distributionStarted',true,'distributionCycleId',v_cycle_id
  );
end
$$;

revoke all on function public.finance_iyzico_operation_json(public.finance_iyzico_operations),
  public.finance_iyzico_integration_status(),
  public.finance_iyzico_intent_context(uuid,uuid),
  public.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text),
  public.finance_iyzico_get_operation(text),
  public.finance_iyzico_finalize_operation(text,uuid,text,text,text,text,text,boolean,boolean,text),
  public.finance_iyzico_mark_interrupted_unknown(text,integer,text),
  public.finance_iyzico_resolve_unknown(text,integer,text,text),
  public.finance_apply_iyzico_operation(uuid,text),
  public.finance_release_iyzico_sandbox_request(uuid,text)
from public,anon,authenticated;

revoke all on function public.finance_iyzico_operation_json(public.finance_iyzico_operations)
from service_role;
grant execute on function public.finance_iyzico_integration_status(),
  public.finance_iyzico_intent_context(uuid,uuid),
  public.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text),
  public.finance_iyzico_get_operation(text),
  public.finance_iyzico_finalize_operation(text,uuid,text,text,text,text,text,boolean,boolean,text),
  public.finance_iyzico_mark_interrupted_unknown(text,integer,text),
  public.finance_iyzico_resolve_unknown(text,integer,text,text),
  public.finance_apply_iyzico_operation(uuid,text),
  public.finance_release_iyzico_sandbox_request(uuid,text)
to service_role;

comment on table public.finance_iyzico_operations is
  'Unapplied Stage 12 draft: normalized iyzico Sandbox operation journal; never stores PAN/CVC or raw provider payloads.';
comment on column public.finance_runtime_config.iyzico_sandbox_enabled is
  'Fail-closed switch. This migration leaves iyzico Sandbox disabled.';

-- Activation boundary (deliberately not crossed here):
-- * create_payment_pending_service_request_v2 still creates fake intents only;
-- * capture_finance_on_job_completion still executes the fake provider path;
-- * settle_finance_on_request_terminal still blocks non-fake settlement.
-- Provider-aware replacements require a separate reviewed activation migration
-- and application-route wiring after this draft is accepted.

commit;
