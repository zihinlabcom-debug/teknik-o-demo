-- T103: one service finalization, independently verified payment parts. Local draft.
begin;
create function public.t103_is_multi(p_request_id uuid)returns boolean language sql stable security definer set search_path=''as $$select exists(select 1 from public.finance_payment_intents where service_request_id=p_request_id and purpose='additional')$$;
create function public.t103_make_parts(p_id uuid)returns void language plpgsql security definer set search_path=''as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;op text;part_amount numeric;fee_left numeric;
begin
 select service_request_id into f.service_request_id from public.t100_finalizations where id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select * into f from public.t100_finalizations where id=p_id for update;
 if f.id is null then raise exception 'T103 finalization missing';end if;
 if exists(select 1 from public.t103_finance_parts where finalization_id=f.id)then return;end if;
 fee_left:=case when f.action='cancel'then f.amount else 0 end;
 for i in select * from public.finance_payment_intents where service_request_id=f.service_request_id order by(purpose='initial')desc,created_at,id for update loop
  op:='no_op';part_amount:=0;
  if f.action='distribute'and i.status in('authorized','captured','capture_failed')then op:='capture';part_amount:=i.amount;
  elsif f.action='refund'and i.captured_amount>i.refunded_amount then op:='refund';part_amount:=i.captured_amount-i.refunded_amount;
  elsif f.action in('cancel','refund')and i.status in('authorized','capture_failed','requires_review')and i.authorized_amount>0 then
   if f.action='cancel'and fee_left>0 then op:='capture';part_amount:=least(fee_left,i.authorized_amount);fee_left:=fee_left-part_amount;
   else op:='cancel';part_amount:=i.authorized_amount;end if;
  elsif f.action='cancel'and i.captured_amount>i.refunded_amount then raise exception 'T103 captured balance requires financial review';
  end if;
  insert into public.t103_finance_parts(finalization_id,intent_id,operation,amount,authorization_amount)values(f.id,i.id,op,part_amount,i.authorized_amount);
 end loop;
 if fee_left>0 then raise exception 'T103 insufficient verified authorization for cancellation fee';end if;
 update public.t100_finalizations set multi_payment=true where id=f.id;
end $$;
create function t100_private.t103_assert_finalization(p_id uuid)returns void language plpgsql security definer set search_path=''as $$
declare f public.t100_finalizations%rowtype;paid numeric;
begin
 select * into f from public.t100_finalizations where id=p_id;
 if not exists(select 1 from public.t103_finance_parts where finalization_id=f.id)or exists(select 1 from public.t103_finance_parts where finalization_id=f.id and state<>'verified')then raise exception 'T103 all payment parts must be verified';end if;
 select coalesce(sum(i.captured_amount-i.refunded_amount),0)into paid from public.t103_finance_parts p join public.finance_payment_intents i on i.id=p.intent_id where p.finalization_id=f.id;
 if f.action='distribute'and(paid<>f.amount or f.amount<>public.t100_approved_total(f.service_request_id))then raise exception 'T103 aggregate approved capture mismatch';end if;
 if f.action='refund'and paid<>0 then raise exception 'T103 full return incomplete';end if;
 if f.action='cancel'and(paid<>f.amount or exists(select 1 from public.t103_finance_parts where finalization_id=f.id and operation='capture'and authorization_amount>amount and not remaining_authorization_verified))then raise exception 'T103 remaining authorization not verified';end if;
 if f.action='cancel'then update public.t100_finalizations set remaining_authorization_verified=true where id=f.id;end if;
end $$;
alter function public.t100_prepare_finalization(uuid)set schema t100_private;
alter function t100_private.t100_prepare_finalization(uuid)rename to pre_t103_prepare;
alter function public.t100_customer_cancel(uuid,uuid,text,text)set schema t100_private;
alter function t100_private.t100_customer_cancel(uuid,uuid,text,text)rename to pre_t103_customer_cancel;
create function public.t100_customer_cancel(p_request_id uuid,p_customer_id uuid,p_version text,p_reason text)returns jsonb language plpgsql security definer set search_path=''as $$
declare result jsonb;
begin
 if not public.t103_is_multi(p_request_id)then return t100_private.pre_t103_customer_cancel(p_request_id,p_customer_id,p_version,p_reason);end if;
 result:=t100_private.pre_t102_customer_cancel(p_request_id,p_customer_id,p_version,p_reason);
 perform public.t103_make_parts((result->>'finalization_id')::uuid);return result;
end $$;
alter function public.t100_admin_finance_decision(uuid,uuid,text)set schema t100_private;
alter function t100_private.t100_admin_finance_decision(uuid,uuid,text)rename to pre_t103_admin_decision;
-- Generated below: existing guarded prepare/admin/commit implementations with narrow multi-payment branches.

