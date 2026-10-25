begin;
alter table public.t100_finalizations add column remaining_authorization_verified boolean not null default false;
alter table public.finance_ledger_entries drop constraint finance_ledger_entries_account_check;
alter table public.finance_ledger_entries add constraint finance_ledger_entries_account_check
 check(account in ('provider_clearing','service_settlement','platform_cancellation_revenue'));

create function t100_private.commit_verified_finalization(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;minor bigint;share bigint;
begin
 select * into f from public.t100_finalizations where id=p_id for update;
 if not found then raise exception 'T100 finalization missing'; end if;
 if f.state='verified' then return; end if;
 select * into i from public.finance_payment_intents where id=f.intent_id for update;
 if f.action='distribute' then
  if i.id is null or i.status is distinct from 'captured' or i.captured_amount<>f.amount or i.refunded_amount<>0 then raise exception 'T100 capture not verified'; end if;
 elsif f.action='refund' or f.action='cancel' and f.amount=0 then
  if i.id is not null and i.status not in ('voided','cancelled','refunded') then raise exception 'T100 full return not verified'; end if;
 elsif f.action='cancel' then
  if i.id is null or i.status is distinct from 'captured' or i.captured_amount<>f.amount or i.refunded_amount<>0 then raise exception 'T100 fee not verified'; end if;
  if not f.remaining_authorization_verified then raise exception 'T100 remaining authorization not verified'; end if;
 end if;
 update public.t100_finalizations set state='verified',verified_at=clock_timestamp() where id=f.id;
 if f.action='distribute' or f.action='cancel' and f.amount>0 then
  minor:=round(f.amount*100)::bigint;
  share:=case when f.action='distribute' then round(minor*0.70)::bigint else 0 end;
  insert into public.t100_distribution_simulations(finalization_id,service_request_id,technician_id,total_minor,technician_minor,platform_minor,purpose)
  select f.id,f.service_request_id,case when f.action='distribute' then j.technician_id else null end,minor,share,minor-share,
  case when f.action='distribute' then 'service' else 'cancellation_fee' end
  from (select 1) x left join public.service_jobs j on j.id=f.job_id
  on conflict(finalization_id) do nothing;
 end if;
 if f.action in ('refund','cancel') then
  update public.service_appointments set status='cancelled' where job_id in(select id from public.service_jobs where service_request_id=f.service_request_id and status in ('assigned','in_progress')) and status in ('scheduled','confirmed');
  update public.service_jobs set status='cancelled',cancelled_at=clock_timestamp() where service_request_id=f.service_request_id and status in ('assigned','in_progress');
  update public.service_dispatches set status='cancelled',closed_at=clock_timestamp() where service_request_id=f.service_request_id and status in ('pending','broadcasting');
  update public.service_distribution_cycles set status='cancelled',closed_at=clock_timestamp(),next_round_at=null where service_request_id=f.service_request_id and status='active';
  update public.service_requests set status='cancelled' where id=f.service_request_id and status not in ('cancelled','completed','technician_unavailable');
  update public.t100_cancellations set state='completed' where finalization_id=f.id;
 end if;
 insert into public.operational_events(service_request_id,job_id,event_type,entity_type,entity_id,payload)
 values(f.service_request_id,f.job_id,'finance.t100_verified','t100_finalization',f.id,jsonb_build_object('action',f.action,'amount',f.amount,'distributionMode','simulation','bankTransfer',false));
end $$;

alter function public.finance_settle_terminal_request(uuid) set schema t100_private;
alter function t100_private.finance_settle_terminal_request(uuid) rename to legacy_settle_terminal;
create function public.finance_settle_terminal_request(p_request_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.t100_finalizations f join public.finance_payment_intents i on i.id=f.intent_id
 where f.service_request_id=p_request_id and f.state='verified' and f.action='cancel' and f.amount>0
 and f.remaining_authorization_verified and i.status='captured' and i.captured_amount=f.amount and i.refunded_amount=0)
 then return true; end if;
 return t100_private.legacy_settle_terminal(p_request_id);
end $$;
revoke all on function public.finance_settle_terminal_request(uuid) from public,anon,authenticated,service_role;

create function public.t100_process_fake_finalization(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;config public.finance_runtime_config%rowtype;tx uuid;
begin
 select service_request_id into f.service_request_id from public.t100_finalizations where id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select * into f from public.t100_finalizations where id=p_id for update;
 if not found then raise exception 'T100 not found'; end if;
 if f.state='verified' then return jsonb_build_object('id',f.id,'state',f.state); end if;
 if f.state<>'pending' then raise exception 'T100 finalization not pending'; end if;
 select * into i from public.finance_payment_intents where id=f.intent_id for update;
 select * into config from public.finance_runtime_config where id=1;
 if i.provider is distinct from 'fake' or i.environment is distinct from 'sandbox' or config.provider is distinct from 'fake'
 or config.environment is distinct from 'sandbox' or config.gate_mode is distinct from 'test_only'
 or not exists(select 1 from public.users where id=i.customer_id and is_test and is_active)
 then raise exception 'T100 fake provider test scope required'; end if;
 if f.action='cancel' and f.amount>0 then
  if i.status<>'authorized' or f.amount>least(100,i.amount) then raise exception 'T100 invalid fee state'; end if;
  insert into public.finance_transactions(intent_id,service_request_id,operation,status,amount,currency,idempotency_key,metadata)
  values(i.id,f.service_request_id,'capture','succeeded',f.amount,i.currency,'t100-fee:'||f.id::text,jsonb_build_object('purpose','cancellation_fee','provider','fake')) returning id into tx;
  insert into public.finance_ledger_entries(transaction_id,intent_id,service_request_id,account,direction,amount,currency)
  values(tx,i.id,f.service_request_id,'provider_clearing','debit',f.amount,i.currency),(tx,i.id,f.service_request_id,'platform_cancellation_revenue','credit',f.amount,i.currency);
  update public.finance_payment_intents set status='captured',captured_amount=f.amount,captured_at=clock_timestamp() where id=i.id;
  if i.authorized_amount>f.amount then
   insert into public.finance_transactions(intent_id,service_request_id,operation,status,amount,currency,idempotency_key,metadata)
   values(i.id,f.service_request_id,'void','succeeded',i.authorized_amount-f.amount,i.currency,'t100-unused:'||f.id::text,jsonb_build_object('provider','fake','unusedAuthorizationOnly',true));
  end if;
  update public.t100_finalizations set remaining_authorization_verified=true where id=f.id;
 elsif f.action in ('refund','cancel') then
  perform t100_private.legacy_settle_terminal(f.service_request_id);
 end if;
 perform t100_private.commit_verified_finalization(f.id);
 return jsonb_build_object('id',f.id,'state','verified','provider','fake','distributionMode','simulation');
end $$;

create function public.t100_claim_finalization(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;token uuid;
begin
 select service_request_id into f.service_request_id from public.t100_finalizations where id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select * into f from public.t100_finalizations where id=p_id for update;
 if not found then raise exception 'T100 not found'; end if;
 if f.state<>'pending' then return jsonb_build_object('claimed',false,'state',f.state); end if;
 select * into i from public.finance_payment_intents where id=f.intent_id;
 if i.id is null or i.provider<>'iyzico' or i.environment<>'sandbox' or
 not exists(select 1 from public.users where id=i.customer_id and is_test and is_active)
 then raise exception 'T100 verified Sandbox intent required'; end if;
 token:=gen_random_uuid();
 update public.t100_finalizations set state='running',reservation=token,reserved_at=clock_timestamp() where id=f.id;
 return jsonb_build_object('claimed',true,'reservation',token,'id',f.id,'requestId',f.service_request_id,'jobId',f.job_id,
 'intentId',i.id,'customerId',i.customer_id,'action',f.action,'amount',f.amount::text,'intentStatus',i.status);
end $$;

create function public.t100_cancellation_capture_context(p_id uuid,p_customer_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;
begin
 select f0.* into f from public.t100_finalizations f0 join public.finance_payment_intents i0 on i0.id=f0.intent_id
 where f0.id=p_id and i0.customer_id=p_customer_id and f0.state='running' and f0.action='cancel' and f0.amount>0;
 select * into i from public.finance_payment_intents where id=f.intent_id;
 if f.id is null or i.provider<>'iyzico' or i.environment<>'sandbox' or f.amount<>least(100,i.amount) or i.status<>'authorized'
 then raise exception 'T100 cancellation capture not eligible'; end if;
 return jsonb_build_object('amount',f.amount::text,'jobId',f.job_id,'intentId',i.id);
end $$;

create function public.t100_record_finance_result(p_id uuid,p_reservation uuid,p_operation_id text,p_outcome text) returns text
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;o public.finance_iyzico_operations%rowtype;
begin
 select service_request_id into f.service_request_id from public.t100_finalizations where id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select * into f from public.t100_finalizations where id=p_id for update;
 if f.state is distinct from 'running' or f.reservation is distinct from p_reservation then raise exception 'T100 reservation mismatch'; end if;
 if p_outcome not in ('succeeded','declined','unknown') or p_outcome is null then raise exception 'T100 invalid outcome'; end if;
 select * into o from public.finance_iyzico_operations where operation_id=p_operation_id and intent_id=f.intent_id;
 if p_outcome<>'succeeded' then
  update public.t100_finalizations set state=case when p_outcome='declined' and o.state='declined' then 'failed' else 'unknown' end,
   provider_operation_id=p_operation_id where id=f.id returning * into f;
  return f.state;
 end if;
 if o.id is null or o.state<>'succeeded' or o.provider<>'iyzico' or o.environment<>'sandbox'
 then raise exception 'T100 provider operation not verified'; end if;
 select * into i from public.finance_payment_intents where id=f.intent_id;
 if not exists(select 1 from public.finance_transactions where intent_id=i.id and idempotency_key='iyzico:'||p_operation_id and status in ('succeeded','no_op'))
 then raise exception 'T100 provider core result missing'; end if;
 if f.action='distribute' and (o.operation<>'capture' or o.amount<>f.amount or o.job_id is distinct from f.job_id)
 or f.action='refund' and o.operation not in ('cancel','refund')
 or f.action='cancel' and ((f.amount>0 and (o.operation<>'capture' or o.amount<>f.amount)) or (f.amount=0 and o.operation<>'cancel'))
 then raise exception 'T100 provider purpose mismatch'; end if;
 update public.t100_finalizations set provider_operation_id=p_operation_id where id=f.id;
 if f.action='cancel' and f.amount>0 then
  if i.authorized_amount>f.amount then
   update public.t100_finalizations set state='blocked' where id=f.id;
   return 'blocked'; -- No unverified claim about the unused bank authorization.
  end if;
  update public.t100_finalizations set remaining_authorization_verified=true where id=f.id;
 end if;
 perform t100_private.commit_verified_finalization(f.id);
 return 'verified';
end $$;

create function public.t100_expire_finance_reservations() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 update public.t100_finalizations set state='unknown' where state='running' and reserved_at<clock_timestamp()-interval '10 minutes';
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.t100_process_fake_finalization(uuid),public.t100_claim_finalization(uuid),
 public.t100_cancellation_capture_context(uuid,uuid),public.t100_record_finance_result(uuid,uuid,text,text),
 public.t100_expire_finance_reservations() from public,anon,authenticated;
grant execute on function public.t100_process_fake_finalization(uuid),public.t100_claim_finalization(uuid),
 public.t100_cancellation_capture_context(uuid,uuid),public.t100_record_finance_result(uuid,uuid,text,text),
 public.t100_expire_finance_reservations() to service_role;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
create function t100_private.fee_scope(p_intent uuid,p_amount numeric) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.t100_finalizations f join public.finance_payment_intents i on i.id=f.intent_id
 where f.intent_id=p_intent and f.action='cancel' and f.amount>0 and f.amount=p_amount and f.amount=least(100,i.amount)
 and i.provider='iyzico' and i.environment='sandbox' and f.state in ('running','unknown','blocked'))
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
  if p_operation<>'retrieve' and exists(select 1 from public.t100_finalizations f where f.intent_id=p_intent_id and (f.state<>'running' or f.reservation is null)) then raise exception 'T100 finance operation outside reserved purpose'; end if;
  if p_operation in ('authorize','capture','cancel','retrieve')
     and p_amount is distinct from v_intent.amount
 and not (p_operation in ('capture','retrieve') and t100_private.fee_scope(p_intent_id,p_amount)) then
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
    if not t100_private.fee_scope(p_intent_id,p_amount) or not exists(select 1 from public.t100_finalizations f where f.intent_id=p_intent_id and f.job_id=p_job_id and f.state='running') then
 raise exception 'Completed service job required before iyzico capture';
 end if;
  end if;
  if exists(select 1 from public.t100_finalizations f where f.intent_id=p_intent_id) and p_operation<>'retrieve' and not exists(select 1 from public.t100_finalizations f where f.intent_id=p_intent_id and f.state='running' and f.reservation is not null and ((p_operation='capture' and f.action='distribute' and f.job_id=p_job_id and f.amount=p_amount) or (p_operation='capture' and f.action='cancel' and f.job_id=p_job_id and f.amount=p_amount and f.amount>0) or (p_operation='cancel' and (f.action='refund' or f.action='cancel' and f.amount=0)) or (p_operation='refund' and f.action='refund' and f.amount=p_amount))) then raise exception 'T100 finance operation outside reserved purpose'; end if;
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
alter function public.finance_apply_iyzico_operation(uuid,text) set schema t100_private;
alter function t100_private.finance_apply_iyzico_operation(uuid,text) rename to legacy_apply_iyzico;
create function public.finance_apply_iyzico_operation(p_intent_id uuid,p_operation_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;o public.finance_iyzico_operations%rowtype;i public.finance_payment_intents%rowtype;tx uuid;
begin
 select * into f from public.t100_finalizations where intent_id=p_intent_id;
 select * into o from public.finance_iyzico_operations where intent_id=p_intent_id and operation_id=p_operation_id;
 if f.action='cancel' and f.amount>0 and o.operation='capture' then
  perform 1 from public.service_requests where id=f.service_request_id for update;
  select * into i from public.finance_payment_intents where id=p_intent_id for update;
  select id into tx from public.finance_transactions where intent_id=p_intent_id and idempotency_key='iyzico:'||p_operation_id and operation='capture';
  if found then return jsonb_build_object('transactionId',tx,'idempotentReplay',true); end if;
  if f.state<>'running' or f.reservation is null or o.job_id is distinct from f.job_id or o.state<>'succeeded' or
   not o.signature_verified or o.provider_phase<>'POST_AUTH' or o.amount<>f.amount or o.currency<>'TRY' or
   i.provider<>'iyzico' or i.environment<>'sandbox' or i.status<>'authorized' or not t100_private.fee_scope(i.id,o.amount)
  then raise exception 'T100 verified cancellation capture required'; end if;
  insert into public.finance_transactions(intent_id,service_request_id,operation,status,amount,currency,idempotency_key,provider_reference,metadata)
  values(i.id,i.service_request_id,'capture','succeeded',o.amount,'TRY','iyzico:'||o.operation_id,o.payment_id,jsonb_build_object('purpose','cancellation_fee','jobId',f.job_id)) returning id into tx;
  insert into public.finance_ledger_entries(transaction_id,intent_id,service_request_id,account,direction,amount,currency)
  values(tx,i.id,i.service_request_id,'provider_clearing','debit',o.amount,'TRY'),(tx,i.id,i.service_request_id,'platform_cancellation_revenue','credit',o.amount,'TRY');
  update public.finance_payment_intents set status='captured',captured_amount=o.amount,captured_at=clock_timestamp() where id=i.id;
  return jsonb_build_object('transactionId',tx,'intentStatus','captured','remainingAuthorizationVerified',false);
 end if;
 return t100_private.legacy_apply_iyzico(p_intent_id,p_operation_id);
end $$;
revoke all on function public.finance_apply_iyzico_operation(uuid,text) from public,anon,authenticated;
grant execute on function public.finance_apply_iyzico_operation(uuid,text) to service_role;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;

commit;
