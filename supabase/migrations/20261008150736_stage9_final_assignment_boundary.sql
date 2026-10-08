-- Stage 9.3: at most two automatic cycles; a timed-out manual assignment
-- permanently closes the request. No existing rows are rewritten.
begin;

create or replace function public.automatic_appointment_timeout_count(p_request_id uuid)
returns integer
language sql volatile security definer
set search_path=''
as $$
  select count(distinct j.id)::integer
  from public.service_jobs j
  join public.service_request_technician_exclusions e
    on e.service_request_id=j.service_request_id
   and e.technician_id=j.technician_id
   and e.source_job_id=j.id
   and e.reason='appointment_timeout'
  join public.operational_events o
    on o.service_request_id=j.service_request_id
   and o.job_id=j.id
   and o.event_type='job.appointment_timeout'
  where j.service_request_id=p_request_id
    and j.assignment_source='automatic'
    and j.status='cancelled'
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
         where c.service_request_id=p_request_id)=2
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

-- A terminal request cannot be reopened or acquire a new job/cycle even if
-- a privileged caller bypasses the application RPCs.
create or replace function public.guard_terminal_service_request()
returns trigger language plpgsql set search_path=''
as $$
begin
  if old.status='technician_unavailable'
     and new.status is distinct from old.status then
    raise exception 'Terminal service request cannot be reopened';
  end if;
  return new;
end;
$$;

drop trigger if exists service_requests_terminal_guard on public.service_requests;
create trigger service_requests_terminal_guard
before update of status on public.service_requests
for each row execute function public.guard_terminal_service_request();

create or replace function public.guard_terminal_assignment()
returns trigger language plpgsql set search_path=''
as $$
declare
  v_request_status text;
begin
  if tg_op='UPDATE' then
    if new.service_request_id is distinct from old.service_request_id then
      raise exception 'Assignment service request is immutable';
    end if;
  end if;

  select r.status into v_request_status
  from public.service_requests r
  where r.id=new.service_request_id
  for update;
  if v_request_status='technician_unavailable' then
    raise exception 'Terminal service request cannot be assigned or redistributed';
  end if;
  if tg_table_name='service_distribution_cycles' and tg_op='INSERT'
     and (select count(*) from public.service_distribution_cycles c
          where c.service_request_id=new.service_request_id)>=2 then
    raise exception 'Automatic distribution is limited to two cycles';
  end if;
  return new;
end;
$$;

drop trigger if exists service_jobs_terminal_assignment_guard on public.service_jobs;
create trigger service_jobs_terminal_assignment_guard
before insert or update of status,service_request_id on public.service_jobs
for each row execute function public.guard_terminal_assignment();

drop trigger if exists service_distribution_cycles_terminal_guard on public.service_distribution_cycles;
create trigger service_distribution_cycles_terminal_guard
before insert or update of status,service_request_id on public.service_distribution_cycles
for each row execute function public.guard_terminal_assignment();

create or replace function public.guard_service_job_assignment_source()
returns trigger language plpgsql set search_path=''
as $$
begin
  if new.assignment_source is distinct from old.assignment_source then
    raise exception 'Job assignment source is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists service_jobs_assignment_source_immutable on public.service_jobs;
create trigger service_jobs_assignment_source_immutable
before update of assignment_source on public.service_jobs
for each row execute function public.guard_service_job_assignment_source();

