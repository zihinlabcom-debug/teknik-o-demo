-- T100 stage 1: durable confirmation and exclusive finalization. Local draft only.
begin;
create schema if not exists t100_private;
revoke all on schema t100_private from public,anon,authenticated,service_role;
create table public.t100_completion_reports(
 job_id uuid primary key references public.service_jobs(id),
 service_request_id uuid not null references public.service_requests(id),
 technician_id uuid not null references public.users(id),
 reported_at timestamptz not null default clock_timestamp(),
 deadline timestamptz not null,
 response text not null default 'pending' check(response in ('pending','yes','no')),
 resolution text check(resolution in ('customer_yes','timeout','admin_distribute','admin_refund')),
 complaint_id uuid references public.service_complaints(id),
 voided_at timestamptz,
 check(deadline=reported_at+interval '1 hour')
);
create table public.t100_finalizations(
 id uuid primary key default gen_random_uuid(),
 service_request_id uuid not null unique references public.service_requests(id),
 job_id uuid references public.service_jobs(id),
 source text not null check(source in ('customer_yes','timeout','admin_distribute','admin_refund','customer_cancel')),
 action text not null check(action in ('distribute','refund','cancel')),
 amount numeric(12,2) not null check(amount>=0),
 intent_id uuid references public.finance_payment_intents(id),
 state text not null default 'pending' check(state in ('pending','running','unknown','failed','verified','blocked')),
 provider_operation_id text,
 reservation uuid,
 reserved_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 verified_at timestamptz,
 check((state='verified')=(verified_at is not null)),
 check((source='admin_refund' and action='refund') or (source='customer_cancel' and action='cancel') or
       (source in ('customer_yes','timeout','admin_distribute') and action='distribute'))
);
create table public.t100_distribution_simulations(
 finalization_id uuid primary key references public.t100_finalizations(id),
 service_request_id uuid not null unique references public.service_requests(id),
 technician_id uuid references public.users(id),
 total_minor bigint not null check(total_minor>0),
 technician_minor bigint not null check(technician_minor>=0),
 platform_minor bigint not null check(platform_minor>=0),
 purpose text not null check(purpose in ('service','cancellation_fee')),
 mode text not null default 'simulation' check(mode='simulation'),
 bank_transfer boolean not null default false check(not bank_transfer),
 created_at timestamptz not null default clock_timestamp(),
 check(total_minor=technician_minor+platform_minor),
 check((purpose='service' and technician_minor=round(total_minor*0.70)) or
       (purpose='cancellation_fee' and technician_minor=0 and total_minor<=10000))
);
alter table public.t100_completion_reports enable row level security;
alter table public.t100_finalizations enable row level security;
alter table public.t100_distribution_simulations enable row level security;
revoke all on public.t100_completion_reports,public.t100_finalizations,public.t100_distribution_simulations from public,anon,authenticated;
-- Only server-side RPCs may write. No direct service_role mutation of the decision journal.
revoke all on public.t100_completion_reports,public.t100_finalizations,public.t100_distribution_simulations from service_role;
grant select on public.t100_completion_reports,public.t100_finalizations,public.t100_distribution_simulations to service_role;

