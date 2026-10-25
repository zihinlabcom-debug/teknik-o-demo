begin;
create table public.t100_cancellations(
 id uuid primary key default gen_random_uuid(),service_request_id uuid not null references public.service_requests(id),
 job_id uuid references public.service_jobs(id),actor_id uuid not null references public.users(id),
 actor_role text not null check(actor_role in ('customer','technician')),reason text not null check(length(reason) between 2 and 1000),
 policy_version text not null,fee_minor bigint not null check(fee_minor between 0 and 10000),
 points integer not null default 0 check(points in (0,5,10)),
 finalization_id uuid unique references public.t100_finalizations(id),
 state text not null default 'pending' check(state in ('pending','completed')),
 created_at timestamptz not null default clock_timestamp(),unique(job_id,actor_role)
);
create unique index t100_customer_cancel_once on public.t100_cancellations(service_request_id) where actor_role='customer';
create table public.t100_reviews(
 service_request_id uuid primary key references public.service_requests(id),
 job_id uuid not null references public.service_jobs(id),
 customer_id uuid not null references public.users(id),
 complaint_id uuid references public.service_complaints(id),
 status text not null default 'open' check(status in ('open','resolved')),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.t100_cancellations enable row level security;
alter table public.t100_reviews enable row level security;
revoke all on public.t100_cancellations,public.t100_reviews from public,anon,authenticated,service_role;
grant select on public.t100_cancellations,public.t100_reviews to service_role;

create function public.t100_cancellation_policy(p_request_id uuid,p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.service_requests%rowtype;j public.service_jobs%rowtype;a public.service_appointments%rowtype;
 role_name text; result jsonb; fee bigint:=0;points integer:=0;amount bigint;action text; stamp timestamptz; count_a integer;
begin
 select * into r from public.service_requests where id=p_request_id for update;
 if not found then raise exception 'T100 not found'; end if;
 select role into role_name from public.users where id=p_actor_id and is_active;
 select * into j from public.service_jobs where service_request_id=r.id
 order by (status in ('assigned','in_progress')) desc,assigned_at desc,id desc limit 1 for update;
 if role_name='customer' and r.customer_id=p_actor_id then null;
 elsif role_name='technician' and j.technician_id=p_actor_id and j.status in ('assigned','in_progress') then null;
 else raise exception 'T100 forbidden'; end if;
 select count(*) into count_a from public.service_appointments where job_id=j.id and status in ('scheduled','confirmed');
 if count_a>1 then raise exception 'T100 ambiguous appointment'; end if;
 select * into a from public.service_appointments where job_id=j.id and status in ('scheduled','confirmed') for update;
 select round(q.total_amount*100)::bigint into amount from public.service_quotes q where q.service_request_id=r.id and q.status='accepted' order by version desc limit 1;
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

create function public.t100_customer_cancel(p_request_id uuid,p_customer_id uuid,p_version text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare policy jsonb; c public.t100_cancellations%rowtype; f uuid;i uuid;
begin
 perform t100_private.assert_actor(p_customer_id,'customer');
 perform 1 from public.service_requests where id=p_request_id and customer_id=p_customer_id for update;
 if not found then raise exception 'T100 forbidden'; end if;
 select * into c from public.t100_cancellations where service_request_id=p_request_id and actor_role='customer';
 if found then return to_jsonb(c); end if;
 policy:=public.t100_cancellation_policy(p_request_id,p_customer_id);
 if policy->>'action'<>'cancel' then raise exception 'T100 direct cancellation not available'; end if;
 if p_version is distinct from policy->>'version' then raise exception 'T100 policy changed; reconfirm'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 2 and 1000 then raise exception 'T100 reason required'; end if;
 if exists(select 1 from public.t100_finalizations where service_request_id=p_request_id)
 or exists(select 1 from public.t100_reviews where service_request_id=p_request_id and status='open')
 or exists(select 1 from public.t100_completion_reports where service_request_id=p_request_id and voided_at is null and (response='no' or resolution is not null))
 then raise exception 'T100 resolution conflict'; end if;
 select id into i from public.finance_payment_intents where service_request_id=p_request_id and purpose='initial';
 insert into public.t100_finalizations(service_request_id,job_id,source,action,amount,intent_id)
 values(p_request_id,(policy->>'jobId')::uuid,'customer_cancel','cancel',(policy->>'feeMinor')::numeric/100,i) returning id into f;
 insert into public.t100_cancellations(service_request_id,job_id,actor_id,actor_role,reason,policy_version,fee_minor,finalization_id)
 values(p_request_id,(policy->>'jobId')::uuid,p_customer_id,'customer',btrim(p_reason),p_version,(policy->>'feeMinor')::bigint,f) returning * into c;
 update public.t100_completion_reports set voided_at=clock_timestamp() where service_request_id=p_request_id and voided_at is null;
 insert into public.operational_events(service_request_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(p_request_id,p_customer_id,'cancellation.customer_pending','t100_cancellation',c.id,jsonb_build_object('feeMinor',c.fee_minor));
 return to_jsonb(c);
end $$;

create function public.t100_open_cancellation_review(p_request_id uuid,p_customer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare policy jsonb;
begin
 perform t100_private.assert_actor(p_customer_id,'customer');
 policy:=public.t100_cancellation_policy(p_request_id,p_customer_id);
 if policy->>'action'<>'review' then raise exception 'T100 review not available'; end if;
 if exists(select 1 from public.t100_finalizations where service_request_id=p_request_id) then raise exception 'T100 resolution conflict'; end if;
 insert into public.t100_reviews(service_request_id,job_id,customer_id)
 values(p_request_id,(policy->>'jobId')::uuid,p_customer_id) on conflict(service_request_id) do nothing;
 insert into public.operational_events(service_request_id,actor_user_id,event_type,entity_type,entity_id,payload)
 select p_request_id,p_customer_id,'cancellation.review_opened','service_request',p_request_id,'{}'
 where not exists(select 1 from public.operational_events where service_request_id=p_request_id and event_type='cancellation.review_opened');
 return p_request_id;
end $$;

-- Completion decisions and expiry must observe the same review hold.
create function t100_private.guard_completion_hold() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.resolution in ('customer_yes','timeout') and exists(
  select 1 from public.t100_reviews where service_request_id=new.service_request_id and status='open'
 ) then raise exception 'T100 open cancellation review'; end if;
 return new;
end $$;
create trigger t100_completion_hold before insert or update on public.t100_completion_reports
for each row execute function t100_private.guard_completion_hold();

revoke all on function public.t100_cancellation_policy(uuid,uuid),public.t100_customer_cancel(uuid,uuid,text,text),
 public.t100_open_cancellation_review(uuid,uuid) from public,anon,authenticated;
grant execute on function public.t100_cancellation_policy(uuid,uuid),public.t100_customer_cancel(uuid,uuid,text,text),
 public.t100_open_cancellation_review(uuid,uuid) to service_role;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
