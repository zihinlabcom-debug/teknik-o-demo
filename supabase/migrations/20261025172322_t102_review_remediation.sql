-- T102 forward-only remediation. Old T100 migrations and business decisions are preserved.
begin;
alter table public.t100_completion_reports add column report_version uuid not null default gen_random_uuid(),
 add column prepare_attempts integer not null default 0,add column prepare_next_at timestamptz,
 add column prepare_error_code text,add column prepare_blocked boolean not null default false;
alter table public.t100_finalizations add column attempt_count integer not null default 0,
 add column next_attempt_at timestamptz,add column last_attempt_at timestamptz,add column last_error_code text;
create index t102_due_finalizations on public.t100_finalizations(coalesce(last_attempt_at,created_at),created_at) where state='pending';
create function public.t100_completion_version(p_job_id uuid) returns text language sql stable security definer set search_path='' as $$
 select report_version::text from public.t100_completion_reports where job_id=p_job_id
$$;
create function public.t100_approved_total(p_request_id uuid) returns numeric language sql stable security definer set search_path='' as $$
 select q.total_amount+coalesce((select sum(a.requested_amount) from public.service_additional_cost_requests a where a.service_request_id=q.service_request_id and a.status='customer_accepted'),0)
 from public.service_quotes q where q.service_request_id=p_request_id and q.status='accepted' order by version desc limit 1
$$;
create function t100_private.guard_report_version() returns trigger language plpgsql set search_path='' as $$
begin if new.report_version is distinct from old.report_version then raise exception 'T102 report identity immutable';end if;return new;end $$;
create trigger t102_report_version before update on public.t100_completion_reports for each row execute function t100_private.guard_report_version();
-- New requests must finish the approved payment-pending transaction. No historical request is rewritten.
create function t100_private.require_new_request_payment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.finance_payment_intents i join public.service_quotes q on q.id=i.quote_id join public.users u on u.id=i.customer_id
 where i.service_request_id=new.id and i.customer_id=new.customer_id and i.purpose='initial' and i.environment='sandbox' and i.provider in ('fake','iyzico')
 and q.service_request_id=new.id and i.amount>0 and i.amount=q.total_amount and i.currency=q.currency and q.status='accepted' and u.is_test and u.is_active)
 then raise exception 'T102 approved payment flow required for a new service request';end if;
 return null;
