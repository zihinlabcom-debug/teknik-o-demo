-- Create technician appointment atomically and enforce service scheduling rules.

begin;

create or replace function public.guard_service_request_schedule_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.requested_service_mode is distinct from old.requested_service_mode
     or new.requested_service_date is distinct from old.requested_service_date then
    raise exception 'Requested service schedule is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists service_requests_schedule_immutable
  on public.service_requests;

create trigger service_requests_schedule_immutable
  before update of requested_service_mode, requested_service_date
  on public.service_requests
  for each row
  execute function public.guard_service_request_schedule_immutable();

create or replace function public.create_service_appointment(
  p_job_id uuid,
  p_technician_id uuid,
  p_starts_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_job public.service_jobs%rowtype;
  existing_appointment public.service_appointments%rowtype;
  request_mode text;
  request_date date;
  local_start_date date;
  local_start_time time;
  new_appointment_id uuid;
  violated_constraint text;
begin
  if p_job_id is null
     or p_technician_id is null
     or p_starts_at is null then
    raise exception 'Appointment requires job, technician and start time';
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

  select *
    into existing_appointment
  from public.service_appointments
  where job_id = p_job_id
    and status in ('scheduled', 'confirmed')
  order by created_at
  limit 1
  for update;

  if found then
    if existing_appointment.starts_at = p_starts_at then
      return existing_appointment.id;
    end if;

    raise exception 'Active appointment already exists for this job';
  end if;

  if selected_job.status <> 'assigned' then
    raise exception 'Job is not available for appointment scheduling';
  end if;

  if now() > selected_job.assigned_at + interval '1 hour' then
    raise exception 'Appointment scheduling window has expired';
  end if;

  if p_starts_at < now() then
    raise exception 'Appointment cannot start in the past';
  end if;

  select requested_service_mode, requested_service_date
    into request_mode, request_date
  from public.service_requests
  where id = selected_job.service_request_id
  for update;

  if not found then
    raise exception 'Service request not found';
  end if;

  local_start_date := (p_starts_at at time zone 'Europe/Istanbul')::date;
  local_start_time := (p_starts_at at time zone 'Europe/Istanbul')::time;

  if local_start_time > time '20:00' then
    raise exception 'Appointment cannot start after 20:00';
  end if;

  if request_mode = 'scheduled' then
    if request_date is null
       or local_start_date is distinct from request_date then
      raise exception 'Appointment date must match requested service date';
    end if;
  elsif request_mode = 'immediate' then
    if request_date is not null then
      raise exception 'Immediate request cannot contain a requested service date';
    end if;

    if p_starts_at > selected_job.assigned_at + interval '24 hours' then
      raise exception 'Immediate appointment must be within 24 hours of assignment';
    end if;
  else
    raise exception 'Invalid requested service mode';
  end if;

  begin
    insert into public.service_appointments(
      job_id,
      starts_at,
      ends_at,
      status
    )
    values (
      p_job_id,
      p_starts_at,
      null,
      'scheduled'
    )
    returning id into new_appointment_id;
  exception
    when unique_violation then
      get stacked diagnostics violated_constraint = constraint_name;

      if violated_constraint = 'service_appointments_one_active_per_job_idx' then
        select *
          into existing_appointment
        from public.service_appointments
        where job_id = p_job_id
          and status in ('scheduled', 'confirmed')
        order by created_at
        limit 1;

        if found and existing_appointment.starts_at = p_starts_at then
          return existing_appointment.id;
        end if;

        raise exception 'Active appointment already exists for this job';
      end if;

      raise;
  end;

  return new_appointment_id;
end;
$$;

revoke all on function public.guard_service_request_schedule_immutable()
  from public, anon, authenticated;

revoke all on function public.create_service_appointment(uuid, uuid, timestamptz)
  from public, anon, authenticated;

grant execute on function public.create_service_appointment(uuid, uuid, timestamptz)
  to service_role;

commit;