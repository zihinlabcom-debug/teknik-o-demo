begin;
create function public.t103_finance_plan(p_id uuid)returns jsonb language sql stable security definer set search_path=''as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'intentId',p.intent_id,'operation',p.operation,'amount',p.amount::text,'authorizationAmount',p.authorization_amount::text,'state',p.state,'operationId',p.provider_operation_id,'provider',i.provider)order by(i.purpose='initial')desc,i.created_at,i.id),'[]'::jsonb)from public.t103_finance_parts p join public.finance_payment_intents i on i.id=p.intent_id where p.finalization_id=p_id
$$;
create function public.t103_claim_part(p_id uuid,p_parent_reservation uuid)returns jsonb language plpgsql security definer set search_path=''as $$
declare p public.t103_finance_parts%rowtype;f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;
begin
 select f0.*into f from public.t100_finalizations f0 join public.t103_finance_parts x on x.finalization_id=f0.id where x.id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select *into f from public.t100_finalizations where id=f.id for update;
 select *into p from public.t103_finance_parts where id=p_id for update;
 if f.id is null or f.state<>'running'or f.reservation is distinct from p_parent_reservation then raise exception 'T103 parent reservation mismatch';end if;
 if p.state<>'pending'then return jsonb_build_object('claimed',false,'state',p.state);end if;
 select *into i from public.finance_payment_intents where id=p.intent_id for update;
 update public.t103_finance_parts set state='running',reservation=gen_random_uuid(),reserved_at=clock_timestamp()where id=p_id returning*into p;
 return jsonb_build_object('claimed',true,'reservation',p.reservation,'parentId',f.id,'requestId',f.service_request_id,'jobId',f.job_id,'customerId',i.customer_id,'intentId',i.id,'intentStatus',i.status,'provider',i.provider,'operation',p.operation,'amount',p.amount::text,'authorizationAmount',p.authorization_amount::text,'paymentId',i.provider_reference);
end $$;
create function public.t103_bind_part_operation(p_id uuid,p_reservation uuid,p_operation_id text)returns void language plpgsql security definer set search_path=''as $$
declare p public.t103_finance_parts%rowtype;req uuid;
begin
 select f.service_request_id into req from public.t100_finalizations f join public.t103_finance_parts x on x.finalization_id=f.id where x.id=p_id;
 perform 1 from public.service_requests where id=req for update;
 select*into p from public.t103_finance_parts where id=p_id for update;
 if p.state<>'running'or p.reservation is distinct from p_reservation or p_operation_id is null or p_operation_id!~'^[A-Za-z0-9:_-]{8,128}$'or(p.provider_operation_id is not null and p.provider_operation_id<>p_operation_id)then raise exception 'T103 part reservation identity mismatch';end if;
 update public.t103_finance_parts set provider_operation_id=p_operation_id where id=p_id;
end $$;
create function public.t103_part_context(p_id uuid,p_customer_id uuid)returns jsonb language plpgsql stable security definer set search_path=''as $$
declare p public.t103_finance_parts%rowtype;i public.finance_payment_intents%rowtype;f public.t100_finalizations%rowtype;
begin
 select*into p from public.t103_finance_parts where id=p_id;select*into i from public.finance_payment_intents where id=p.intent_id;select*into f from public.t100_finalizations where id=p.finalization_id;
 if i.customer_id is distinct from p_customer_id or p.state<>'running'or f.state<>'running'or p.operation<>'capture'then raise exception 'T103 part context forbidden';end if;
 return jsonb_build_object('amount',p.amount::text,'jobId',f.job_id,'intentId',i.id,'key',p.id::text);
end $$;
create function t100_private.t103_refresh_parent(p_id uuid)returns text language plpgsql security definer set search_path=''as $$
declare result text;
begin
 if not exists(select 1 from public.t103_finance_parts where finalization_id=p_id and state<>'verified')then perform t100_private.commit_verified_finalization(p_id);return'verified';end if;
 select case when bool_or(state='unknown')then'unknown'when bool_or(state='failed')then'failed'when bool_or(state='blocked')then'blocked'else'running'end into result from public.t103_finance_parts where finalization_id=p_id;
 update public.t100_finalizations set state=result where id=p_id;
 return result;
