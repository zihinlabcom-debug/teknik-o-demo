-- T103: additional authorizations. Forward-only; no historical payment identities are changed.
begin;
alter table public.finance_payment_intents drop constraint finance_payment_intents_purpose_check;
alter table public.finance_payment_intents add constraint finance_payment_intents_purpose_check check(purpose in('initial','additional'));
alter table public.finance_payment_intents drop constraint finance_payment_intents_request_purpose_uq;
create unique index finance_one_initial on public.finance_payment_intents(service_request_id) where purpose='initial';
alter table public.finance_payment_intents add column additional_cost_id uuid references public.service_additional_cost_requests(id),add column approval_version integer,add column attempt_no integer not null default 1;
alter table public.finance_payment_intents add constraint t103_intent_scope check(attempt_no>0 and ((purpose='initial' and additional_cost_id is null and approval_version is null and attempt_no=1)or(purpose='additional' and additional_cost_id is not null and approval_version>0)));
create unique index t103_cost_attempt on public.finance_payment_intents(additional_cost_id,attempt_no) where purpose='additional';
create unique index t103_one_open_cost_payment on public.finance_payment_intents(additional_cost_id) where purpose='additional' and status not in('authorization_failed','cancelled','voided','refunded');
create function t100_private.t103_intent_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.additional_cost_id is distinct from old.additional_cost_id or new.approval_version is distinct from old.approval_version or new.attempt_no is distinct from old.attempt_no)then raise exception 'T103 immutable additional authorization identity';end if;
 if new.purpose='additional' and not exists(select 1 from public.service_additional_cost_requests a join public.service_requests r on r.id=a.service_request_id where a.id=new.additional_cost_id and a.service_request_id=new.service_request_id and r.customer_id=new.customer_id and a.status='customer_accepted' and a.requested_amount=new.amount and a.version=new.approval_version and a.original_quote_id=new.quote_id)then raise exception 'T103 additional approval mismatch';end if;
 return new;
end $$;
create trigger t103_intent_identity before insert or update on public.finance_payment_intents for each row execute function t100_private.t103_intent_identity();
create table public.t103_finance_parts(
 id uuid primary key default gen_random_uuid(),finalization_id uuid not null references public.t100_finalizations(id),intent_id uuid not null references public.finance_payment_intents(id),
 operation text not null check(operation in('capture','cancel','refund','no_op')),amount numeric(12,2)not null check(amount>=0),authorization_amount numeric(12,2)not null check(authorization_amount>=0),
 state text not null default 'pending'check(state in('pending','running','unknown','failed','verified','blocked')),reservation uuid,reserved_at timestamptz,provider_operation_id text,
 remaining_authorization_verified boolean not null default false,created_at timestamptz not null default clock_timestamp(),verified_at timestamptz,
 unique(finalization_id,intent_id),check((state='verified')=(verified_at is not null))
);
alter table public.t103_finance_parts enable row level security;
revoke all on public.t103_finance_parts from public,anon,authenticated,service_role;
grant select on public.t103_finance_parts to service_role;
alter table public.t100_finalizations add column multi_payment boolean not null default false;
create function public.t103_ensure_additional_intent(p_cost_id uuid,p_customer_id uuid,p_expected_version integer,p_new_attempt boolean default false)returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.service_additional_cost_requests%rowtype;r public.service_requests%rowtype;i public.finance_payment_intents%rowtype;prior public.finance_payment_intents%rowtype;created public.finance_payment_intents%rowtype;next_no integer;
begin
 if p_new_attempt is null then raise exception 'T103 explicit retry decision required';end if;
 perform t100_private.assert_actor(p_customer_id,'customer');
 select * into a from public.service_additional_cost_requests where id=p_cost_id;
 select * into r from public.service_requests where id=a.service_request_id for update;
 if r.id is null or r.customer_id<>p_customer_id then raise exception 'T103 forbidden';end if;
 select * into a from public.service_additional_cost_requests where id=p_cost_id for update;
 if a.status<>'customer_accepted' or a.version is distinct from p_expected_version then raise exception 'T103 approval version conflict';end if;
 if r.status in('cancelled','completed','technician_unavailable')or not exists(select 1 from public.service_jobs where service_request_id=r.id and status in('assigned','in_progress'))or exists(select 1 from public.t100_finalizations where service_request_id=r.id)then raise exception 'T103 service resolution reserved';end if;
 select * into i from public.finance_payment_intents where service_request_id=r.id and purpose='initial' for update;
 if i.id is null or i.environment<>'sandbox' or not exists(select 1 from public.users where id=p_customer_id and is_active and is_test)then raise exception 'T103 approved Sandbox payment required';end if;
 select * into prior from public.finance_payment_intents where additional_cost_id=p_cost_id order by attempt_no desc limit 1 for update;
 if prior.id is not null and not p_new_attempt then return jsonb_build_object('intentId',prior.id,'status',prior.status,'attempt',prior.attempt_no);end if;
 if p_new_attempt and(prior.id is null or prior.status<>'authorization_failed' or exists(select 1 from public.finance_iyzico_operations o where o.intent_id=prior.id and o.operation='authorize'and(o.state<>'declined'or o.signature_verified is not true))or not(
 exists(select 1 from public.finance_iyzico_operations o where o.intent_id=prior.id and o.operation='authorize'and o.state='declined'and o.signature_verified)or(i.provider='fake'and exists(select 1 from public.finance_transactions t where t.intent_id=prior.id and t.operation='authorize'and t.status='failed'))))then raise exception 'T103 pending or uncertain authorization is not safe to retry';end if;
 next_no:=coalesce(prior.attempt_no,0)+1;
 insert into public.finance_payment_intents(service_request_id,quote_id,customer_id,provider,environment,purpose,currency,amount,creation_idempotency_key,additional_cost_id,approval_version,attempt_no)
 values(r.id,a.original_quote_id,p_customer_id,i.provider,i.environment,'additional',i.currency,a.requested_amount,'additional:'||a.id::text||':'||a.version::text||':'||next_no::text,a.id,a.version,next_no)returning * into created;
 return jsonb_build_object('intentId',created.id,'status',created.status,'attempt',created.attempt_no);