create function t100_private.assert_actor(p_actor uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.stage10_active_role(p_actor,p_role) then raise exception 'T100 forbidden'; end if;
end $$;

-- Retain the old completion implementation, but remove it from callable public RPCs.
alter function public.complete_service_job(uuid,uuid) set schema t100_private;
alter function t100_private.complete_service_job(uuid,uuid) rename to legacy_complete_service_job;
revoke all on function t100_private.legacy_complete_service_job(uuid,uuid) from public,anon,authenticated,service_role;

create function public.complete_service_job(p_job_id uuid,p_technician_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare j public.service_jobs%rowtype; r public.t100_completion_reports%rowtype;
 req public.service_requests%rowtype; a public.service_appointments%rowtype; stamp timestamptz;
begin
 perform t100_private.assert_actor(p_technician_id,'technician');
 -- All T100 paths serialize on the request first, then the current job.
 select * into j from public.service_jobs where id=p_job_id;
 if not found or j.technician_id<>p_technician_id then raise exception 'T100 forbidden'; end if;
 select * into req from public.service_requests where id=j.service_request_id for update;
 select * into j from public.service_jobs where id=p_job_id for update;
 if j.technician_id<>p_technician_id then raise exception 'T100 assignment changed'; end if;
 select * into r from public.t100_completion_reports where job_id=p_job_id;
 if found and r.voided_at is null then return p_job_id; end if;
 if j.status not in ('assigned','in_progress') or req.status in ('cancelled','completed','technician_unavailable')
    or exists(select 1 from public.t100_finalizations where service_request_id=req.id)
 then raise exception 'T100 job not available to report'; end if;
 -- Preserve existing appointment scheduling/date restrictions for reporting.
 select * into a from public.service_appointments where job_id=j.id and status in ('scheduled','confirmed');
 if j.status='assigned' and a.id is null and clock_timestamp()>j.assigned_at+interval '1 hour'
 then raise exception 'Appointment scheduling window has expired'; end if;
 if req.requested_service_mode='scheduled' and
   (a.id is null or req.requested_service_date is null or
    (clock_timestamp() at time zone 'Europe/Istanbul')::date<req.requested_service_date or
    (a.starts_at at time zone 'Europe/Istanbul')::date<>req.requested_service_date)
 then raise exception 'Scheduled job cannot be reported before valid service date'; end if;
 stamp:=clock_timestamp();
 insert into public.t100_completion_reports(job_id,service_request_id,technician_id,reported_at,deadline)
 values(j.id,req.id,p_technician_id,stamp,stamp+interval '1 hour');
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(req.id,j.id,p_technician_id,'completion.reported','service_job',j.id,jsonb_build_object('deadline',stamp+interval '1 hour'));
 return j.id;
end $$;

create function public.t100_answer_completion(p_job_id uuid,p_customer_id uuid,p_answer text) returns jsonb
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
 update public.t100_completion_reports set response=p_answer,
 resolution=case when p_answer='yes' then 'customer_yes' else null end where job_id=p_job_id returning * into r;
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(req.id,p_job_id,p_customer_id,'completion.customer_'||p_answer,'service_job',p_job_id,'{}');
 return to_jsonb(r);
end $$;

create function public.t100_admin_finance_decision(p_job_id uuid,p_admin_id uuid,p_decision text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.t100_completion_reports%rowtype; req uuid; desired text;
begin
 perform t100_private.assert_actor(p_admin_id,'admin');
 if p_decision not in ('distribute','refund') or p_decision is null then raise exception 'T100 invalid decision'; end if;
 select service_request_id into req from public.service_jobs where id=p_job_id;
 perform 1 from public.service_requests where id=req for update;
 select * into r from public.t100_completion_reports where job_id=p_job_id for update;
 desired:='admin_'||p_decision;
 if not found or r.response<>'no' or r.voided_at is not null or r.complaint_id is null then raise exception 'T100 complaint review required'; end if;
 if r.resolution is not null then
  if r.resolution=desired then return to_jsonb(r); end if;
  raise exception 'T100 resolution conflict';
 end if;
 if exists(select 1 from public.t100_finalizations where service_request_id=req) then raise exception 'T100 resolution conflict'; end if;
 update public.t100_completion_reports set resolution=desired where job_id=p_job_id returning * into r;
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(req,p_job_id,p_admin_id,'completion.'||desired,'service_job',p_job_id,'{}');
 return to_jsonb(r);
end $$;

create function public.t100_expire_completions(p_limit integer default 50) returns integer
language plpgsql security definer set search_path='' as $$
declare r record; total integer:=0;
begin
 if p_limit not between 1 and 100 then raise exception 'T100 invalid batch'; end if;
 for r in select q.id req,c.job_id from public.t100_completion_reports c
 join public.service_requests q on q.id=c.service_request_id
 where c.response='pending' and c.resolution is null and c.voided_at is null and c.deadline<=clock_timestamp()
 order by c.deadline limit p_limit for update of q skip locked
 loop
  update public.t100_completion_reports c set resolution='timeout'
  where c.job_id=r.job_id and c.response='pending' and c.resolution is null and c.voided_at is null
   and not exists(select 1 from public.t100_finalizations f where f.service_request_id=r.req);
  if found then total:=total+1; end if;
 end loop;
 return total;
end $$;

-- A direct UPDATE or old endpoint cannot silently complete a new/pending job.
create function t100_private.guard_completion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='completed' and old.status is distinct from 'completed' and not exists(
  select 1 from public.t100_completion_reports c where c.job_id=new.id and c.voided_at is null
   and c.resolution in ('customer_yes','timeout','admin_distribute')
 ) then raise exception 'T100 customer completion decision required'; end if;
 return new;
end $$;
create trigger t100_completion_guard before update of status on public.service_jobs
for each row execute function t100_private.guard_completion();

revoke all on function public.complete_service_job(uuid,uuid),
 public.t100_answer_completion(uuid,uuid,text),public.t100_admin_finance_decision(uuid,uuid,text),
 public.t100_expire_completions(integer) from public,anon,authenticated;
grant execute on function public.complete_service_job(uuid,uuid),
 public.t100_answer_completion(uuid,uuid,text),public.t100_admin_finance_decision(uuid,uuid,text),
 public.t100_expire_completions(integer) to service_role;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