end $$;
create function public.t103_record_part_result(p_id uuid,p_reservation uuid,p_operation_id text,p_outcome text)returns text language plpgsql security definer set search_path=''as $$
declare p public.t103_finance_parts%rowtype;f public.t100_finalizations%rowtype;o public.finance_iyzico_operations%rowtype;i public.finance_payment_intents%rowtype;result text;
begin
 select f0.*into f from public.t100_finalizations f0 join public.t103_finance_parts x on x.finalization_id=f0.id where x.id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select*into f from public.t100_finalizations where id=f.id for update;
 select*into p from public.t103_finance_parts where id=p_id for update;
 if p.id is null or p.provider_operation_id is distinct from p_operation_id then raise exception 'T103 part identity mismatch';end if;
 if p.state='verified'then return'verified';end if;
 if p.state<>'running'or p.reservation is distinct from p_reservation or p.provider_operation_id is distinct from p_operation_id then raise exception 'T103 part reservation identity mismatch';end if;
 select*into o from public.finance_iyzico_operations where operation_id=p_operation_id and intent_id=p.intent_id;
 if p_outcome='unknown'then update public.t103_finance_parts set state='unknown'where id=p_id;
 elsif p_outcome='declined'and o.state='declined'and o.signature_verified then update public.t103_finance_parts set state='failed'where id=p_id;
 elsif p_outcome='succeeded'and o.state='succeeded'and o.signature_verified and o.operation=p.operation and o.amount=p.amount and exists(select 1 from public.finance_transactions where intent_id=p.intent_id and idempotency_key='iyzico:'||o.operation_id and status='succeeded')then
  select*into i from public.finance_payment_intents where id=p.intent_id;
  result:=case when p.operation='capture'and f.action='cancel'and p.authorization_amount>p.amount and not p.remaining_authorization_verified then'blocked'else'verified'end;
  if p.operation='capture'and(i.captured_amount<>p.amount or i.refunded_amount<>0)or p.operation='refund'and i.refunded_amount<>i.captured_amount or p.operation='cancel'and i.status<>'voided'then raise exception 'T103 core financial evidence mismatch';end if;
  update public.t103_finance_parts set state=result,verified_at=case when result='verified'then clock_timestamp()else null end where id=p_id;
 else raise exception 'T103 provider evidence required';end if;
 return t100_private.t103_refresh_parent(f.id);
end $$;
create function public.t103_finalize_noop_part(p_id uuid,p_reservation uuid)returns text language plpgsql security definer set search_path=''as $$
declare p public.t103_finance_parts%rowtype;f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;
begin
 select f0.*into f from public.t100_finalizations f0 join public.t103_finance_parts x on x.finalization_id=f0.id where x.id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select*into f from public.t100_finalizations where id=f.id for update;select*into p from public.t103_finance_parts where id=p_id for update;
 if p.state<>'running'or p.reservation is distinct from p_reservation or p.operation<>'no_op'then raise exception 'T103 no-op reservation mismatch';end if;
 select*into i from public.finance_payment_intents where id=p.intent_id for update;
 if exists(select 1 from public.finance_iyzico_operations where intent_id=i.id and operation in('authorize','capture','cancel','refund')and state<>'declined')or i.authorized_amount>0 and i.status not in('voided','refunded')then
  update public.t103_finance_parts set state='blocked'where id=p_id;return t100_private.t103_refresh_parent(f.id);
 end if;
 if i.status in('pending_authorization','authorization_failed')then update public.finance_payment_intents set status='cancelled'where id=i.id;
 elsif i.status not in('cancelled','voided','refunded')then raise exception 'T103 no-op evidence required';end if;
 update public.t103_finance_parts set state='verified',verified_at=clock_timestamp()where id=p_id;return t100_private.t103_refresh_parent(f.id);
end $$;
create or replace function t100_private.fee_scope(p_intent uuid,p_amount numeric)returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from public.t100_finalizations f join public.finance_payment_intents i on i.id=f.intent_id where not f.multi_payment and f.intent_id=p_intent and f.action='cancel'and f.amount>0 and f.amount=p_amount and f.amount=least(100,i.amount)and i.provider='iyzico'and i.environment='sandbox'and f.state in('running','unknown','blocked'))
 or exists(select 1 from public.t103_finance_parts p join public.t100_finalizations f on f.id=p.finalization_id where p.intent_id=p_intent and p.operation='capture'and p.amount=p_amount and f.action='cancel'and p.state in('running','unknown','blocked'))
$$;
alter function public.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text)set schema t100_private;
alter function t100_private.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text)rename to pre_t103_claim;
-- The existing journal admission body is reused below, after multi-part reservation checks.