end $$;
create constraint trigger t102_new_request_payment after insert on public.service_requests deferrable initially deferred for each row execute function t100_private.require_new_request_payment();
create or replace function public.t100_cancellation_policy(p_request_id uuid,p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype;j public.service_jobs%rowtype;a public.service_appointments%rowtype;
 role_name text; result jsonb; fee bigint:=0;points integer:=0;amount bigint;action text; stamp timestamptz; count_a integer;
begin
 select * into r from public.service_requests where id=p_request_id for update;
 if not found then raise exception 'T100 not found'; end if;
 select role into role_name from public.users where id=p_actor_id and is_active;
 select * into j from public.service_jobs where service_request_id=r.id and status in ('assigned','in_progress') order by assigned_at desc,id desc limit 1 for update;
 if not found then select * into j from public.service_jobs where service_request_id=r.id and status='completed' order by completed_at desc,id desc limit 1 for update; end if;
 if role_name='customer' and r.customer_id=p_actor_id then null;
 elsif role_name='technician' and j.technician_id=p_actor_id and j.status in ('assigned','in_progress') then null;
 else raise exception 'T100 forbidden'; end if;
 select count(*) into count_a from public.service_appointments where job_id=j.id and status in ('scheduled','confirmed');
 if count_a>1 then raise exception 'T100 ambiguous appointment'; end if;
 select * into a from public.service_appointments where job_id=j.id and status in ('scheduled','confirmed') for update;
 select round(public.t100_approved_total(r.id)*100)::bigint into amount;
 amount:=coalesce(amount,round(coalesce(r.final_price,0)*100)::bigint);
 if amount<0 then raise exception 'T100 invalid amount'; end if;
 stamp:=clock_timestamp();
 if r.status in ('completed','cancelled','technician_unavailable') or j.status in ('completed','cancelled') then action:='closed';
 elsif role_name='customer' and a.starts_at<=stamp then action:='review';
 else action:='cancel';
  if role_name='customer' and a.id is not null then fee:=least(10000,amount); end if;
  if role_name='technician' then points:=case when a.starts_at<=stamp then 10 else 5 end; end if;
 end if;
 result:=jsonb_build_object('requestId',r.id,'jobId',j.id,'appointmentId',a.id,'startsAt',a.starts_at,
  'jobStatus',j.status,'requestStatus',r.status,'actorRole',role_name,'action',action,'amountMinor',amount,
  'feeMinor',fee,'points',points);
 return result||jsonb_build_object('version',md5(result::text),'serverNow',stamp);
end $$;
-- Old unversioned callers cannot authorize a new completion.
alter function public.t100_answer_completion(uuid,uuid,text) set schema t100_private;
alter function t100_private.t100_answer_completion(uuid,uuid,text) rename to pre_t102_answer;
create function public.t100_answer_completion(p_job_id uuid,p_customer_id uuid,p_answer text) returns jsonb language plpgsql security definer set search_path='' as $$
begin raise exception 'T102 completion identity and report version required';end $$;
create function public.t100_answer_completion(p_job_id uuid,p_customer_id uuid,p_answer text,p_report_version text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.service_jobs%rowtype;c public.t100_completion_reports%rowtype;
begin
 perform t100_private.assert_actor(p_customer_id,'customer');
 select * into j from public.service_jobs where id=p_job_id;
 perform 1 from public.service_requests where id=j.service_request_id and customer_id=p_customer_id for update;
 if not found then raise exception 'T102 forbidden';end if;
 select * into j from public.service_jobs where id=p_job_id for update;
 select * into c from public.t100_completion_reports where job_id=p_job_id for update;
 if c.job_id is null or c.voided_at is not null or p_report_version is distinct from c.report_version::text
 or j.status='cancelled' or exists(select 1 from public.service_jobs x where x.service_request_id=j.service_request_id and x.status in ('assigned','in_progress') and x.id<>j.id)
 then raise exception 'T102 completion identity changed';end if;
 return t100_private.pre_t102_answer(p_job_id,p_customer_id,p_answer);
end $$;
-- Every assignment cancellation, including the old admin path, invalidates only that job's report.
create function t100_private.invalidate_assignment_report() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='cancelled' and old.status is distinct from new.status then
  update public.t100_completion_reports set voided_at=coalesce(voided_at,clock_timestamp()) where job_id=new.id and voided_at is null;
 end if;return new;
end $$;
create trigger t102_assignment_report after update of status on public.service_jobs for each row execute function t100_private.invalidate_assignment_report();
alter function public.t100_prepare_finalization(uuid) set schema t100_private;
alter function t100_private.t100_prepare_finalization(uuid) rename to pre_t102_prepare;
create function public.t100_prepare_finalization(p_job_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare j public.service_jobs%rowtype;c public.t100_completion_reports%rowtype;i public.finance_payment_intents%rowtype;total numeric;
begin
 select * into j from public.service_jobs where id=p_job_id;
 perform 1 from public.service_requests where id=j.service_request_id for update;
 if not exists(select 1 from public.t100_finalizations where service_request_id=j.service_request_id) then
  select * into c from public.t100_completion_reports where job_id=j.id;
  select * into i from public.finance_payment_intents where service_request_id=j.service_request_id and purpose='initial' for update;
  total:=public.t100_approved_total(j.service_request_id);
  if c.resolution is distinct from 'admin_refund' and (i.id is null or total is null or total<=0 or i.amount<>total or i.authorized_amount<>total or i.currency<>'TRY')
  then raise exception 'T102 approved price and authorization mismatch';end if;
 end if;
 return t100_private.pre_t102_prepare(p_job_id);
end $$;
-- A fee may not exceed the verified authorization; no lower fee is invented on mismatch.
alter function public.t100_customer_cancel(uuid,uuid,text,text) set schema t100_private;
alter function t100_private.t100_customer_cancel(uuid,uuid,text,text) rename to pre_t102_customer_cancel;
create function public.t100_customer_cancel(p_request_id uuid,p_customer_id uuid,p_version text,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;i public.finance_payment_intents%rowtype;
begin
 perform t100_private.assert_actor(p_customer_id,'customer');
 p:=public.t100_cancellation_policy(p_request_id,p_customer_id);
 if (p->>'feeMinor')::numeric>0 then
  select * into i from public.finance_payment_intents where service_request_id=p_request_id and purpose='initial' for update;
  if i.id is null or i.authorized_amount*100<(p->>'feeMinor')::numeric then raise exception 'T102 cancellation price authorization mismatch';end if;
 end if;
 return t100_private.pre_t102_customer_cancel(p_request_id,p_customer_id,p_version,p_reason);
end $$;
create or replace function public.process_service_job_appointment_timeouts()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_job_id uuid;
  v_cycle_id uuid;
  v_processed integer:=0;
begin
  for v_job_id in
    select j.id
    from public.service_jobs j join public.service_requests r on r.id=j.service_request_id
    where j.status='assigned'
      and j.assigned_at+interval '1 hour'<now()
      and not exists(
        select 1
        from public.service_appointments a
        where a.job_id=j.id
          and a.status in ('scheduled','confirmed')
      )
    order by j.assigned_at
    limit 100
    for update of r skip locked
  loop
    v_cycle_id:=public.timeout_service_job_for_missing_appointment(v_job_id);

    -- Manual timeout has no new cycle but still counts as processed.
    if exists(select 1 from public.service_jobs
              where id=v_job_id and status='cancelled') then
      v_processed:=v_processed+1;
    end if;
  end loop;

  return v_processed;
end;
$$;
-- Existing round/cycle algorithms remain unchanged; only their entry lock order is unified.
alter function public.open_service_distribution_round(uuid) set schema t100_private;
alter function t100_private.open_service_distribution_round(uuid) rename to pre_t102_open_round;
create function public.open_service_distribution_round(p_cycle_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.service_requests r join public.service_distribution_cycles c on c.service_request_id=r.id where c.id=p_cycle_id for update of r;
 return t100_private.pre_t102_open_round(p_cycle_id);
end $$;
create or replace function public.advance_service_distribution_cycles()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_cycle public.service_distribution_cycles%rowtype;
  v_dispatch_id uuid;
  v_processed integer:=0;
begin
  for v_cycle in
    select c.*
    from public.service_distribution_cycles c join public.service_requests r on r.id=c.service_request_id
    where c.status='active'
      and next_round_at is not null
      and next_round_at<=now()
    order by next_round_at
    limit 100
    for update of r skip locked
  loop
    if exists(
      select 1
      from public.service_jobs
      where service_request_id=v_cycle.service_request_id
        and status in ('assigned','in_progress')
    ) then
      update public.service_distribution_cycles
      set
        status='accepted',
        next_round_at=null,
        closed_at=coalesce(closed_at,now())
      where id=v_cycle.id;

      v_processed:=v_processed+1;
      continue;
    end if;

    v_dispatch_id:=null;

    select id
      into v_dispatch_id
    from public.service_dispatches
    where distribution_cycle_id=v_cycle.id
      and status in ('pending','broadcasting')
    order by round_no desc
    limit 1
    for update;

    -- Close the old dispatch before locking technicians for the next round.
    -- This keeps lock order compatible with availability changes.
    if found then
      update public.service_dispatches
      set
        status='expired',
        closed_at=coalesce(closed_at,now())
      where id=v_dispatch_id;
    end if;

    if v_cycle.current_round>=3 then
      if v_dispatch_id is not null then
        update public.service_dispatch_candidates
        set
          status='expired',
          responded_at=coalesce(responded_at,now())
        where dispatch_id=v_dispatch_id
          and status='offered';
      end if;

      update public.service_distribution_cycles
      set
        status='exhausted',
        next_round_at=null,
        closed_at=coalesce(closed_at,now())
      where id=v_cycle.id;

      insert into public.operational_events(
        service_request_id,
        event_type,
        entity_type,
        entity_id,
        payload
      )
      values(
        v_cycle.service_request_id,
        'distribution.exhausted',
        'service_distribution_cycle',
        v_cycle.id,
        jsonb_build_object(
          'distribution_cycle_id',v_cycle.id,
          'rounds',3
        )
      );
    else
      perform public.open_service_distribution_round(v_cycle.id);

      if v_dispatch_id is not null then
        update public.service_dispatch_candidates
        set
          status='expired',
          responded_at=coalesce(responded_at,now())
        where dispatch_id=v_dispatch_id
          and status='offered';
      end if;
    end if;

    v_processed:=v_processed+1;
  end loop;

  return v_processed;
end;
$$;
-- Monetary admission happens before the network call, not only when recording its result.
alter function public.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text) set schema t100_private;
alter function t100_private.finance_iyzico_claim_operation(uuid,uuid,uuid,uuid,text,text,text,text,text,numeric,text,text,text,text,text) rename to pre_t102_claim;
create function public.finance_iyzico_claim_operation(p_intent_id uuid,p_service_request_id uuid,p_customer_id uuid,p_job_id uuid,p_operation text,p_operation_id text,p_business_operation_key text,p_conversation_id text,p_fingerprint text,p_amount numeric,p_currency text,p_basket_id text,p_payment_id text,p_payment_transaction_id text,p_payment_conversation_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;
begin
 perform 1 from public.service_requests where id=p_service_request_id for update;
 select * into f from public.t100_finalizations where intent_id=p_intent_id;
 if p_operation in ('capture','cancel','refund') then
  if f.id is null or f.state<>'running' or f.reservation is null then raise exception 'T102 lifecycle reservation required';end if;
  if f.provider_operation_id is distinct from p_operation_id then raise exception 'T102 finance operation identity mismatch';end if;
 end if;
 if p_operation<>'retrieve' and exists(select 1 from public.finance_iyzico_operations where intent_id=p_intent_id and operation in ('authorize','capture','cancel','refund') and state in ('in_flight','unknown') and operation_id<>p_operation_id)
 then raise exception 'T102 previous financial outcome uncertain';end if;
 return t100_private.pre_t102_claim(p_intent_id,p_service_request_id,p_customer_id,p_job_id,p_operation,p_operation_id,p_business_operation_key,p_conversation_id,p_fingerprint,p_amount,p_currency,p_basket_id,p_payment_id,p_payment_transaction_id,p_payment_conversation_id);
end $$;
alter function public.finance_apply_iyzico_operation(uuid,text) set schema t100_private;
alter function t100_private.finance_apply_iyzico_operation(uuid,text) rename to pre_t102_apply;
create function public.finance_apply_iyzico_operation(p_intent_id uuid,p_operation_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;o public.finance_iyzico_operations%rowtype;
begin
 select * into f from public.t100_finalizations where intent_id=p_intent_id;
 if f.id is not null then
  perform 1 from public.service_requests where id=f.service_request_id for update;
  if f.provider_operation_id is distinct from p_operation_id then raise exception 'T102 finance operation identity mismatch';end if;
  select * into o from public.finance_iyzico_operations where intent_id=p_intent_id and operation_id=p_operation_id;
  if f.state='running' and f.action='cancel' and f.amount>0 and o.operation='capture' and o.state='declined' and o.signature_verified and o.amount=f.amount and o.job_id=f.job_id
  then return t100_private.legacy_apply_iyzico(p_intent_id,p_operation_id);end if;
 end if;
 return t100_private.pre_t102_apply(p_intent_id,p_operation_id);
end $$;
-- Recovery consumes verified, previously journaled evidence. It cannot call a provider.
create function public.t100_recover_finance_result(p_id uuid,p_admin_id uuid,p_operation_id text) returns text language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;o public.finance_iyzico_operations%rowtype;result text;
begin
 perform t100_private.assert_actor(p_admin_id,'admin');
 select service_request_id into f.service_request_id from public.t100_finalizations where id=p_id;
 perform 1 from public.service_requests where id=f.service_request_id for update;
 select * into f from public.t100_finalizations where id=p_id for update;
 if f.id is null or f.provider_operation_id is null or f.provider_operation_id is distinct from p_operation_id then raise exception 'T102 recovery identity mismatch';end if;
 if f.state='verified' then return 'verified';end if;
 if f.state='running' and f.reserved_at>clock_timestamp()-interval '10 minutes' then return 'running';end if;
 if f.state not in ('unknown','blocked','failed','running') then raise exception 'T102 recovery not available';end if;
 select * into o from public.finance_iyzico_operations where operation_id=p_operation_id and intent_id=f.intent_id;
 if o.id is null or o.state not in ('succeeded','declined') or o.signature_verified is not true then raise exception 'T102 verified provider evidence required';end if;
 update public.t100_finalizations set state='running',reservation=coalesce(reservation,gen_random_uuid()),reserved_at=clock_timestamp() where id=f.id returning * into f;
 perform public.finance_apply_iyzico_operation(f.intent_id,p_operation_id);
 result:=public.t100_record_finance_result(f.id,f.reservation,p_operation_id,o.state);
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(f.service_request_id,f.job_id,p_admin_id,'finance.t100_recovered','t100_finalization',f.id,jsonb_build_object('state',result,'providerOperationId',p_operation_id,'providerMutation',false));
 return result;
end $$;
-- Queue error handling is separate from the financial idempotency state.
create function public.t100_defer_finalization(p_id uuid,p_code text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_code not in ('execution_disabled','payment_intent_required','database_unavailable','processing_failed','provider_state_unavailable')then raise exception 'T102 invalid defer code';end if;
 update public.t100_finalizations set attempt_count=attempt_count+1,last_attempt_at=clock_timestamp(),next_attempt_at=clock_timestamp()+interval '1 minute',last_error_code=p_code where id=p_id and state='pending';
end $$;
create function public.t100_pending_finance_queue(p_limit integer default 50) returns jsonb language sql volatile security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'service_request_id',service_request_id)),'[]'::jsonb) from (
 select id,service_request_id from public.t100_finalizations where state='pending' and (next_attempt_at is null or next_attempt_at<=clock_timestamp())
 order by coalesce(last_attempt_at,created_at),created_at,id limit least(greatest(p_limit,1),100)) q
$$;
create or replace function public.t100_completion_tick(p_limit integer default 50) returns integer language plpgsql security definer set search_path='' as $$
declare item record;total integer:=0;code text;
begin
 if p_limit not between 1 and 100 then raise exception 'T100 invalid batch';end if;
 perform public.t100_expire_completions(p_limit);
 for item in select c.job_id,c.service_request_id from public.t100_completion_reports c join public.service_requests q on q.id=c.service_request_id
 where c.resolution is not null and c.voided_at is null and not c.prepare_blocked and (c.prepare_next_at is null or c.prepare_next_at<=clock_timestamp())
 and not exists(select 1 from public.t100_finalizations f where f.service_request_id=c.service_request_id)
 order by c.deadline limit p_limit for update of q skip locked loop
  begin
   perform public.t100_prepare_finalization(item.job_id);total:=total+1;
  exception when others then
   code:=case when sqlerrm like 'T102%price%' then 'price_authorization_mismatch' when sqlstate in ('40P01','40001','55P03')then 'retryable_database_conflict'else 'preparation_requires_review'end;
   update public.t100_completion_reports set prepare_attempts=prepare_attempts+1,prepare_next_at=clock_timestamp()+interval '1 minute',prepare_error_code=code,prepare_blocked=(code<>'retryable_database_conflict') where job_id=item.job_id;
   insert into public.operational_events(service_request_id,job_id,event_type,entity_type,entity_id,payload)
   select item.service_request_id,item.job_id,'completion.preparation_blocked','service_job',item.job_id,jsonb_build_object('code',code)
   where not exists(select 1 from public.operational_events where job_id=item.job_id and event_type='completion.preparation_blocked');
  end;
 end loop;return total;
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
 'completion',(select to_jsonb(c)||jsonb_build_object('version',c.report_version) from public.t100_completion_reports c where c.job_id=j.id),
 'review',(select jsonb_build_object('status',v.status,'complaintId',v.complaint_id) from public.t100_reviews v where v.service_request_id=req.id),
 'finalization',(select jsonb_build_object('id',f.id,'action',f.action,'state',f.state,'amount',f.amount,'source',f.source) from public.t100_finalizations f where f.service_request_id=req.id),
 'simulation',(select jsonb_build_object('mode',s.mode,'bankTransfer',s.bank_transfer,'technicianMinor',s.technician_minor,'platformMinor',s.platform_minor,'totalMinor',s.total_minor) from public.t100_distribution_simulations s where s.service_request_id=req.id),
 'complaint',(select jsonb_build_object('id',c.id,'status',c.status,'purpose',c.t100_purpose) from public.service_complaints c where c.id=coalesce((select complaint_id from public.t100_reviews where service_request_id=req.id),(select complaint_id from public.t100_completion_reports where job_id=j.id))),
 'preparation',(select jsonb_build_object('code',c.prepare_error_code,'blocked',c.prepare_blocked,'retryAt',c.prepare_next_at) from public.t100_completion_reports c where c.job_id=j.id and c.prepare_error_code is not null),
 'penaltyTotal',case when role_name='technician' then (select coalesce(sum(points),0) from public.t100_penalty_entries where technician_id=p_actor_id) else null end);
end $$;
-- Keep every new RPC service-only and private helpers inaccessible.
do $acl$ declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 't100_%' or p.proname in ('finance_iyzico_claim_operation','finance_apply_iyzico_operation','process_service_job_appointment_timeouts','open_service_distribution_round','advance_service_distribution_cycles'))loop
 execute 'revoke all on function '||f.signature||' from public,anon,authenticated';execute 'grant execute on function '||f.signature||' to service_role';end loop;end $acl$;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
