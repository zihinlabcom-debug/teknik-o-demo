-- Stage 1.5 / Stage 7: legal job lifecycle and server-only lifecycle RPCs.
begin;

do $$ begin
  if to_regclass('public.service_jobs') is null
     or to_regclass('public.service_appointments') is null
     or to_regclass('public.users') is null then
    raise exception 'Operation lifecycle prerequisites missing';
  end if;
end $$;

create function public.guard_service_job_lifecycle() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then
    if new.status <> 'assigned' then
      raise exception 'New job must start assigned';
    end if;
    if new.started_at is not null or new.completed_at is not null or new.cancelled_at is not null then
      raise exception 'New assigned job cannot have terminal timestamps';
    end if;
    return new;
  end if;

  if new.technician_id is distinct from old.technician_id then
    raise exception 'Assigned technician is immutable';
  end if;

  if new.status is distinct from old.status then
    if old.status='assigned' and new.status not in ('in_progress','cancelled') then
      raise exception 'Invalid job status transition';
    elsif old.status='in_progress' and new.status not in ('completed','cancelled') then
      raise exception 'Invalid job status transition';
    elsif old.status in ('completed','cancelled') then
      raise exception 'Terminal job status is immutable';
    end if;
  end if;

  if new.status='assigned' and (new.started_at is not null or new.completed_at is not null or new.cancelled_at is not null) then
    raise exception 'Assigned job timestamps are invalid';
  end if;
  if new.status='in_progress' and (new.started_at is null or new.completed_at is not null or new.cancelled_at is not null) then
    raise exception 'In-progress job timestamps are invalid';
  end if;
  if new.status='completed' and (new.started_at is null or new.completed_at is null or new.cancelled_at is not null) then
    raise exception 'Completed job timestamps are invalid';
  end if;
  if new.status='cancelled' and new.cancelled_at is null then
    raise exception 'Cancelled job requires cancelled_at';
  end if;
  return new;
end $$;

create trigger service_jobs_lifecycle_guard
  before insert or update of technician_id,status,started_at,completed_at,cancelled_at
  on public.service_jobs for each row
  execute function public.guard_service_job_lifecycle();

create function public.guard_appointment_job_link() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and new.job_id is distinct from old.job_id then
    raise exception 'Appointment job reference is immutable';
  end if;
  return new;
end $$;

create trigger service_appointments_job_link_guard
  before update of job_id on public.service_appointments
  for each row execute function public.guard_appointment_job_link();

create function public.start_service_job(p_job_id uuid,p_technician_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare selected public.service_jobs%rowtype;
begin
  if p_job_id is null or p_technician_id is null then
    raise exception 'Job start requires job and technician';
  end if;
  select * into selected from public.service_jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found'; end if;
  if selected.technician_id is distinct from p_technician_id then
    raise exception 'Technician is not assigned to this job';
  end if;
  if not exists (select 1 from public.users where id=p_technician_id and role='technician' and is_active) then
    raise exception 'Technician account is not active';
  end if;
  if selected.status='in_progress' then return selected.id; end if;
  if selected.status<>'assigned' then raise exception 'Job is not available to start'; end if;
  update public.service_jobs set status='in_progress',started_at=coalesce(started_at,now()) where id=p_job_id;
  return p_job_id;
end $$;

create function public.complete_service_job(p_job_id uuid,p_technician_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare selected public.service_jobs%rowtype;
begin
  if p_job_id is null or p_technician_id is null then
    raise exception 'Job completion requires job and technician';
  end if;
  select * into selected from public.service_jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found'; end if;
  if selected.technician_id is distinct from p_technician_id then
    raise exception 'Technician is not assigned to this job';
  end if;
  if not exists (select 1 from public.users where id=p_technician_id and role='technician' and is_active) then
    raise exception 'Technician account is not active';
  end if;
  if selected.status='completed' then return selected.id; end if;
  if selected.status<>'in_progress' then raise exception 'Job is not available to complete'; end if;
  update public.service_jobs set status='completed',completed_at=coalesce(completed_at,now()) where id=p_job_id;
  return p_job_id;
end $$;

revoke all on function public.guard_service_job_lifecycle() from public,anon,authenticated;
revoke all on function public.guard_appointment_job_link() from public,anon,authenticated;
revoke all on function public.start_service_job(uuid,uuid) from public,anon,authenticated;
revoke all on function public.complete_service_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.start_service_job(uuid,uuid) to service_role;
grant execute on function public.complete_service_job(uuid,uuid) to service_role;

commit;