create or replace function t100_private.t103_claim_core(
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
     and p_amount is distinct from v_intent.amount
 and not (p_operation in ('capture','retrieve') and t100_private.fee_scope(p_intent_id,p_amount)) then
    raise exception 'Iyzico operation amount mismatch';
  end if;
  if p_operation='refund'
     and (v_intent.status not in ('captured','partially_refunded')
       or p_amount>v_intent.captured_amount-v_intent.refunded_amount) then
    raise exception 'Iyzico refund exceeds captured balance';
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

create function public.finance_iyzico_claim_operation(
  p_intent_id uuid,p_service_request_id uuid,p_customer_id uuid,p_job_id uuid,
  p_operation text,p_operation_id text,p_business_operation_key text,
  p_conversation_id text,p_fingerprint text,p_amount numeric,p_currency text,
  p_basket_id text,p_payment_id text,p_payment_transaction_id text,
  p_payment_conversation_id text
)returns jsonb language plpgsql security definer set search_path=''as $$
declare f public.t100_finalizations%rowtype;p public.t103_finance_parts%rowtype;i public.finance_payment_intents%rowtype;
begin
 perform 1 from public.service_requests where id=p_service_request_id for update;
 if not public.t103_is_multi(p_service_request_id)then return t100_private.pre_t103_claim(p_intent_id,p_service_request_id,p_customer_id,p_job_id,p_operation,p_operation_id,p_business_operation_key,p_conversation_id,p_fingerprint,p_amount,p_currency,p_basket_id,p_payment_id,p_payment_transaction_id,p_payment_conversation_id);end if;
 select*into i from public.finance_payment_intents where id=p_intent_id;
 select*into f from public.t100_finalizations where service_request_id=p_service_request_id for update;
 if p_operation='authorize'then
  if exists(select 1 from public.finance_iyzico_operations where intent_id=p_intent_id and operation='authorize'and operation_id<>p_operation_id)then raise exception 'T103 authorization attempt identity conflict';end if;
  if(f.id is not null or i.status<>'pending_authorization')and not exists(select 1 from public.finance_iyzico_operations where intent_id=p_intent_id and operation='authorize'and operation_id=p_operation_id)then raise exception 'T103 authorization reserved or previous result unresolved';end if;
 elsif p_operation in('capture','cancel','refund')then
  select*into p from public.t103_finance_parts where finalization_id=f.id and intent_id=p_intent_id;
  if f.state<>'running'or f.reservation is null or p.state<>'running'or p.reservation is null or p.provider_operation_id is distinct from p_operation_id or p.operation is distinct from p_operation or p.amount is distinct from p_amount then raise exception 'T103 financial part reservation mismatch';end if;
  if i.provider_reference is null or p_payment_id is distinct from i.provider_reference then raise exception 'T103 provider payment identity mismatch';end if;
  if f.job_id is distinct from p_job_id or p_operation='capture'and f.action<>'cancel'and not exists(select 1 from public.service_jobs where id=p_job_id and service_request_id=p_service_request_id and status='completed')then raise exception 'T103 capture job mismatch';end if;
 end if;
 if p_operation<>'retrieve'and exists(select 1 from public.finance_iyzico_operations where intent_id=p_intent_id and operation in('authorize','capture','cancel','refund')and state in('in_flight','unknown')and operation_id<>p_operation_id)then raise exception 'T103 previous financial result uncertain';end if;
 return t100_private.t103_claim_core(p_intent_id,p_service_request_id,p_customer_id,p_job_id,p_operation,p_operation_id,p_business_operation_key,p_conversation_id,p_fingerprint,p_amount,p_currency,p_basket_id,p_payment_id,p_payment_transaction_id,p_payment_conversation_id);
end $$;
alter function public.finance_apply_iyzico_operation(uuid,text)set schema t100_private;
alter function t100_private.finance_apply_iyzico_operation(uuid,text)rename to pre_t103_apply;
create function public.finance_apply_iyzico_operation(p_intent_id uuid,p_operation_id text)returns jsonb language plpgsql security definer set search_path=''as $$
declare f public.t100_finalizations%rowtype;p public.t103_finance_parts%rowtype;i public.finance_payment_intents%rowtype;o public.finance_iyzico_operations%rowtype;tx uuid;
begin
 select*into i from public.finance_payment_intents where id=p_intent_id;
 perform 1 from public.service_requests where id=i.service_request_id for update;
 select*into f from public.t100_finalizations where service_request_id=i.service_request_id for update;
 if f.id is null or not f.multi_payment then return t100_private.pre_t103_apply(p_intent_id,p_operation_id);end if;
 select*into o from public.finance_iyzico_operations where intent_id=p_intent_id and operation_id=p_operation_id for update;
 select*into p from public.t103_finance_parts where finalization_id=f.id and intent_id=p_intent_id for update;
 if p.provider_operation_id is distinct from p_operation_id or o.operation is distinct from p.operation or o.amount is distinct from p.amount then raise exception 'T103 financial evidence identity mismatch';end if;
 if exists(select 1 from public.finance_transactions where intent_id=p_intent_id and idempotency_key='iyzico:'||p_operation_id)then return t100_private.legacy_apply_iyzico(p_intent_id,p_operation_id);end if;
 if p.state<>'running'or f.state<>'running'or o.state not in('succeeded','declined')or o.signature_verified is not true then raise exception 'T103 financial evidence not verified or reserved';end if;
 if f.action='cancel'and p.operation='capture'and o.state='succeeded'then
  select*into i from public.finance_payment_intents where id=p_intent_id for update;
  if i.status not in('authorized','capture_failed')or i.captured_amount<>0 or p.amount>i.authorized_amount or o.provider_phase<>'POST_AUTH'then raise exception 'T103 cancellation capture mismatch';end if;
  insert into public.finance_transactions(intent_id,service_request_id,operation,status,amount,currency,idempotency_key,provider_reference,metadata)
  values(i.id,i.service_request_id,'capture','succeeded',p.amount,i.currency,'iyzico:'||o.operation_id,o.payment_id,jsonb_build_object('purpose','cancellation_fee','partId',p.id,'jobId',f.job_id))returning id into tx;
  insert into public.finance_ledger_entries(transaction_id,intent_id,service_request_id,account,direction,amount,currency)values(tx,i.id,i.service_request_id,'provider_clearing','debit',p.amount,i.currency),(tx,i.id,i.service_request_id,'platform_cancellation_revenue','credit',p.amount,i.currency);
  update public.finance_payment_intents set status='captured',captured_amount=p.amount,captured_at=now()where id=i.id;
  return jsonb_build_object('intentId',i.id,'transactionId',tx,'intentStatus','captured');
 end if;
 return t100_private.legacy_apply_iyzico(p_intent_id,p_operation_id);
end $$;
create function public.t103_recover_part(p_id uuid,p_admin_id uuid,p_operation_id text)returns text language plpgsql security definer set search_path=''as $$
declare p public.t103_finance_parts%rowtype;f public.t100_finalizations%rowtype;o public.finance_iyzico_operations%rowtype;result text;
begin
 perform t100_private.assert_actor(p_admin_id,'admin');
 select f0.*into f from public.t100_finalizations f0 join public.t103_finance_parts x on x.finalization_id=f0.id where x.id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select*into f from public.t100_finalizations where id=f.id for update;
 select*into p from public.t103_finance_parts where id=p_id for update;
 if p.id is null or p.provider_operation_id is null or p.provider_operation_id is distinct from p_operation_id then raise exception 'T103 recovery identity mismatch';end if;
 if p.state='verified'then return'verified';end if;
 if p.state='running'and p.reserved_at>clock_timestamp()-interval '10 minutes'then return'running';end if;
 if p.state not in('unknown','blocked','failed','running')then raise exception 'T103 recovery not available';end if;
 select*into o from public.finance_iyzico_operations where intent_id=p.intent_id and operation_id=p_operation_id;
 if o.id is null or o.state not in('succeeded','declined')or o.signature_verified is not true then raise exception 'T103 verified provider evidence required';end if;
 update public.t100_finalizations set state='running',reserved_at=clock_timestamp()where id=f.id;
 update public.t103_finance_parts set state='running',reserved_at=clock_timestamp(),reservation=coalesce(reservation,gen_random_uuid())where id=p_id returning*into p;
 perform public.finance_apply_iyzico_operation(p.intent_id,p_operation_id);
 result:=public.t103_record_part_result(p.id,p.reservation,p_operation_id,o.state);
 if result='running'then update public.t100_finalizations set state='blocked'where id=f.id;result:='blocked';end if;
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)values(f.service_request_id,f.job_id,p_admin_id,'finance.t103_recovered','t103_finance_part',p.id,jsonb_build_object('state',result,'providerMutation',false));
 return result;