create function public.t100_prepare_finalization(p_job_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.t100_completion_reports%rowtype;j public.service_jobs%rowtype;
 q public.service_quotes%rowtype;i public.finance_payment_intents%rowtype;f public.t100_finalizations%rowtype;
begin
 if not public.t103_is_multi((select service_request_id from public.service_jobs where id=p_job_id))then return t100_private.pre_t103_prepare(p_job_id);end if;
 select service_request_id into j.service_request_id from public.service_jobs where id=p_job_id;
 perform 1 from public.service_requests where id=j.service_request_id for update;
 select * into j from public.service_jobs where id=p_job_id for update;
 select * into r from public.t100_completion_reports where job_id=p_job_id for update;
 if not found or r.voided_at is not null or r.resolution is null then raise exception 'T100 completion decision required'; end if;
 if exists(select 1 from public.t100_reviews where service_request_id=j.service_request_id and status='open')
 and r.resolution not in ('admin_distribute','admin_refund') then raise exception 'T100 review required'; end if;
 select * into f from public.t100_finalizations where service_request_id=j.service_request_id;
 if found then
  if f.job_id is distinct from p_job_id or f.source<>r.resolution then raise exception 'T100 resolution conflict'; end if;
  return f.id;
 end if;
 if j.status not in ('assigned','in_progress') then raise exception 'T100 job not available'; end if;
 select * into q from public.service_quotes where id=j.accepted_quote_id and service_request_id=j.service_request_id and status='accepted';
 if not found or q.currency<>'TRY' or q.total_amount<=0 then raise exception 'T100 approved price required'; end if;
 select * into i from public.finance_payment_intents where service_request_id=j.service_request_id and purpose='initial' for update;
 if i.id is not null and (i.quote_id<>q.id or i.amount<>q.total_amount or i.currency<>q.currency) then raise exception 'T100 price intent mismatch'; end if;
 if r.resolution<>'admin_refund'and coalesce((public.t103_funding_state(j.service_request_id,(select customer_id from public.service_requests where id=j.service_request_id))->>'fullySecured')::boolean,false)is not true then raise exception 'T102 approved price and authorization mismatch';end if;
 insert into public.t100_finalizations(service_request_id,job_id,source,action,amount,intent_id)
 values(j.service_request_id,j.id,r.resolution,case when r.resolution='admin_refund' then 'refund' else 'distribute' end,public.t100_approved_total(j.service_request_id),i.id) returning * into f;
 perform public.t103_make_parts(f.id);
 if f.action='distribute' then perform t100_private.legacy_complete_service_job(j.id,j.technician_id); end if;
 return f.id;
end $$;

create or replace function public.t100_admin_finance_decision(p_job_id uuid,p_admin_id uuid,p_decision text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.service_jobs%rowtype;r public.t100_completion_reports%rowtype;v public.t100_reviews%rowtype;
 f public.t100_finalizations%rowtype;q public.service_quotes%rowtype;i public.finance_payment_intents%rowtype;desired text;
begin
 if not public.t103_is_multi((select service_request_id from public.service_jobs where id=p_job_id))then return t100_private.pre_t103_admin_decision(p_job_id,p_admin_id,p_decision);end if;
 perform t100_private.assert_actor(p_admin_id,'admin');
 if p_decision not in ('distribute','refund') or p_decision is null then raise exception 'T100 invalid decision'; end if;
 select * into j from public.service_jobs where id=p_job_id;
 perform 1 from public.service_requests where id=j.service_request_id for update;
 select * into j from public.service_jobs where id=p_job_id for update;
 desired:='admin_'||p_decision;
 select * into f from public.t100_finalizations where service_request_id=j.service_request_id;
 if found then
  if f.source=desired and f.job_id=p_job_id then return jsonb_build_object('id',f.id,'state',f.state,'action',f.action); end if;
  raise exception 'T100 resolution conflict';
 end if;
 if p_decision='distribute'and coalesce((public.t103_funding_state(j.service_request_id,p_admin_id)->>'fullySecured')::boolean,false)is not true then raise exception 'T103 approved price is not financially secured';end if;
 if j.status not in ('assigned','in_progress') then raise exception 'T100 job not available'; end if;
 select * into r from public.t100_completion_reports where job_id=j.id and voided_at is null for update;
 select * into v from public.t100_reviews where service_request_id=j.service_request_id and status='open' for update;
 if not (r.response='no' and r.complaint_id is not null or v.complaint_id is not null) then raise exception 'T100 complaint review required'; end if;
 -- A NULL expression is not authorization.
 if coalesce(r.complaint_id,v.complaint_id) is null then raise exception 'T100 complaint review required'; end if;
 if r.resolution is not null then raise exception 'T100 resolution conflict'; end if;
 update public.t100_reviews set status='resolved' where service_request_id=j.service_request_id and status='open';
 if r.job_id is not null then
  update public.t100_completion_reports set resolution=desired where job_id=j.id;
  perform public.t100_prepare_finalization(j.id);
  select * into f from public.t100_finalizations where service_request_id=j.service_request_id;
 else
  select * into q from public.service_quotes where id=j.accepted_quote_id and service_request_id=j.service_request_id and status='accepted';
  select * into i from public.finance_payment_intents where service_request_id=j.service_request_id and purpose='initial' for update;
  if q.id is null or q.currency<>'TRY' or q.total_amount<=0 or i.id is not null and (i.amount<>q.total_amount or i.quote_id<>q.id) then raise exception 'T100 approved price mismatch'; end if;
  insert into public.t100_finalizations(service_request_id,job_id,source,action,amount,intent_id)
  values(j.service_request_id,j.id,desired,p_decision,public.t100_approved_total(j.service_request_id),i.id) returning * into f;
  perform public.t103_make_parts(f.id);
  if p_decision='distribute' then perform t100_private.legacy_complete_service_job(j.id,j.technician_id); end if;
 end if;
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(j.service_request_id,j.id,p_admin_id,'completion.'||desired,'t100_finalization',f.id,jsonb_build_object('providerConfirmed',false));
 return jsonb_build_object('id',f.id,'state',f.state,'action',f.action);
end $$;

create or replace function t100_private.commit_verified_finalization(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;minor bigint;share bigint;
begin
 select * into f from public.t100_finalizations where id=p_id for update;
 if not found then raise exception 'T100 finalization missing'; end if;
 if f.state='verified' then return; end if;
 select * into i from public.finance_payment_intents where id=f.intent_id for update;
 if f.multi_payment then perform t100_private.t103_assert_finalization(f.id);
 elsif f.action='distribute' then
  if i.id is null or i.status is distinct from 'captured' or i.captured_amount<>f.amount or i.refunded_amount<>0 then raise exception 'T100 capture not verified'; end if;
 elsif f.action='refund' or f.action='cancel' and f.amount=0 then
  if i.id is not null and i.status not in ('voided','cancelled','refunded') then raise exception 'T100 full return not verified'; end if;
 elsif f.action='cancel' then
  if i.status<>'captured' or i.captured_amount<>f.amount or i.refunded_amount<>0 then raise exception 'T100 fee not verified'; end if;
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

create or replace function t100_private.legacy_fake_authorize(
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
     or v_intent.purpose not in ('initial','additional')
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
alter function public.finance_capture_completed_job(uuid,uuid,uuid)set schema t100_private;
alter function t100_private.finance_capture_completed_job(uuid,uuid,uuid)rename to pre_t103_capture_completed;
create function public.finance_capture_completed_job(p_job_id uuid,p_request_id uuid,p_quote_id uuid)returns uuid language plpgsql security definer set search_path=''as $$
begin
 if exists(select 1 from public.t100_finalizations where service_request_id=p_request_id and multi_payment)then return(select id from public.finance_payment_intents where service_request_id=p_request_id and purpose='initial');end if;
 return t100_private.pre_t103_capture_completed(p_job_id,p_request_id,p_quote_id);
end $$;
create function public.t103_process_fake_parts(p_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$
declare f public.t100_finalizations%rowtype;p public.t103_finance_parts%rowtype;i public.finance_payment_intents%rowtype;tx uuid;unused numeric;
begin
 select service_request_id into f.service_request_id from public.t100_finalizations where id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select * into f from public.t100_finalizations where id=p_id for update;
 if f.state='verified'then return jsonb_build_object('state','verified');end if;
 if f.state<>'pending'then return jsonb_build_object('state',f.state);end if;
 if not f.multi_payment or not exists(select 1 from public.finance_runtime_config where id=1 and provider='fake'and environment='sandbox'and gate_mode='test_only')then raise exception 'T103 fake provider test scope required';end if;
 for p in select * from public.t103_finance_parts where finalization_id=f.id order by id for update loop
  select * into i from public.finance_payment_intents where id=p.intent_id for update;
  if i.provider<>'fake'or i.environment<>'sandbox'or not exists(select 1 from public.users where id=i.customer_id and is_test and is_active)then raise exception 'T103 fake provider test scope required';end if;
  if p.state='verified'then continue;end if;
  if p.state<>'pending'then raise exception 'T103 uncertain part cannot be replayed';end if;
  if p.operation='capture'then
   if i.status<>'authorized'or i.authorized_amount<p.amount or i.captured_amount<>0 then raise exception 'T103 capture state mismatch';end if;
   insert into public.finance_transactions(intent_id,service_request_id,operation,status,amount,currency,idempotency_key,metadata)
   values(i.id,f.service_request_id,'capture','succeeded',p.amount,i.currency,'t103-part:'||p.id::text,jsonb_build_object('provider','fake','finalizationId',f.id,'partId',p.id))returning id into tx;
   insert into public.finance_ledger_entries(transaction_id,intent_id,service_request_id,account,direction,amount,currency)values
   (tx,i.id,f.service_request_id,'provider_clearing','debit',p.amount,i.currency),(tx,i.id,f.service_request_id,case when f.action='cancel'then 'platform_cancellation_revenue'else 'service_settlement'end,'credit',p.amount,i.currency);
   update public.finance_payment_intents set status='captured',captured_amount=p.amount,captured_at=now()where id=i.id;
   unused:=i.authorized_amount-p.amount;
   if unused>0 then insert into public.finance_transactions(intent_id,service_request_id,operation,status,amount,currency,idempotency_key,metadata)
    values(i.id,f.service_request_id,'void','succeeded',unused,i.currency,'t103-unused:'||p.id::text,'{"provider":"fake","unusedAuthorizationOnly":true}');end if;
  elsif p.operation='refund'then
   perform t100_private.legacy_fake_refund(i.id,'t103-part:'||p.id::text,p.amount,'T103 full service return');
  elsif p.operation='cancel'then
   if i.status not in('authorized','capture_failed')or i.captured_amount<>0 then raise exception 'T103 void state mismatch';end if;
   insert into public.finance_transactions(intent_id,service_request_id,operation,status,amount,currency,idempotency_key,metadata)
   values(i.id,f.service_request_id,'void','succeeded',i.authorized_amount,i.currency,'t103-part:'||p.id::text,'{"provider":"fake"}');
   update public.finance_payment_intents set status='voided',voided_at=now()where id=i.id;
  else
   if i.status in('pending_authorization','authorization_failed')and i.authorized_amount=0 then update public.finance_payment_intents set status='cancelled'where id=i.id;
   elsif i.status not in('cancelled','voided','refunded')then raise exception 'T103 no-op not verified';end if;
  end if;
  update public.t103_finance_parts set state='verified',verified_at=clock_timestamp(),remaining_authorization_verified=true where id=p.id;
 end loop;
 perform t100_private.commit_verified_finalization(f.id);
 return jsonb_build_object('state','verified','provider','fake','simulation',true);
end $$;
alter function public.t100_process_fake_finalization(uuid)set schema t100_private;
alter function t100_private.t100_process_fake_finalization(uuid)rename to pre_t103_fake_finalization;
create function public.t100_process_fake_finalization(p_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$
begin
 if exists(select 1 from public.t100_finalizations where id=p_id and multi_payment)then return public.t103_process_fake_parts(p_id);end if;
 return t100_private.pre_t103_fake_finalization(p_id);
end $$;
-- Additional authorization never releases/restarts service distribution.
alter function public.finance_iyzico_intent_context(uuid,uuid)set schema t100_private;
alter function t100_private.finance_iyzico_intent_context(uuid,uuid)rename to pre_t103_intent_context;
create function public.finance_iyzico_intent_context(p_intent_id uuid,p_customer_id uuid)returns jsonb language plpgsql stable security definer set search_path=''as $$
declare i public.finance_payment_intents%rowtype;c public.finance_runtime_config%rowtype;
begin
 select * into i from public.finance_payment_intents where id=p_intent_id;
 if i.purpose='initial'then return t100_private.pre_t103_intent_context(p_intent_id,p_customer_id)||jsonb_build_object('purpose','initial');end if;
 select * into c from public.finance_runtime_config where id=1;
 if c.gate_mode<>'test_only'or c.provider<>'iyzico'or c.environment<>'sandbox'or not c.iyzico_sandbox_enabled or i.customer_id is distinct from p_customer_id or i.provider<>'iyzico'or i.environment<>'sandbox'or not exists(select 1 from public.users where id=p_customer_id and is_active and is_test and role='customer')then raise exception 'T103 additional authorization forbidden';end if;
 return jsonb_build_object('intentId',i.id,'serviceRequestId',i.service_request_id,'customerId',i.customer_id,'quoteId',i.quote_id,'amount',i.amount::text,'currency',i.currency,'basketId',i.service_request_id::text,'intentStatus',i.status,'paymentId',i.provider_reference,'purpose',i.purpose,'costId',i.additional_cost_id);
end $$;
-- ACLs are reapplied after every replacement.
do $acl$ declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and(p.proname like 't103_%'or p.proname in('t100_prepare_finalization','t100_customer_cancel','t100_admin_finance_decision','t100_process_fake_finalization','finance_capture_completed_job','finance_iyzico_intent_context'))loop execute 'revoke all on function '||f.signature||' from public,anon,authenticated';execute 'grant execute on function '||f.signature||' to service_role';end loop;end $acl$;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
