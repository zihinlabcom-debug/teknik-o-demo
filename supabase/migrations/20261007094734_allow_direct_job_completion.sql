-- Direct job completion flow without a mandatory "start job" action.
-- Scheduled requests can be completed only on or after the customer's selected service date.
-- Immediate requests may be completed without an appointment.

begin;

create or replace function public.guard_service_job_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'assigned' then
      raise exception 'New job must start assigned';
    end if;

    if new.started_at is not null
       or new.completed_at is not null
       or new.cancelled_at is not null then
      raise exception 'New assigned job cannot have terminal timestamps';
    end if;

    return new;
  end if;

  if new.technician_id is distinct from old.technician_id then
    raise exception 'Assigned technician is immutable';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'assigned'
       and new.status not in ('in_progress', 'completed', 'cancelled') then
      raise exception 'Invalid job status transition';
    elsif old.status = 'in_progress'
       and new.status not in ('completed', 'cancelled') then
      raise exception 'Invalid job status transition';
    elsif old.status in ('completed', 'cancelled') then
      raise exception 'Terminal job status is immutable';
    end if;
  end if;

  if new.status = 'assigned'
     and (
       new.started_at is not null
       or new.completed_at is not null
       or new.cancelled_at is not null
     ) then
    raise exception 'Assigned job timestamps are invalid';
  end if;

  if new.status = 'in_progress'
     and (
       new.started_at is null
       or new.completed_at is not null
       or new.cancelled_at is not null
     ) then
    raise exception 'In-progress job timestamps are invalid';
  end if;

  if new.status = 'completed'
     and (
       new.completed_at is null
       or new.cancelled_at is not null
     ) then
    raise exception 'Completed job timestamps are invalid';
  end if;

  if new.status = 'cancelled'
     and new.cancelled_at is null then
    raise exception 'Cancelled job requires cancelled_at';
  end if;

  return new;
end;
$$;

create or replace function public.complete_service_job(
  p_job_id uuid,
  p_technician_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_job public.service_jobs%rowtype;
  selected_appointment public.service_appointments%rowtype;
  request_mode text;
  request_date date;
  local_today date;
  appointment_date date;
  has_active_appointment boolean := false;
begin
  if p_job_id is null or p_technician_id is null then
    raise exception 'Job completion requires job and technician';
  end if;

  select *
    into selected_job
  from public.service_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  if selected_job.technician_id is distinct from p_technician_id then
    raise exception 'Technician is not assigned to this job';
  end if;

  if not exists (
    select 1
    from public.users
    where id = p_technician_id
      and role = 'technician'
      and is_active
  ) then
    raise exception 'Technician account is not active';
  end if;

  if selected_job.status = 'completed' then
    return selected_job.id;
  end if;

  if selected_job.status not in ('assigned', 'in_progress') then
    raise exception 'Job is not available to complete';
  end if;

  select requested_service_mode, requested_service_date
    into request_mode, request_date
  from public.service_requests
  where id = selected_job.service_request_id
  for update;

  if not found then
    raise exception 'Service request not found';
  end if;

  if request_mode = 'immediate' then
    if request_date is not null then
      raise exception 'Immediate request cannot contain a requested service date';
    end if;
  elsif request_mode = 'scheduled' then
    if request_date is null then
      raise exception 'Scheduled request requires a requested service date';
    end if;

    local_today := (now() at time zone 'Europe/Istanbul')::date;

    if local_today < request_date then
      raise exception 'Scheduled job cannot be completed before requested service date';
    end if;
  else
    raise exception 'Invalid requested service mode';
  end if;

  select *
    into selected_appointment
  from public.service_appointments
  where job_id = p_job_id
    and status in ('scheduled', 'confirmed')
  order by created_at
  limit 1
  for update;

  has_active_appointment := found;

  if request_mode = 'scheduled' then

    if not has_active_appointment then
      raise exception 'Scheduled job requires an active appointment before completion';
    end if;

    appointment_date :=
      (selected_appointment.starts_at at time zone 'Europe/Istanbul')::date;

    if appointment_date is distinct from request_date then
      raise exception 'Appointment date does not match requested service date';
    end if;
  end if;

  update public.service_jobs
  set
    status = 'completed',
    completed_at = coalesce(completed_at, now())
  where id = p_job_id;

  if has_active_appointment then
    update public.service_appointments
    set
      status = 'completed',
      ends_at = case
        when now() > starts_at then now()
        else null
      end,
      updated_at = now()
    where id = selected_appointment.id;
  end if;

  return p_job_id;
end;
$$;

revoke all on function public.guard_service_job_lifecycle()
  from public, anon, authenticated;

revoke all on function public.complete_service_job(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.complete_service_job(uuid, uuid)
  to service_role;

commit;