end $$;
alter function public.t100_expire_finance_reservations()set schema t100_private;
alter function t100_private.t100_expire_finance_reservations()rename to pre_t103_expire_finance;
create function public.t100_expire_finance_reservations()returns integer language plpgsql security definer set search_path=''as $$
declare total integer;
begin
 update public.t103_finance_parts set state='unknown'where state='running'and reserved_at<clock_timestamp()-interval '10 minutes';
 get diagnostics total=row_count;
 return total+t100_private.pre_t103_expire_finance();
end $$;
create function t100_private.t103_funding_ready()returns trigger language plpgsql security definer set search_path=''as $$
begin
 if new.purpose='additional'and new.status='authorized'and exists(select 1 from public.users where id=new.customer_id and is_active)and not exists(select 1 from public.t100_finalizations where service_request_id=new.service_request_id)and not exists(select 1 from public.t100_reviews where service_request_id=new.service_request_id and status='open')and coalesce((public.t103_funding_state(new.service_request_id,new.customer_id)->>'fullySecured')::boolean,false)then
  update public.t100_completion_reports set prepare_blocked=false,prepare_next_at=null,prepare_error_code=null where service_request_id=new.service_request_id and voided_at is null and prepare_error_code='price_authorization_mismatch';
 end if;return null;
end $$;
create constraint trigger t103_funding_ready after update on public.finance_payment_intents deferrable initially deferred for each row execute function t100_private.t103_funding_ready();
-- Funding holds use the existing complaint/review system, without cancellation or penalties.
alter table public.t100_reviews drop constraint t100_reviews_purpose_check;
alter table public.t100_reviews add constraint t100_reviews_purpose_check check(purpose in('cancellation_review','completion_review','funding_review'));
create function public.t103_open_funding_review(p_cost_id uuid,p_technician_id uuid)returns uuid language plpgsql security definer set search_path=''as $$
declare a public.service_additional_cost_requests%rowtype;r public.service_requests%rowtype;j public.service_jobs%rowtype;v public.t100_reviews%rowtype;case_id uuid;
begin
 perform t100_private.assert_actor(p_technician_id,'technician');
 select*into a from public.service_additional_cost_requests where id=p_cost_id;
 select*into r from public.service_requests where id=a.service_request_id for update;
 select*into j from public.service_jobs where service_request_id=r.id and technician_id=p_technician_id and status in('assigned','in_progress')for update;
 if j.id is null or a.status<>'customer_accepted'then raise exception 'T103 funding review forbidden';end if;
 if exists(select 1 from public.t100_finalizations where service_request_id=r.id)or(public.t103_funding_state(r.id,p_technician_id)->>'fullySecured')::boolean then raise exception 'T103 funding review not available';end if;
 select*into v from public.t100_reviews where service_request_id=r.id for update;
 if v.complaint_id is not null then return v.complaint_id;end if;
 insert into public.t100_reviews(service_request_id,job_id,customer_id,purpose)values(r.id,j.id,r.customer_id,'funding_review')on conflict(service_request_id)do nothing;
 case_id:=public.stage10_create_complaint(r.id,p_technician_id,'Ek hizmetin ödeme güvencesi doğrulanmadı. Gerçekleştirilmiş iş korunarak finansal inceleme isteniyor.','t103-funding:'||a.id::text,'[]');
 update public.t100_reviews set complaint_id=case_id where service_request_id=r.id;
 return case_id;
