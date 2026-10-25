begin;
alter table public.t100_reviews add column purpose text not null default 'cancellation_review' check(purpose in ('cancellation_review','completion_review'));
create or replace function public.t100_answer_completion(p_job_id uuid,p_customer_id uuid,p_answer text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.t100_completion_reports%rowtype; req public.service_requests%rowtype;
begin
 perform t100_private.assert_actor(p_customer_id,'customer');
 if p_answer not in ('yes','no') or p_answer is null then raise exception 'T100 invalid answer'; end if;
 select q.* into req from public.service_requests q join public.service_jobs j on j.service_request_id=q.id where j.id=p_job_id for update of q;
 if not found or req.customer_id<>p_customer_id then raise exception 'T100 forbidden'; end if;
 select * into r from public.t100_completion_reports where job_id=p_job_id for update;
 if not found or r.voided_at is not null then raise exception 'T100 report not available'; end if;
 if r.resolution is not null or r.response<>'pending' then
  if (r.response=p_answer and r.resolution in ('customer_yes')) or (r.response='no' and p_answer='no' and r.resolution is null)
  then return to_jsonb(r); end if;
  raise exception 'T100 response conflict';
 end if;
 if exists(select 1 from public.t100_finalizations where service_request_id=req.id) then raise exception 'T100 resolution conflict'; end if;
 if clock_timestamp()>=r.deadline then
  update public.t100_completion_reports set resolution='timeout' where job_id=p_job_id returning * into r;
  return to_jsonb(r);
 end if;
 update public.t100_completion_reports set response=p_answer,
 resolution=case when p_answer='yes' then 'customer_yes' else null end where job_id=p_job_id returning * into r;
 if p_answer='no' then
  insert into public.t100_reviews(service_request_id,job_id,customer_id,purpose) values(req.id,p_job_id,p_customer_id,'completion_review') on conflict(service_request_id) do nothing;
 end if;
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(req.id,p_job_id,p_customer_id,'completion.customer_'||p_answer,'service_job',p_job_id,'{}');
 return to_jsonb(r);
end $$;
create or replace function t100_private.link_complaint() returns trigger
language plpgsql security definer set search_path='' as $$
declare req public.service_requests%rowtype;
begin
 if new.applicant_role<>'customer' then return new; end if;
 select * into req from public.service_requests where id=new.service_request_id for update;
 if req.customer_id<>new.applicant_user_id then raise exception 'T100 complaint owner mismatch'; end if;
 if exists(select 1 from public.t100_reviews where service_request_id=req.id and customer_id=new.applicant_user_id and status='open') then
  select purpose into new.t100_purpose from public.t100_reviews where service_request_id=req.id;
 elsif exists(select 1 from public.t100_completion_reports where service_request_id=req.id and response='no' and voided_at is null) then
  new.t100_purpose:='completion_review';
 end if;
 return new;
end $$;
create function public.t100_finalize_unstarted_authorization(p_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;
begin
 select service_request_id into f.service_request_id from public.t100_finalizations where id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select * into f from public.t100_finalizations where id=p_id for update;
 if not found or f.action not in ('cancel','refund') or f.action='cancel' and f.amount<>0 then raise exception 'T100 no-op not eligible'; end if;
 if f.state='verified' then return 'verified'; end if;
 if f.state<>'pending' then return f.state; end if;
 select * into i from public.finance_payment_intents where id=f.intent_id for update;
 if i.id is not null and i.status not in ('pending_authorization','authorization_failed') then raise exception 'T100 no-op not eligible'; end if;
 if i.id is not null and exists(select 1 from public.finance_iyzico_operations o where o.intent_id=i.id and o.operation in ('authorize','capture','cancel','refund') and o.state<>'declined') then
  update public.t100_finalizations set state='unknown' where id=f.id;return 'unknown';
 end if;
 if i.id is not null then perform t100_private.legacy_settle_terminal(f.service_request_id); end if;
 perform t100_private.commit_verified_finalization(f.id);return 'verified';
end $$;
create function t100_private.guard_terminal_request_resolution() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('cancelled','technician_unavailable','completed') and new.status is distinct from old.status then
  if exists(select 1 from public.t100_finalizations f where f.service_request_id=new.id) and not exists(
   select 1 from public.t100_finalizations f where f.service_request_id=new.id and f.state='verified' and f.action in ('refund','cancel')
  ) then raise exception 'T100 financial resolution reserved'; end if;
  if not exists(select 1 from public.t100_finalizations where service_request_id=new.id) and (
   exists(select 1 from public.t100_reviews where service_request_id=new.id and status='open') or
   exists(select 1 from public.t100_completion_reports where service_request_id=new.id and voided_at is null))
  then raise exception 'T100 review/finalization workflow required'; end if;
 end if;
 return new;
end $$;
create trigger t100_terminal_request_resolution before update of status on public.service_requests
for each row execute function t100_private.guard_terminal_request_resolution();
create function t100_private.guard_appointment_resolution() returns trigger
language plpgsql security definer set search_path='' as $$
declare req uuid;
begin
 select service_request_id into req from public.service_jobs where id=new.job_id;
 perform 1 from public.service_requests where id=req for update;
 if exists(select 1 from public.t100_finalizations where service_request_id=req and state<>'verified' and not (action='distribute' and job_id=new.job_id and new.status='completed')) then
  raise exception 'T100 financial resolution reserved';
 end if;
 return new;
end $$;
create trigger t100_appointment_resolution before insert or update on public.service_appointments
for each row execute function t100_private.guard_appointment_resolution();
revoke all on function public.t100_finalize_unstarted_authorization(uuid) from public,anon,authenticated;
grant execute on function public.t100_finalize_unstarted_authorization(uuid) to service_role;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
alter function public.timeout_service_job_for_missing_appointment(uuid) set schema t100_private;
alter function t100_private.timeout_service_job_for_missing_appointment(uuid) rename to legacy_appointment_timeout;
create function public.timeout_service_job_for_missing_appointment(p_job_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare req uuid;
begin
 select service_request_id into req from public.service_jobs where id=p_job_id;
 perform 1 from public.service_requests where id=req for update;
 if exists(select 1 from public.t100_completion_reports where job_id=p_job_id and voided_at is null)
 or exists(select 1 from public.t100_reviews where service_request_id=req and status='open')
 or exists(select 1 from public.t100_finalizations where service_request_id=req)
 then return null; end if;
 return t100_private.legacy_appointment_timeout(p_job_id);
end $$;
revoke all on function public.timeout_service_job_for_missing_appointment(uuid) from public,anon,authenticated;
grant execute on function public.timeout_service_job_for_missing_appointment(uuid) to service_role;

alter function public.finance_fake_authorize(uuid,text,boolean) set schema t100_private;
alter function t100_private.finance_fake_authorize(uuid,text,boolean) rename to legacy_fake_authorize;
create function public.finance_fake_authorize(p_intent_id uuid,p_idempotency_key text,p_approved boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req uuid;
begin
 select service_request_id into req from public.finance_payment_intents where id=p_intent_id;
 perform 1 from public.service_requests where id=req for update;
 if exists(select 1 from public.t100_finalizations where service_request_id=req) then raise exception 'T100 finance operation outside reserved purpose'; end if;
 return t100_private.legacy_fake_authorize(p_intent_id,p_idempotency_key,p_approved);
end $$;
alter function public.finance_fake_refund(uuid,text,numeric,text) set schema t100_private;
alter function t100_private.finance_fake_refund(uuid,text,numeric,text) rename to legacy_fake_refund;
create function public.finance_fake_refund(p_intent_id uuid,p_idempotency_key text,p_amount numeric,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req uuid;f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;
begin
 select service_request_id into req from public.finance_payment_intents where id=p_intent_id;
 perform 1 from public.service_requests where id=req for update;
 select * into f from public.t100_finalizations where service_request_id=req;
 if found then
  select * into i from public.finance_payment_intents where id=p_intent_id;
  if f.action<>'refund' or f.state not in ('pending','running') or p_amount<>i.captured_amount-i.refunded_amount
  then raise exception 'T100 finance operation outside reserved purpose'; end if;
 end if;
 return t100_private.legacy_fake_refund(p_intent_id,p_idempotency_key,p_amount,p_reason);
end $$;
revoke all on function public.finance_fake_authorize(uuid,text,boolean),public.finance_fake_refund(uuid,text,numeric,text) from public,anon,authenticated;
grant execute on function public.finance_fake_authorize(uuid,text,boolean),public.finance_fake_refund(uuid,text,numeric,text) to service_role;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
create or replace function public.t100_request_state(p_request_id uuid,p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req public.service_requests%rowtype;j public.service_jobs%rowtype;role_name text;policy jsonb;
begin
 select * into req from public.service_requests where id=p_request_id;
 select role into role_name from public.users where id=p_actor_id and is_active;
 if req.id is null then raise exception 'T100 not found'; end if;
 if role_name is null or not (role_name='customer' and req.customer_id=p_actor_id or role_name='admin' or
 role_name='technician' and exists(select 1 from public.service_jobs where service_request_id=req.id and technician_id=p_actor_id))
 then raise exception 'T100 forbidden'; end if;
 select * into j from public.service_jobs where service_request_id=req.id and (role_name<>'technician' or technician_id=p_actor_id)
 order by (status in ('assigned','in_progress')) desc,assigned_at desc,id desc limit 1;
 if role_name='customer' or role_name='technician' and j.status in ('assigned','in_progress')
 then policy:=public.t100_cancellation_policy(req.id,p_actor_id); end if;
 return jsonb_build_object('requestId',req.id,'jobId',j.id,'jobStatus',j.status,'policy',policy,'serverNow',clock_timestamp(),
 'completion',(select to_jsonb(c) from public.t100_completion_reports c where c.job_id=j.id),
 'review',(select jsonb_build_object('status',v.status,'complaintId',v.complaint_id) from public.t100_reviews v where v.service_request_id=req.id),
 'finalization',(select jsonb_build_object('id',f.id,'action',f.action,'state',f.state,'amount',f.amount,'source',f.source) from public.t100_finalizations f where f.service_request_id=req.id),
 'simulation',(select jsonb_build_object('mode',s.mode,'bankTransfer',s.bank_transfer,'technicianMinor',s.technician_minor,'platformMinor',s.platform_minor,'totalMinor',s.total_minor) from public.t100_distribution_simulations s where s.service_request_id=req.id),
 'penaltyTotal',case when role_name='technician' then (select coalesce(sum(points),0) from public.t100_penalty_entries where technician_id=p_actor_id) else null end);
end $$;
create or replace function t100_private.commit_verified_finalization(p_id uuid) returns void
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
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
create function public.t100_bind_finance_operation(p_id uuid,p_reservation uuid,p_operation_id text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_operation_id is null or p_operation_id!~'^[A-Za-z0-9:_-]{8,128}$' then raise exception 'T100 invalid operation id'; end if;
 update public.t100_finalizations set provider_operation_id=p_operation_id
 where id=p_id and state='running' and reservation=p_reservation and (provider_operation_id is null or provider_operation_id=p_operation_id);
 if not found then raise exception 'T100 reservation mismatch'; end if;
end $$;
revoke all on function public.t100_bind_finance_operation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.t100_bind_finance_operation(uuid,uuid,text) to service_role;

create or replace function public.t100_record_finance_result(p_id uuid,p_reservation uuid,p_operation_id text,p_outcome text) returns text
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;i public.finance_payment_intents%rowtype;o public.finance_iyzico_operations%rowtype;
begin
 select service_request_id into f.service_request_id from public.t100_finalizations where id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select * into f from public.t100_finalizations where id=p_id for update;
 if f.state is distinct from 'running' or f.reservation is distinct from p_reservation then raise exception 'T100 reservation mismatch'; end if;
 if f.provider_operation_id is not null and f.provider_operation_id is distinct from p_operation_id then raise exception 'T100 operation identity mismatch'; end if;
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
create or replace function public.t100_request_state(p_request_id uuid,p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req public.service_requests%rowtype;j public.service_jobs%rowtype;role_name text;policy jsonb;
begin
 select * into req from public.service_requests where id=p_request_id;
 select role into role_name from public.users where id=p_actor_id and is_active;
 if req.id is null then raise exception 'T100 not found'; end if;
 if role_name is null or not (role_name='customer' and req.customer_id=p_actor_id or role_name='admin' or
 role_name='technician' and exists(select 1 from public.service_jobs where service_request_id=req.id and technician_id=p_actor_id))
 then raise exception 'T100 forbidden'; end if;
 select * into j from public.service_jobs where service_request_id=req.id and (role_name<>'technician' or technician_id=p_actor_id)
 order by (status in ('assigned','in_progress')) desc,assigned_at desc,id desc limit 1;
 if role_name='customer' or role_name='technician' and j.status in ('assigned','in_progress')
 then policy:=public.t100_cancellation_policy(req.id,p_actor_id); end if;
 return jsonb_build_object('requestId',req.id,'jobId',j.id,'jobStatus',j.status,'policy',policy,'serverNow',clock_timestamp(),
 'completion',(select to_jsonb(c) from public.t100_completion_reports c where c.job_id=j.id),
 'review',(select jsonb_build_object('status',v.status,'complaintId',v.complaint_id) from public.t100_reviews v where v.service_request_id=req.id),
 'finalization',(select jsonb_build_object('id',f.id,'action',f.action,'state',f.state,'amount',f.amount,'source',f.source) from public.t100_finalizations f where f.service_request_id=req.id),
 'simulation',(select jsonb_build_object('mode',s.mode,'bankTransfer',s.bank_transfer,'technicianMinor',s.technician_minor,'platformMinor',s.platform_minor,'totalMinor',s.total_minor) from public.t100_distribution_simulations s where s.service_request_id=req.id),
 'complaint',(select jsonb_build_object('id',c.id,'status',c.status,'purpose',c.t100_purpose) from public.service_complaints c where c.id=coalesce((select complaint_id from public.t100_reviews where service_request_id=req.id),(select complaint_id from public.t100_completion_reports where job_id=j.id))),
 'penaltyTotal',case when role_name='technician' then (select coalesce(sum(points),0) from public.t100_penalty_entries where technician_id=p_actor_id) else null end);
end $$;
commit;
