begin;
create table public.t100_penalty_entries(
 cancellation_id uuid primary key references public.t100_cancellations(id),
 job_id uuid not null unique references public.service_jobs(id),
 technician_id uuid not null references public.users(id),
 points integer not null check(points in (5,10)),created_at timestamptz not null default clock_timestamp()
);
alter table public.t100_penalty_entries enable row level security;
revoke all on public.t100_penalty_entries from public,anon,authenticated,service_role;
grant select on public.t100_penalty_entries to service_role;
alter table public.service_request_technician_exclusions drop constraint service_request_technician_exclusions_reason_check;
alter table public.service_request_technician_exclusions add constraint service_request_technician_exclusions_reason_check
 check(reason in ('declined','appointment_timeout','technician_cancelled'));

create function t100_private.is_cancel_source(p_job uuid,p_request uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.t100_cancellations c join public.service_jobs j on j.id=c.job_id
 where c.job_id=p_job and c.service_request_id=p_request and c.actor_role='technician' and c.state='completed'
 and j.status='cancelled' and j.technician_id=c.actor_id)
$$;

-- Preserve terminal and two-timeout-cycle guards. A verified voluntary cancellation
-- is the sole new exception; it is not recorded as an appointment timeout.
create or replace function public.guard_terminal_assignment() returns trigger
language plpgsql security definer set search_path='' as $$
declare status text;
begin
 if tg_op='UPDATE' and new.service_request_id is distinct from old.service_request_id then raise exception 'Assignment service request is immutable'; end if;
 select r.status into status from public.service_requests r where id=new.service_request_id for update;
 if status='technician_unavailable' then raise exception 'Terminal service request cannot be assigned or redistributed'; end if;
 if tg_table_name='service_distribution_cycles' and tg_op='INSERT' then
 if not t100_private.is_cancel_source(new.source_job_id,new.service_request_id) and
 (select count(*) from public.service_distribution_cycles c where c.service_request_id=new.service_request_id
  and not t100_private.is_cancel_source(c.source_job_id,c.service_request_id))>=2
 then raise exception 'Automatic distribution is limited to two timeout cycles'; end if;
 end if;
 return new;
end $$;