end $$;
alter function public.t100_request_state(uuid,uuid)set schema t100_private;
alter function t100_private.t100_request_state(uuid,uuid)rename to pre_t103_request_state;
create function public.t100_request_state(p_request_id uuid,p_actor_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$
begin return t100_private.pre_t103_request_state(p_request_id,p_actor_id)||jsonb_build_object('funding',public.t103_funding_state(p_request_id,p_actor_id));end $$;

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
    and environment='sandbox' and purpose in ('initial','additional') for share;
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

alter function public.finance_settle_terminal_request(uuid)set schema t100_private;
alter function t100_private.finance_settle_terminal_request(uuid)rename to pre_t103_terminal_settle;
create function public.finance_settle_terminal_request(p_request_id uuid)returns boolean language plpgsql security definer set search_path=''as $$
declare f public.t100_finalizations%rowtype;
begin
 perform 1 from public.service_requests where id=p_request_id for update;
 select*into f from public.t100_finalizations where service_request_id=p_request_id for update;
 if f.multi_payment then
  if f.state<>'verified'or f.action not in('cancel','refund')then raise exception 'T103 financial resolution reserved';end if;
  perform t100_private.t103_assert_finalization(f.id);return true;
 end if;
 return t100_private.pre_t103_terminal_settle(p_request_id);
end $$;

do $acl$ declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and(p.proname like 't103_%'or p.proname in('finance_iyzico_claim_operation','finance_apply_iyzico_operation','finance_iyzico_refund_context','t100_request_state','t100_expire_finance_reservations','finance_settle_terminal_request'))loop execute 'revoke all on function '||f.signature||' from public,anon,authenticated';execute 'grant execute on function '||f.signature||' to service_role';end loop;end $acl$;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