create or replace function public.start_service_distribution_cycle(
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
  from public.service_distribution_cycles
  where service_request_id=p_service_request_id;

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
        and c.source_job_id is null
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

create or replace function public.timeout_service_job_for_missing_appointment(
  p_job_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_job public.service_jobs%rowtype;
  v_existing_cycle uuid;
  v_cycle_id uuid;
  v_failure_count integer;
begin
  if p_job_id is null then
    raise exception 'Job is required';
  end if;

  select *
    into v_job
  from public.service_jobs
  where id=p_job_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  if v_job.status='cancelled' then
    select id
      into v_existing_cycle
    from public.service_distribution_cycles
    where source_job_id=v_job.id;

    return v_existing_cycle;
  end if;

  if v_job.status<>'assigned' then
    return null;
  end if;

  if now()<=v_job.assigned_at+interval '1 hour' then
    return null;
  end if;

  perform 1
  from public.service_appointments
  where job_id=v_job.id
    and status in ('scheduled','confirmed')
  order by created_at
  limit 1
  for update;

  if found then
    return null;
  end if;

  update public.service_jobs
  set
    status='cancelled',
    cancelled_at=coalesce(cancelled_at,now())
  where id=v_job.id;

  insert into public.service_request_technician_exclusions(
    service_request_id,
    technician_id,
    reason,
    source_job_id
  )
  values(
    v_job.service_request_id,
    v_job.technician_id,
    'appointment_timeout',
    v_job.id
  )
  on conflict(service_request_id,technician_id) do nothing;

  insert into public.operational_events(
    service_request_id,
    job_id,
    dispatch_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values(
    v_job.service_request_id,
    v_job.id,
    v_job.dispatch_id,
    'job.appointment_timeout',
    'service_job',
    v_job.id,
    jsonb_build_object(
      'deadline',v_job.assigned_at+interval '1 hour',
      'technician_id',v_job.technician_id
    )
  );

  if v_job.assignment_source='admin_manual' then
    update public.service_requests
    set status='technician_unavailable'
    where id=v_job.service_request_id
      and status<>'technician_unavailable';

    if not found then
      raise exception 'Manual appointment timeout requires an open request';
    end if;

    insert into public.operational_events(
      service_request_id,job_id,dispatch_id,event_type,entity_type,entity_id,payload
    ) values(
      v_job.service_request_id,v_job.id,v_job.dispatch_id,
      'request.technician_unavailable','service_request',v_job.service_request_id,
      jsonb_build_object(
        'reason','manual_appointment_timeout',
        'technician_id',v_job.technician_id,
        'manual_job_id',v_job.id
      )
    );
    return null;
  end if;

  v_failure_count:=public.automatic_appointment_timeout_count(v_job.service_request_id);
  if v_failure_count=1 then
    v_cycle_id:=public.start_service_distribution_cycle(
      v_job.service_request_id,
      v_job.accepted_quote_id,
      v_job.id
    );
    return v_cycle_id;
  end if;

  if v_failure_count=2 then
    insert into public.operational_events(
      service_request_id,job_id,dispatch_id,event_type,entity_type,entity_id,payload
    ) values(
      v_job.service_request_id,v_job.id,v_job.dispatch_id,
      'distribution.manual_assignment_required','service_job',v_job.id,
      jsonb_build_object('reason','second_automatic_appointment_timeout')
    );
    return null;
  end if;

  raise exception 'Unexpected automatic appointment timeout count';
end;
$$;

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
    from public.service_jobs j
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
    for update skip locked
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

create or replace function public.admin_manual_assign_service_job(
  p_service_request_id uuid,
  p_technician_id uuid,
  p_admin_user_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_cycle public.service_distribution_cycles%rowtype;
  v_request public.service_requests%rowtype;
  v_quote_id uuid;
  v_dispatch_id uuid;
  v_job_id uuid;
  v_prior_job public.service_jobs%rowtype;
  v_role text;
  v_active boolean;
  v_profile_approval text;
  v_available boolean;
  v_category_id uuid;
  v_address_id uuid;
  v_city_id bigint;
  v_district_id bigint;
  v_active_job_count integer;
begin
  if p_service_request_id is null
     or p_technician_id is null
     or p_admin_user_id is null then
    raise exception 'Manual assignment requires request, technician and admin';
  end if;

  if p_reason is null
     or length(btrim(p_reason)) < 3
     or length(btrim(p_reason)) > 500 then
    raise exception 'Manual assignment reason must be between 3 and 500 characters';
  end if;

  if p_idempotency_key is null
     or length(p_idempotency_key) not between 1 and 128
     or p_idempotency_key<>btrim(p_idempotency_key) then
    raise exception 'Invalid manual assignment idempotency key';
  end if;

  select role,is_active
    into v_role,v_active
  from public.users
  where id=p_admin_user_id
  for update;

  if not found
     or v_role<>'admin'
     or v_active is distinct from true then
    raise exception 'Active admin account required';
  end if;

  select *
    into v_request
  from public.service_requests
  where id=p_service_request_id
  for update;

  if not found then
    raise exception 'Service request not found';
  end if;
  if v_request.status='technician_unavailable' then
    raise exception 'Terminal service request cannot be assigned';
  end if;

  select *
    into v_prior_job
  from public.service_jobs
  where idempotency_key=p_idempotency_key;

  if found then
    if v_prior_job.service_request_id=p_service_request_id
       and v_prior_job.technician_id=p_technician_id
       and v_prior_job.assignment_source='admin_manual' then
      return v_prior_job.id;
    end if;

    raise exception 'Idempotency key belongs to another assignment';
  end if;

  if exists(
    select 1
    from public.service_jobs
    where service_request_id=p_service_request_id
      and status in ('assigned','in_progress')
  ) then
    raise exception 'Request already has an active job';
  end if;

  if exists(
    select 1
    from public.service_distribution_cycles
    where service_request_id=p_service_request_id
      and status='active'
  ) then
    raise exception 'Automatic distribution is still active';
  end if;

  select *
    into v_cycle
  from public.service_distribution_cycles
  where service_request_id=p_service_request_id
  order by (source_job_id is not null) desc,started_at desc,created_at desc,id desc
  limit 1
  for update;

  if not public.admin_manual_assignment_ready(p_service_request_id) then
    raise exception 'Manual assignment requires exhausted distribution or second automatic timeout';
  end if;

  v_quote_id:=v_cycle.quote_id;

  if not exists(
    select 1
    from public.service_quotes
    where id=v_quote_id
      and service_request_id=p_service_request_id
      and status='accepted'
  ) then
    raise exception 'Manual assignment requires accepted quote';
  end if;

  if exists(
    select 1
    from public.service_request_technician_exclusions
    where service_request_id=p_service_request_id
      and technician_id=p_technician_id
  ) then
    raise exception 'Technician is excluded from this request';
  end if;

  select role,is_active
    into v_role,v_active
  from public.users
  where id=p_technician_id
  for update;

  if not found
     or v_role<>'technician'
     or v_active is distinct from true then
    raise exception 'Technician account is not active';
  end if;

  select approval_status,is_available
    into v_profile_approval,v_available
  from public.technician_profiles
  where user_id=p_technician_id
  for update;

  if not found or v_profile_approval<>'approved' then
    raise exception 'Technician is not approved';
  end if;

  select r.category_id,r.address_id,a.city_id,a.district_id
    into v_category_id,v_address_id,v_city_id,v_district_id
  from public.service_requests r
  left join public.customer_addresses a
    on a.id=r.address_id
   and a.customer_id=r.customer_id
  where r.id=p_service_request_id;

  if v_category_id is null
     or not exists(
       select 1
       from public.technician_service_categories
       where technician_id=p_technician_id
         and category_id=v_category_id
         and approval_status='approved'
     ) then
    raise exception 'Technician category is not approved for request';
  end if;

  if v_address_id is null or v_city_id is null then
    raise exception 'Request service area is not normalized';
  end if;

  if not exists(
    select 1
    from public.technician_service_areas
    where technician_id=p_technician_id
      and city_id=v_city_id
      and (district_id is null or district_id=v_district_id)
  ) then
    raise exception 'Technician is not eligible for request service area';
  end if;

  select count(*)
    into v_active_job_count
  from public.service_jobs
  where technician_id=p_technician_id
    and status in ('assigned','in_progress');

  insert into public.service_dispatches(
    service_request_id,
    quote_id,
    status,
    started_at,
    closed_at
  )
  values(
    p_service_request_id,
    v_quote_id,
    'accepted',
    now(),
    now()
  )
  returning id into v_dispatch_id;

  insert into public.service_jobs(
    service_request_id,
    dispatch_id,
    accepted_quote_id,
    technician_id,
    status,
    assigned_at,
    idempotency_key,
    assignment_source
  )
  values(
    p_service_request_id,
    v_dispatch_id,
    v_quote_id,
    p_technician_id,
    'assigned',
    now(),
    p_idempotency_key,
    'admin_manual'
  )
  returning id into v_job_id;

  insert into public.operational_events(
    service_request_id,
    job_id,
    dispatch_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values(
    p_service_request_id,
    v_job_id,
    v_dispatch_id,
    p_admin_user_id,
    'admin.manual_assignment',
    'service_job',
    v_job_id,
    jsonb_build_object(
      'technician_id',p_technician_id,
      'reason',btrim(p_reason),
      'distribution_cycle_id',v_cycle.id,
      'technician_available',v_available,
      'technician_active_job_count',v_active_job_count
    )
  );

  return v_job_id;
end;
$$;

create or replace function public.admin_manual_assignment_candidates(
  p_service_request_id uuid,
  p_admin_user_id uuid
)
returns table(
  technician_id uuid,
  name text,
  is_available boolean,
  active_job_count bigint
)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_admin_role text;
  v_admin_active boolean;
  v_category_id uuid;
  v_address_id uuid;
  v_city_id bigint;
  v_district_id bigint;
  v_cycle public.service_distribution_cycles%rowtype;
begin
  if p_service_request_id is null or p_admin_user_id is null then
    raise exception 'Manual assignment candidate lookup requires request and admin';
  end if;

  select u.role,u.is_active
    into v_admin_role,v_admin_active
  from public.users u
  where u.id=p_admin_user_id;

  if not found
     or v_admin_role<>'admin'
     or v_admin_active is distinct from true then
    raise exception 'Active admin account required';
  end if;

  select r.category_id,r.address_id,a.city_id,a.district_id
    into v_category_id,v_address_id,v_city_id,v_district_id
  from public.service_requests r
  left join public.customer_addresses a
    on a.id=r.address_id
   and a.customer_id=r.customer_id
  where r.id=p_service_request_id;

  if not found then
    raise exception 'Service request not found';
  end if;

  if exists(
    select 1
    from public.service_jobs j
    where j.service_request_id=p_service_request_id
      and j.status in ('assigned','in_progress')
  ) then
    raise exception 'Request already has an active job';
  end if;

  if exists(
    select 1
    from public.service_distribution_cycles c
    where c.service_request_id=p_service_request_id
      and c.status='active'
  ) then
    raise exception 'Automatic distribution is still active';
  end if;

  select c.*
    into v_cycle
  from public.service_distribution_cycles c
  where c.service_request_id=p_service_request_id
  order by (c.source_job_id is not null) desc,c.started_at desc,c.created_at desc,c.id desc
  limit 1;

  if not public.admin_manual_assignment_ready(p_service_request_id) then
    raise exception 'Manual assignment requires exhausted distribution or second automatic timeout';
  end if;

  if not exists(
    select 1 from public.service_quotes q
    where q.id=v_cycle.quote_id
      and q.service_request_id=p_service_request_id
      and q.status='accepted'
  ) then
    raise exception 'Manual assignment requires accepted quote';
  end if;

  if v_category_id is null
     or v_address_id is null
     or v_city_id is null then
    raise exception 'Request service area is not normalized';
  end if;

  return query
  select
    u.id as technician_id,
    u.name::text,
    tp.is_available,
    (
      select count(*)
      from public.service_jobs j
      where j.technician_id=u.id
        and j.status in ('assigned','in_progress')
    ) as active_job_count
  from public.users u
  join public.technician_profiles tp
    on tp.user_id=u.id
   and tp.approval_status='approved'
  join public.technician_service_categories tsc
    on tsc.technician_id=u.id
   and tsc.category_id=v_category_id
   and tsc.approval_status='approved'
  where u.role='technician'
    and u.is_active=true
    and exists(
      select 1
      from public.technician_service_areas tsa
      where tsa.technician_id=u.id
        and tsa.city_id=v_city_id
        and (tsa.district_id is null or tsa.district_id=v_district_id)
    )
    and not exists(
      select 1
      from public.service_request_technician_exclusions e
      where e.service_request_id=p_service_request_id
        and e.technician_id=u.id
    )
  order by tp.is_available desc,
           4 asc,
           u.name asc nulls last,
           u.id;
end;
$$;

revoke all on function public.automatic_appointment_timeout_count(uuid) from public,anon,authenticated;
revoke all on function public.admin_manual_assignment_ready(uuid) from public,anon,authenticated;
revoke all on function public.guard_terminal_service_request() from public,anon,authenticated;
revoke all on function public.guard_terminal_assignment() from public,anon,authenticated;
revoke all on function public.guard_service_job_assignment_source() from public,anon,authenticated;
revoke all on function public.start_service_distribution_cycle(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.timeout_service_job_for_missing_appointment(uuid) from public,anon,authenticated;
revoke all on function public.process_service_job_appointment_timeouts() from public,anon,authenticated;
revoke all on function public.admin_manual_assign_service_job(uuid,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.admin_manual_assignment_candidates(uuid,uuid) from public,anon,authenticated;

grant execute on function public.automatic_appointment_timeout_count(uuid) to service_role;
grant execute on function public.admin_manual_assignment_ready(uuid) to service_role;
grant execute on function public.start_service_distribution_cycle(uuid,uuid,uuid) to service_role;
grant execute on function public.timeout_service_job_for_missing_appointment(uuid) to service_role;
grant execute on function public.process_service_job_appointment_timeouts() to service_role;
grant execute on function public.admin_manual_assign_service_job(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.admin_manual_assignment_candidates(uuid,uuid) to service_role;

commit;