end $$;
alter function public.stage10_customer_decide_additional_cost(uuid,uuid,boolean,integer)set schema t100_private;
alter function t100_private.stage10_customer_decide_additional_cost(uuid,uuid,boolean,integer)rename to pre_t103_cost_decision;
create function public.stage10_customer_decide_additional_cost(p_id uuid,p_customer_id uuid,p_accept boolean,p_expected_version integer)returns text language plpgsql security definer set search_path='' as $$
declare req uuid;result text;v integer;
begin
 select service_request_id into req from public.service_additional_cost_requests where id=p_id;
 perform 1 from public.service_requests where id=req for update;
 if exists(select 1 from public.t100_finalizations where service_request_id=req)then raise exception 'T103 service resolution reserved';end if;
 result:=t100_private.pre_t103_cost_decision(p_id,p_customer_id,p_accept,p_expected_version);
 if p_accept then select version into v from public.service_additional_cost_requests where id=p_id;perform public.t103_ensure_additional_intent(p_id,p_customer_id,v,false);end if;
 return result;
end $$;
create function public.t103_funding_state(p_request_id uuid,p_actor_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype;role_name text;approved numeric;secured numeric;parts jsonb;
begin
 select * into r from public.service_requests where id=p_request_id;
 select role into role_name from public.users where id=p_actor_id and is_active;
 if r.id is null or role_name is null or not(role_name='admin'or(role_name='customer'and r.customer_id=p_actor_id)or(role_name='technician'and exists(select 1 from public.service_jobs where service_request_id=r.id and technician_id=p_actor_id)))then raise exception 'T103 forbidden';end if;
 approved:=public.t100_approved_total(r.id);
 select coalesce(sum(case when i.status in('authorized','captured')and i.authorized_amount=i.amount and i.refunded_amount=0 and ((i.provider='fake'and exists(select 1 from public.finance_transactions t where t.intent_id=i.id and t.operation='authorize'and t.status='succeeded'and t.amount=i.amount))or(i.provider='iyzico'and exists(select 1 from public.finance_iyzico_operations e where e.intent_id=i.id and e.operation='authorize'and e.state='succeeded'and e.signature_verified and e.provider_phase='PRE_AUTH'and e.amount=i.amount and e.payment_id=i.provider_reference)))and not exists(select 1 from public.finance_iyzico_operations o where o.intent_id=i.id and o.operation in('authorize','capture','cancel','refund')and o.state in('unknown','in_flight'))then i.amount else 0 end),0),
 coalesce(jsonb_agg(jsonb_build_object('intentId',i.id,'costId',i.additional_cost_id,'purpose',i.purpose,'attempt',i.attempt_no,'status',i.status,'amountMinor',round(i.amount*100),'approvalVersion',i.approval_version,'uncertain',exists(select 1 from public.finance_iyzico_operations u where u.intent_id=i.id and u.operation in('authorize','capture','cancel','refund')and u.state in('in_flight','unknown')),'canRetry',i.status='authorization_failed'and not exists(select 1 from public.finance_iyzico_operations u where u.intent_id=i.id and u.operation='authorize'and(u.state<>'declined'or not u.signature_verified))and(exists(select 1 from public.finance_iyzico_operations u where u.intent_id=i.id and u.operation='authorize'and u.state='declined'and u.signature_verified)or i.provider='fake'and exists(select 1 from public.finance_transactions t where t.intent_id=i.id and t.operation='authorize'and t.status='failed')),'secured',i.status in('authorized','captured')and i.authorized_amount=i.amount and i.refunded_amount=0 and((i.provider='fake'and exists(select 1 from public.finance_transactions t where t.intent_id=i.id and t.operation='authorize'and t.status='succeeded'and t.amount=i.amount))or(i.provider='iyzico'and exists(select 1 from public.finance_iyzico_operations u where u.intent_id=i.id and u.operation='authorize'and u.state='succeeded'and u.signature_verified and u.provider_phase='PRE_AUTH'and u.amount=i.amount and u.payment_id=i.provider_reference)))and not exists(select 1 from public.finance_iyzico_operations u where u.intent_id=i.id and u.operation in('authorize','capture','cancel','refund')and u.state in('in_flight','unknown')))order by i.created_at,i.id),'[]'::jsonb)into secured,parts
 from public.finance_payment_intents i where i.service_request_id=r.id and(i.purpose='initial'or i.attempt_no=(select max(x.attempt_no)from public.finance_payment_intents x where x.additional_cost_id=i.additional_cost_id));
 return jsonb_build_object('approvedMinor',round(approved*100),'securedMinor',round(secured*100),'fullySecured',approved>0 and approved=secured,'parts',parts);
end $$;
-- RLS is complemented by explicit RPC grants; private legacy helpers remain inaccessible.
do $acl$ declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and(p.proname like 't103_%'or p.proname='stage10_customer_decide_additional_cost')loop execute 'revoke all on function '||f.signature||' from public,anon,authenticated';execute 'grant execute on function '||f.signature||' to service_role';end loop;end $acl$;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
