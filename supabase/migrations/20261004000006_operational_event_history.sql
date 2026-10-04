-- Stage 1.5 / Stage 6. Log real DB transitions in the same transaction.
begin;

do $$ begin
  if to_regclass('public.operational_events') is null
     or to_regclass('public.service_jobs') is null
     or to_regclass('public.service_appointments') is null
     or to_regclass('public.service_dispatches') is null
     or to_regclass('public.service_quotes') is null then
    raise exception 'Operational event prerequisites missing';
  end if;

  if exists (
    select 1
    from public.service_jobs j
    left join public.service_dispatches d on d.id=j.dispatch_id
    left join public.service_quotes q on q.id=j.accepted_quote_id
    where j.dispatch_id is null
       or j.accepted_quote_id is null
       or d.id is null
       or q.id is null
       or d.service_request_id is distinct from j.service_request_id
       or d.quote_id is distinct from j.accepted_quote_id
       or q.status is distinct from 'accepted'
       or q.service_request_id is distinct from j.service_request_id
  ) then
    raise exception 'Existing job without immutable accepted-price chain requires review';
  end if;
end $$;

create function public.guard_job_accepted_quote() returns trigger
language plpgsql set search_path='' as $$
declare
  dispatch_quote uuid;
  dispatch_request uuid;
  quote_request uuid;
  quote_status text;
begin
  if tg_op='UPDATE' and (
       new.service_request_id is distinct from old.service_request_id
       or new.dispatch_id is distinct from old.dispatch_id
       or new.accepted_quote_id is distinct from old.accepted_quote_id
     ) then
    raise exception 'Job request, dispatch and accepted-price references are immutable';
  end if;

  if new.dispatch_id is null or new.accepted_quote_id is null then
    raise exception 'Job requires dispatch and accepted price snapshot';
  end if;

  select quote_id,service_request_id
    into dispatch_quote,dispatch_request
    from public.service_dispatches
    where id=new.dispatch_id
    for share;

  if not found
     or dispatch_request is distinct from new.service_request_id
     or dispatch_quote is distinct from new.accepted_quote_id then
    raise exception 'Job must use its dispatch accepted-price reference';
  end if;

  select service_request_id,status
    into quote_request,quote_status
    from public.service_quotes
    where id=new.accepted_quote_id
    for share;

  if not found
     or quote_request is distinct from new.service_request_id
     or quote_status is distinct from 'accepted' then
    raise exception 'Job quote is not an accepted price snapshot';
  end if;

  return new;
end $$;

create trigger service_jobs_accepted_quote_guard
  before insert or update of service_request_id,dispatch_id,accepted_quote_id
  on public.service_jobs for each row
  execute function public.guard_job_accepted_quote();

create function public.guard_dispatch_quote_after_job() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.quote_id is distinct from old.quote_id
     and exists (select 1 from public.service_jobs where dispatch_id=old.id) then
    raise exception 'Dispatch quote cannot change after job assignment';
  end if;
  return new;
end $$;

create trigger service_dispatches_assigned_quote_guard
  before update of quote_id on public.service_dispatches
  for each row execute function public.guard_dispatch_quote_after_job();

create function public.reject_operational_event_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Operational events are append-only';
end $$;

create trigger operational_events_append_only
  before update or delete on public.operational_events
  for each row execute function public.reject_operational_event_mutation();

create function public.record_service_job_event() returns trigger
language plpgsql set search_path='' as $$
declare kind text;
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
  kind:=case new.status
    when 'assigned' then 'job.assigned'
    when 'in_progress' then 'job.started'
    when 'completed' then 'job.completed'
    when 'cancelled' then 'job.cancelled'
  end;
  insert into public.operational_events(
    service_request_id,job_id,dispatch_id,event_type,entity_type,entity_id,payload
  ) values (
    new.service_request_id,new.id,new.dispatch_id,kind,'service_job',new.id,'{}'::jsonb
  );
  return new;
end $$;

create trigger service_jobs_history
  after insert or update of status on public.service_jobs
  for each row execute function public.record_service_job_event();

create function public.record_service_appointment_event() returns trigger
language plpgsql set search_path='' as $$
declare kind text;
declare job_request uuid;
declare job_dispatch uuid;
begin
  if tg_op='UPDATE' then
    if row(new.status,new.starts_at,new.ends_at)
       is not distinct from row(old.status,old.starts_at,old.ends_at) then
      return new;
    end if;
    if new.status is not distinct from old.status then
      kind:='appointment.rescheduled';
    end if;
  end if;
  if kind is null then kind:='appointment.' || new.status; end if;
  select service_request_id,dispatch_id into job_request,job_dispatch
    from public.service_jobs where id=new.job_id;
  insert into public.operational_events(
    service_request_id,job_id,dispatch_id,event_type,entity_type,entity_id,payload
  ) values (
    job_request,new.job_id,job_dispatch,kind,'service_appointment',new.id,'{}'::jsonb
  );
  return new;
end $$;

create trigger service_appointments_history
  after insert or update of status,starts_at,ends_at on public.service_appointments
  for each row execute function public.record_service_appointment_event();

revoke all on function public.guard_job_accepted_quote() from public,anon,authenticated;
revoke all on function public.guard_dispatch_quote_after_job() from public,anon,authenticated;
revoke all on function public.reject_operational_event_mutation() from public,anon,authenticated;
revoke all on function public.record_service_job_event() from public,anon,authenticated;
revoke all on function public.record_service_appointment_event() from public,anon,authenticated;

commit;