alter function public.start_service_distribution_cycle(uuid,uuid,uuid) set schema t100_private;
alter function t100_private.start_service_distribution_cycle(uuid,uuid,uuid) rename to legacy_start_distribution;
create function public.start_service_distribution_cycle(p_service_request_id uuid,p_quote_id uuid,p_source_job_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;request_status text;
begin
 select r.status into request_status from public.service_requests r where r.id=p_service_request_id for update;
 if request_status is null or request_status in ('cancelled','completed','technician_unavailable') then raise exception 'Terminal service request cannot be redistributed'; end if;
 if not t100_private.is_cancel_source(p_source_job_id,p_service_request_id) then
  return t100_private.legacy_start_distribution(p_service_request_id,p_quote_id,p_source_job_id);
 end if;
 select id into result from public.service_distribution_cycles where source_job_id=p_source_job_id;
 if found then return result; end if;
 if exists(select 1 from public.service_jobs where service_request_id=p_service_request_id and status in ('assigned','in_progress'))
 or exists(select 1 from public.service_distribution_cycles where service_request_id=p_service_request_id and status='active')
 or exists(select 1 from public.t100_finalizations where service_request_id=p_service_request_id)
 then raise exception 'T100 active operation conflict'; end if;
 if not exists(select 1 from public.service_jobs where id=p_source_job_id and accepted_quote_id=p_quote_id)
 or not exists(select 1 from public.service_quotes where id=p_quote_id and service_request_id=p_service_request_id and status='accepted')
 then raise exception 'T100 accepted quote mismatch'; end if;
 perform public.finance_assert_distribution_ready(p_service_request_id,p_quote_id);
 insert into public.service_distribution_cycles(service_request_id,quote_id,source_job_id,status,current_round)
 values(p_service_request_id,p_quote_id,p_source_job_id,'active',0) returning id into result;
 perform public.open_service_distribution_round(result);
 insert into public.operational_events(service_request_id,job_id,event_type,entity_type,entity_id,payload)
 values(p_service_request_id,p_source_job_id,'distribution.technician_cancelled_restart','service_distribution_cycle',result,
 jsonb_build_object('reset_to_round',1,'rounds',3,'round_minutes',7));
 return result;
end $$;

create function public.t100_technician_cancel(p_job_id uuid,p_technician_id uuid,p_version text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.service_jobs%rowtype;c public.t100_cancellations%rowtype;policy jsonb;cycle uuid;
begin
 perform t100_private.assert_actor(p_technician_id,'technician');
 select * into j from public.service_jobs where id=p_job_id;
 if not found or j.technician_id<>p_technician_id then raise exception 'T100 forbidden'; end if;
 perform 1 from public.service_requests where id=j.service_request_id for update;
 select * into j from public.service_jobs where id=p_job_id for update;
 select * into c from public.t100_cancellations where job_id=p_job_id and actor_role='technician';
 if found then return to_jsonb(c); end if;
 policy:=public.t100_cancellation_policy(j.service_request_id,p_technician_id);
 if policy->>'action'<>'cancel' or policy->>'jobId'<>p_job_id::text then raise exception 'T100 cancellation not available'; end if;
 if p_version is distinct from policy->>'version' then raise exception 'T100 policy changed; reconfirm'; end if;
 if p_reason not in ('availability','emergency','transport','other') or p_reason is null then raise exception 'T100 reason required'; end if;
 if exists(select 1 from public.t100_finalizations where service_request_id=j.service_request_id) or
 exists(select 1 from public.t100_completion_reports where job_id=j.id and resolution is not null)
 then raise exception 'T100 resolution conflict'; end if;
 insert into public.t100_cancellations(service_request_id,job_id,actor_id,actor_role,reason,policy_version,fee_minor,points,state)
 values(j.service_request_id,j.id,p_technician_id,'technician',p_reason,p_version,0,(policy->>'points')::integer,'completed') returning * into c;
 insert into public.t100_penalty_entries(cancellation_id,job_id,technician_id,points) values(c.id,j.id,p_technician_id,c.points);
 update public.t100_completion_reports set voided_at=clock_timestamp() where job_id=j.id and voided_at is null;
 -- Close only this assignment and its appointment; never cancel/refund the request.
 update public.service_appointments set status='cancelled' where job_id=j.id and status in ('scheduled','confirmed');
 update public.service_jobs set status='cancelled',cancelled_at=clock_timestamp() where id=j.id;
 insert into public.service_request_technician_exclusions(service_request_id,technician_id,reason,source_job_id)
 values(j.service_request_id,p_technician_id,'technician_cancelled',j.id) on conflict(service_request_id,technician_id) do nothing;
 cycle:=public.start_service_distribution_cycle(j.service_request_id,j.accepted_quote_id,j.id);
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(j.service_request_id,j.id,p_technician_id,'cancellation.technician_completed','t100_cancellation',c.id,
 jsonb_build_object('points',c.points,'distributionCycleId',cycle,'requestPreserved',true));
 return to_jsonb(c)||jsonb_build_object('distributionCycleId',cycle);
end $$;
revoke all on function public.t100_technician_cancel(uuid,uuid,text,text),public.start_service_distribution_cycle(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.t100_technician_cancel(uuid,uuid,text,text),public.start_service_distribution_cycle(uuid,uuid,uuid) to service_role;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;

-- Existing timeout source/cycle checks are retained; verified voluntary restarts do not consume their two-cycle budget.
create or replace function t100_private.legacy_start_distribution(
  p_service_request_id uuid,
  p_quote_id uuid,
  p_source_job_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_cycle_id uuid;
  v_existing_quote_id uuid;
  v_request_status text;
  v_failure_count integer;
  v_cycle_count integer;
begin
  if p_service_request_id is null or p_quote_id is null then
    raise exception 'Distribution requires request and quote';
  end if;

  select status into v_request_status
  from public.service_requests
  where id=p_service_request_id
  for update;

  if not found then
    raise exception 'Service request not found';
  end if;
  if v_request_status='technician_unavailable' then
    raise exception 'Terminal service request cannot be redistributed';
  end if;

  if p_source_job_id is null then
    select id,quote_id
      into v_cycle_id,v_existing_quote_id
    from public.service_distribution_cycles
    where service_request_id=p_service_request_id
      and source_job_id is null
    order by created_at
    limit 1;

    if found then
      if v_existing_quote_id is distinct from p_quote_id then
        raise exception 'Initial distribution quote mismatch';
      end if;

      return v_cycle_id;
    end if;
  else
    select id
      into v_cycle_id
    from public.service_distribution_cycles
    where source_job_id=p_source_job_id
      and service_request_id=p_service_request_id
      and quote_id=p_quote_id;

    if found then
      return v_cycle_id;
    end if;

    if not exists(
      select 1
      from public.service_jobs
      where id=p_source_job_id
        and service_request_id=p_service_request_id
        and accepted_quote_id=p_quote_id
        and status='cancelled'
        and assignment_source='automatic'
    ) then
      raise exception 'Redistribution source job must be cancelled and match the accepted quote';
    end if;
  end if;

  select count(*) into v_cycle_count
  from public.service_distribution_cycles c
  where service_request_id=p_service_request_id and not t100_private.is_cancel_source(c.source_job_id,c.service_request_id);

  if p_source_job_id is null then
    if v_cycle_count<>0 then
      raise exception 'Initial distribution already exists';
    end if;
  else
    v_failure_count:=public.automatic_appointment_timeout_count(p_service_request_id);
    if v_failure_count<>1 or v_cycle_count<>1 or not exists(
      select 1
      from public.service_jobs j
      join public.service_dispatches d on d.id=j.dispatch_id
      join public.service_distribution_cycles c on c.id=d.distribution_cycle_id
      where j.id=p_source_job_id
        and c.service_request_id=p_service_request_id
        and (c.source_job_id is null or t100_private.is_cancel_source(c.source_job_id,c.service_request_id))
        and c.status='accepted'
    ) then
      raise exception 'Automatic distribution limit reached or invalid timeout source';
    end if;
  end if;

  if exists(
    select 1
    from public.service_jobs
    where service_request_id=p_service_request_id
      and status in ('assigned','in_progress')
  ) then
    raise exception 'Request already has an active job';
  end if;

  select id
    into v_cycle_id
  from public.service_distribution_cycles
  where service_request_id=p_service_request_id
    and status='active'
  order by created_at desc
  limit 1;

  if found then
    return v_cycle_id;
  end if;

  if not exists(
    select 1
    from public.service_quotes
    where id=p_quote_id
      and service_request_id=p_service_request_id
      and status='accepted'
  ) then
    raise exception 'Distribution requires accepted quote';
  end if;

  insert into public.service_distribution_cycles(
    service_request_id,
    quote_id,
    source_job_id,
    status,
    current_round,
    next_round_at
  )
  values(
    p_service_request_id,
    p_quote_id,
    p_source_job_id,
    'active',
    0,
    null
  )
  returning id into v_cycle_id;

  perform public.open_service_distribution_round(v_cycle_id);

  insert into public.operational_events(
    service_request_id,
    job_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values(
    p_service_request_id,
    p_source_job_id,
    case
      when p_source_job_id is null
        then 'distribution.started'
      else 'distribution.redistributed'
    end,
    'service_distribution_cycle',
    v_cycle_id,
    jsonb_build_object(
      'distribution_cycle_id',v_cycle_id,
      'reset_to_round',1
    )
  );

  return v_cycle_id;
end;
$$;
create or replace function public.admin_manual_assignment_ready(p_request_id uuid)
returns boolean
language plpgsql volatile security definer
set search_path=''
as $$
declare
  v_cycle public.service_distribution_cycles%rowtype;
begin
  if p_request_id is null or not exists(
    select 1 from public.service_requests r
    where r.id=p_request_id and r.status<>'technician_unavailable'
  ) then return false; end if;

  if exists(select 1 from public.service_jobs j
            where j.service_request_id=p_request_id
              and (j.status in ('assigned','in_progress') or j.assignment_source='admin_manual'))
     or exists(select 1 from public.service_distribution_cycles c
               where c.service_request_id=p_request_id and c.status='active')
  then return false; end if;

  select * into v_cycle
  from public.service_distribution_cycles c
  where c.service_request_id=p_request_id
  order by (c.source_job_id is not null) desc,c.started_at desc,c.created_at desc,c.id desc
  limit 1;
  if not found then return false; end if;

  if not exists(select 1 from public.service_quotes q
    where q.id=v_cycle.quote_id and q.service_request_id=p_request_id
      and q.status='accepted') then return false; end if;

  if v_cycle.status='exhausted' and v_cycle.current_round=3
  then return true; end if;

  -- The second accepted cycle can end before round three. Its accepted job
  -- must itself be the second recorded automatic appointment timeout.
  return v_cycle.status='accepted'
    and public.automatic_appointment_timeout_count(p_request_id)=2
    and (select count(*) from public.service_distribution_cycles c
         where c.service_request_id=p_request_id and not t100_private.is_cancel_source(c.source_job_id,c.service_request_id))=2
    and exists(
      select 1
      from public.service_jobs j
      join public.service_dispatches d on d.id=j.dispatch_id
      join public.service_request_technician_exclusions e
        on e.service_request_id=j.service_request_id
       and e.technician_id=j.technician_id
       and e.source_job_id=j.id
       and e.reason='appointment_timeout'
      where j.service_request_id=p_request_id
        and j.assignment_source='automatic'
        and j.status='cancelled'
        and d.distribution_cycle_id=v_cycle.id
    );
end;
$$;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
