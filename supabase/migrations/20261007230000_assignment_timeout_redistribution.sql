-- Packages 4-6: appointment timeout, permanent technician exclusion,
-- redistribution cycles and automatic execution.
--
-- Product rules:
-- * accepted job has 1 hour to create an appointment
-- * immediate jobs may complete directly inside that window
-- * an active appointment prevents timeout
-- * timeout permanently excludes that technician from the same request
-- * redistribution starts a fresh 3-round cycle
-- * each round lasts 7 minutes
-- * unanswered offers may be reconsidered in later rounds
-- * a technician may have at most 3 open offers
-- * all state transitions are serialized in PostgreSQL

begin;

create table public.service_distribution_cycles (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null
    references public.service_requests(id) on delete no action,
  quote_id uuid not null,
  source_job_id uuid
    references public.service_jobs(id) on delete no action,
  status text not null
    check (status in ('active','accepted','exhausted','cancelled')),
  current_round integer not null default 0
    check (current_round between 0 and 3),
  next_round_at timestamptz,
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_distribution_cycles_quote_request_fk
    foreign key (quote_id,service_request_id)
    references public.service_quotes(id,service_request_id)
    on delete no action
);

create unique index service_distribution_cycles_one_active_request_idx
  on public.service_distribution_cycles(service_request_id)
  where status='active';

create unique index service_distribution_cycles_source_job_idx
  on public.service_distribution_cycles(source_job_id)
  where source_job_id is not null;

create index service_distribution_cycles_due_idx
  on public.service_distribution_cycles(status,next_round_at)
  where status='active';

create trigger service_distribution_cycles_set_updated_at
  before update on public.service_distribution_cycles
  for each row execute function public.set_updated_at();

alter table public.service_distribution_cycles enable row level security;

revoke all on public.service_distribution_cycles
  from public,anon,authenticated;

grant select,insert,update on public.service_distribution_cycles
  to service_role;


create table public.service_request_technician_exclusions (
  service_request_id uuid not null
    references public.service_requests(id) on delete no action,
  technician_id uuid not null
    references public.users(id) on delete no action,
  reason text not null
    check (reason in ('declined','appointment_timeout')),
  source_job_id uuid
    references public.service_jobs(id) on delete no action,
  created_at timestamptz not null default now(),
  primary key(service_request_id,technician_id)
);

create index service_request_technician_exclusions_technician_idx
  on public.service_request_technician_exclusions(technician_id,service_request_id);

alter table public.service_request_technician_exclusions enable row level security;

revoke all on public.service_request_technician_exclusions
  from public,anon,authenticated;

grant select,insert on public.service_request_technician_exclusions
  to service_role;


alter table public.service_dispatches
  add column distribution_cycle_id uuid
    references public.service_distribution_cycles(id) on delete no action,
  add column round_no integer
    check (round_no between 1 and 3),
  add column expires_at timestamptz;

create unique index service_dispatches_cycle_round_idx
  on public.service_dispatches(distribution_cycle_id,round_no)
  where distribution_cycle_id is not null;


create or replace function public.record_dispatch_candidate_exclusion()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_request_id uuid;
begin
  if new.status='declined'
     and (
       tg_op='INSERT'
       or old.status is distinct from 'declined'
     ) then

    select service_request_id
      into v_request_id
    from public.service_dispatches
    where id=new.dispatch_id;

    if v_request_id is not null then
      insert into public.service_request_technician_exclusions(
        service_request_id,
        technician_id,
        reason
      )
      values(
        v_request_id,
        new.technician_id,
        'declined'
      )
      on conflict(service_request_id,technician_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

create trigger service_dispatch_candidates_exclusion_history
  after insert or update of status
  on public.service_dispatch_candidates
  for each row
  execute function public.record_dispatch_candidate_exclusion();

insert into public.service_request_technician_exclusions(
  service_request_id,
  technician_id,
  reason
)
select distinct
  d.service_request_id,
  c.technician_id,
  'declined'
from public.service_dispatch_candidates c
join public.service_dispatches d
  on d.id=c.dispatch_id
where c.status='declined'
on conflict(service_request_id,technician_id) do nothing;


create or replace function public.open_service_distribution_round(
  p_cycle_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_cycle public.service_distribution_cycles%rowtype;
  v_round integer;
  v_dispatch_id uuid;
  v_technician_id uuid;
  v_open_offer_count integer;
  v_technician_role text;
  v_technician_active boolean;
  v_technician_approval text;
  v_technician_available boolean;
begin
  if p_cycle_id is null then
    raise exception 'Distribution cycle is required';
  end if;

  select *
    into v_cycle
  from public.service_distribution_cycles
  where id=p_cycle_id
  for update;

  if not found then
    raise exception 'Distribution cycle not found';
  end if;

  if v_cycle.status<>'active' then
    raise exception 'Distribution cycle is not active';
  end if;

  if v_cycle.current_round>=3 then
    raise exception 'Distribution cycle has no remaining rounds';
  end if;

  if exists(
    select 1
    from public.service_dispatches
    where distribution_cycle_id=v_cycle.id
      and status in ('pending','broadcasting')
  ) then
    raise exception 'Distribution cycle already has an open round';
  end if;

  if not exists(
    select 1
    from public.service_quotes
    where id=v_cycle.quote_id
      and service_request_id=v_cycle.service_request_id
      and status='accepted'
  ) then
    raise exception 'Distribution requires accepted quote';
  end if;

  v_round:=v_cycle.current_round+1;

  insert into public.service_dispatches(
    service_request_id,
    quote_id,
    status,
    started_at,
    distribution_cycle_id,
    round_no,
    expires_at
  )
  values(
    v_cycle.service_request_id,
    v_cycle.quote_id,
    'broadcasting',
    now(),
    v_cycle.id,
    v_round,
    now()+interval '7 minutes'
  )
  returning id into v_dispatch_id;

  for v_technician_id in
    select unnest(
      public.find_eligible_technicians(v_cycle.service_request_id)
    )
    order by 1
  loop
    if exists(
      select 1
      from public.service_request_technician_exclusions x
      where x.service_request_id=v_cycle.service_request_id
        and x.technician_id=v_technician_id
    ) then
      continue;
    end if;

    -- Serialize eligibility, availability and offer-capacity decisions.
    select role,is_active
      into v_technician_role,v_technician_active
    from public.users
    where id=v_technician_id
    for update;

    if not found
       or v_technician_role<>'technician'
       or v_technician_active is distinct from true then
      continue;
    end if;

    select approval_status,is_available
      into v_technician_approval,v_technician_available
    from public.technician_profiles
    where user_id=v_technician_id
    for update;

    if not found
       or v_technician_approval<>'approved'
       or v_technician_available is distinct from true then
      continue;
    end if;

    select count(*)
      into v_open_offer_count
    from public.service_dispatch_candidates c
    join public.service_dispatches d
      on d.id=c.dispatch_id
    where c.technician_id=v_technician_id
      and c.status='offered'
      and d.status in ('pending','broadcasting');

    if v_open_offer_count>=3 then
      continue;
    end if;

    insert into public.service_dispatch_candidates(
      dispatch_id,
      technician_id,
      status,
      offered_at
    )
    values(
      v_dispatch_id,
      v_technician_id,
      'offered',
      now()
    );
  end loop;

  update public.service_distribution_cycles
  set
    current_round=v_round,
    next_round_at=now()+interval '7 minutes'
  where id=v_cycle.id;

  insert into public.operational_events(
    service_request_id,
    dispatch_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values(
    v_cycle.service_request_id,
    v_dispatch_id,
    'dispatch.round_started',
    'service_dispatch',
    v_dispatch_id,
    jsonb_build_object(
      'distribution_cycle_id',v_cycle.id,
      'round',v_round
    )
  );

  return v_dispatch_id;
end;
$$;


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
begin
  if p_service_request_id is null or p_quote_id is null then
    raise exception 'Distribution requires request and quote';
  end if;

  perform 1
  from public.service_requests
  where id=p_service_request_id
  for update;

  if not found then
    raise exception 'Service request not found';
  end if;

  if p_source_job_id is not null then
    select id
      into v_cycle_id
    from public.service_distribution_cycles
    where source_job_id=p_source_job_id;

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
    ) then
      raise exception 'Redistribution source job must be cancelled and match the accepted quote';
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
  limit 1
  for update;

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

  v_cycle_id:=public.start_service_distribution_cycle(
    v_job.service_request_id,
    v_job.accepted_quote_id,
    v_job.id
  );

  return v_cycle_id;
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

    if v_cycle_id is not null then
      v_processed:=v_processed+1;
    end if;
  end loop;

  return v_processed;
end;
$$;


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
    select *
    from public.service_distribution_cycles
    where status='active'
      and next_round_at is not null
      and next_round_at<=now()
    order by next_round_at
    limit 100
    for update skip locked
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


create or replace function public.run_service_distribution_automation()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_timeouts integer;
  v_cycles integer;
begin
  v_timeouts:=public.process_service_job_appointment_timeouts();
  v_cycles:=public.advance_service_distribution_cycles();

  return jsonb_build_object(
    'appointment_timeouts',v_timeouts,
    'distribution_cycles',v_cycles
  );
end;
$$;


create or replace function public.accept_service_dispatch(
  p_dispatch_id uuid,
  p_technician_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  selected_dispatch public.service_dispatches%rowtype;
  selected_candidate public.service_dispatch_candidates%rowtype;
  prior_job public.service_jobs%rowtype;
  technician_role text;
  technician_active boolean;
  technician_approval text;
  technician_available boolean;
  request_category uuid;
  request_address uuid;
  request_city bigint;
  request_district bigint;
  new_job_id uuid;
  violated_constraint text;
  v_cycle_id uuid;
begin
  if p_dispatch_id is null
     or p_technician_id is null
     or p_idempotency_key is null
     or length(p_idempotency_key) not between 1 and 128
     or p_idempotency_key<>btrim(p_idempotency_key) then
    raise exception 'Invalid dispatch acceptance arguments';
  end if;

  select distribution_cycle_id
    into v_cycle_id
  from public.service_dispatches
  where id=p_dispatch_id;

  if not found then
    raise exception 'Dispatch not found';
  end if;

  if v_cycle_id is not null then
    perform 1
    from public.service_distribution_cycles
    where id=v_cycle_id
    for update;

    if not found then
      raise exception 'Distribution cycle not found';
    end if;
  end if;

  select *
    into selected_dispatch
  from public.service_dispatches
  where id=p_dispatch_id
  for update;

  select *
    into prior_job
  from public.service_jobs
  where idempotency_key=p_idempotency_key;

  if found then
    if prior_job.dispatch_id=p_dispatch_id
       and prior_job.technician_id=p_technician_id then
      return prior_job.id;
    end if;

    raise exception 'Idempotency key belongs to another acceptance';
  end if;

  if selected_dispatch.status not in ('pending','broadcasting') then
    raise exception 'Dispatch is closed for acceptance';
  end if;

  if selected_dispatch.expires_at is not null
     and selected_dispatch.expires_at<=now() then
    raise exception 'Dispatch offer window has expired';
  end if;

  if exists(
    select 1
    from public.service_request_technician_exclusions
    where service_request_id=selected_dispatch.service_request_id
      and technician_id=p_technician_id
  ) then
    raise exception 'Technician is excluded from this request';
  end if;

  select role,is_active
    into technician_role,technician_active
  from public.users
  where id=p_technician_id
  for update;

  if not found
     or technician_role<>'technician'
     or technician_active is distinct from true then
    raise exception 'Technician account is not active';
  end if;

  select approval_status,is_available
    into technician_approval,technician_available
  from public.technician_profiles
  where user_id=p_technician_id
  for update;

  if not found or technician_approval<>'approved' then
    raise exception 'Technician is not approved';
  end if;

  if technician_available is distinct from true then
    raise exception 'Technician is not available';
  end if;

  select *
    into selected_candidate
  from public.service_dispatch_candidates
  where dispatch_id=p_dispatch_id
    and technician_id=p_technician_id
  for update;

  if not found or selected_candidate.status<>'offered' then
    raise exception 'Technician is not an offered candidate';
  end if;

  select
    r.category_id,
    r.address_id,
    a.city_id,
    a.district_id
  into
    request_category,
    request_address,
    request_city,
    request_district
  from public.service_requests r
  left join public.customer_addresses a
    on a.id=r.address_id
   and a.customer_id=r.customer_id
  where r.id=selected_dispatch.service_request_id;

  if not found then
    raise exception 'Service request not found';
  end if;

  if request_category is null
     or not exists(
       select 1
       from public.technician_service_categories
       where technician_id=p_technician_id
         and category_id=request_category
         and approval_status='approved'
     ) then
    raise exception 'Technician category is not approved for request';
  end if;

  if request_address is null or request_city is null then
    raise exception 'Request service area is not normalized';
  end if;

  if not exists(
    select 1
    from public.technician_service_areas a
    where a.technician_id=p_technician_id
      and a.city_id=request_city
      and (
        a.district_id is null
        or a.district_id=request_district
      )
  ) then
    raise exception 'Technician is not eligible for request service area';
  end if;

  begin
    insert into public.service_jobs(
      service_request_id,
      dispatch_id,
      accepted_quote_id,
      technician_id,
      status,
      assigned_at,
      idempotency_key
    )
    values(
      selected_dispatch.service_request_id,
      p_dispatch_id,
      selected_dispatch.quote_id,
      p_technician_id,
      'assigned',
      now(),
      p_idempotency_key
    )
    returning id into new_job_id;
  exception
    when unique_violation then
      get stacked diagnostics violated_constraint=constraint_name;

      if violated_constraint='service_jobs_idempotency_unique_idx' then
        raise exception 'Idempotency key belongs to another acceptance';
      end if;

      raise;
  end;

  update public.service_dispatch_candidates
  set
    status='accepted',
    responded_at=now()
  where id=selected_candidate.id;

  update public.service_dispatch_candidates
  set
    status='withdrawn',
    responded_at=now()
  where dispatch_id=p_dispatch_id
    and status='offered'
    and id<>selected_candidate.id;

  update public.service_dispatches
  set
    status='accepted',
    closed_at=now()
  where id=p_dispatch_id;

  if v_cycle_id is not null then
    update public.service_dispatch_candidates c
    set
      status='withdrawn',
      responded_at=coalesce(c.responded_at,now())
    where c.status='offered'
      and exists(
        select 1
        from public.service_dispatches d
        where d.id=c.dispatch_id
          and d.distribution_cycle_id=v_cycle_id
          and d.id<>p_dispatch_id
          and d.status in ('pending','broadcasting')
      );

    update public.service_dispatches
    set
      status='cancelled',
      closed_at=coalesce(closed_at,now())
    where distribution_cycle_id=v_cycle_id
      and id<>p_dispatch_id
      and status in ('pending','broadcasting');

    update public.service_distribution_cycles
    set
      status='accepted',
      next_round_at=null,
      closed_at=coalesce(closed_at,now())
    where id=v_cycle_id
      and status='active';
  end if;

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
    selected_dispatch.service_request_id,
    new_job_id,
    p_dispatch_id,
    p_technician_id,
    'dispatch.accepted',
    'service_job',
    new_job_id,
    case
      when v_cycle_id is null then '{}'::jsonb
      else jsonb_build_object(
        'distribution_cycle_id',v_cycle_id,
        'round',selected_dispatch.round_no
      )
    end
  );

  return new_job_id;
end;
$$;


create or replace function public.set_technician_availability(
  p_actor_id uuid,
  p_is_available boolean
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_old boolean;
begin
  if p_is_available is null then
    raise exception 'Availability required';
  end if;

  perform 1
  from public.users
  where id=p_actor_id
    and role='technician'
    and is_active
  for update;

  if not found then
    raise exception 'Approved active technician required';
  end if;

  select is_available
    into v_old
  from public.technician_profiles
  where user_id=p_actor_id
    and approval_status='approved'
  for update;

  if not found then
    raise exception 'Approved active technician required';
  end if;

  if v_old is distinct from p_is_available then
    update public.technician_profiles
    set is_available=p_is_available
    where user_id=p_actor_id;
  end if;

  if p_is_available is false then
    update public.service_dispatch_candidates c
    set
      status='withdrawn',
      responded_at=coalesce(c.responded_at,now())
    where c.technician_id=p_actor_id
      and c.status='offered'
      and exists(
        select 1
        from public.service_dispatches d
        where d.id=c.dispatch_id
          and d.status in ('pending','broadcasting')
      );
  end if;

  if v_old=p_is_available then
    return false;
  end if;

  insert into public.operational_events(
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values(
    p_actor_id,
    'technician.availability_changed',
    'technician',
    p_actor_id,
    jsonb_build_object(
      'from',v_old,
      'to',p_is_available
    )
  );

  return true;
end;
$$;

-- Normalize legacy open offers: unavailable technicians must not retain them.
update public.service_dispatch_candidates c
set
  status='withdrawn',
  responded_at=coalesce(c.responded_at,now())
where c.status='offered'
  and exists(
    select 1
    from public.service_dispatches d
    where d.id=c.dispatch_id
      and d.status in ('pending','broadcasting')
  )
  and exists(
    select 1
    from public.technician_profiles tp
    where tp.user_id=c.technician_id
      and tp.is_available is false
  );


create or replace function public.start_service_job(
  p_job_id uuid,
  p_technician_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  selected public.service_jobs%rowtype;
  has_active_appointment boolean;
begin
  if p_job_id is null or p_technician_id is null then
    raise exception 'Job start requires job and technician';
  end if;

  select *
    into selected
  from public.service_jobs
  where id=p_job_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  if selected.technician_id is distinct from p_technician_id then
    raise exception 'Technician is not assigned to this job';
  end if;

  if not exists(
    select 1
    from public.users
    where id=p_technician_id
      and role='technician'
      and is_active
  ) then
    raise exception 'Technician account is not active';
  end if;

  if selected.status='in_progress' then
    return selected.id;
  end if;

  if selected.status<>'assigned' then
    raise exception 'Job is not available to start';
  end if;

  perform 1
  from public.service_appointments
  where job_id=selected.id
    and status in ('scheduled','confirmed')
  order by created_at
  limit 1
  for update;

  has_active_appointment:=found;

  if not has_active_appointment then
    if now()>selected.assigned_at+interval '1 hour' then
      raise exception 'Appointment scheduling window has expired';
    end if;

    raise exception 'Active appointment required before starting job';
  end if;

  update public.service_jobs
  set
    status='in_progress',
    started_at=coalesce(started_at,now())
  where id=p_job_id;

  return p_job_id;
end;
$$;

revoke all on function public.start_service_job(uuid,uuid)
  from public,anon,authenticated;

grant execute on function public.start_service_job(uuid,uuid)
  to service_role;

create or replace function public.complete_service_job(
  p_job_id uuid,
  p_technician_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  selected_job public.service_jobs%rowtype;
  selected_appointment public.service_appointments%rowtype;
  request_mode text;
  request_date date;
  local_today date;
  appointment_date date;
  has_active_appointment boolean:=false;
begin
  if p_job_id is null or p_technician_id is null then
    raise exception 'Job completion requires job and technician';
  end if;

  select *
    into selected_job
  from public.service_jobs
  where id=p_job_id
  for update;

  if not found then
    raise exception 'Job not found';
  end if;

  if selected_job.technician_id is distinct from p_technician_id then
    raise exception 'Technician is not assigned to this job';
  end if;

  if not exists(
    select 1
    from public.users
    where id=p_technician_id
      and role='technician'
      and is_active
  ) then
    raise exception 'Technician account is not active';
  end if;

  if selected_job.status='completed' then
    return selected_job.id;
  end if;

  if selected_job.status not in ('assigned','in_progress') then
    raise exception 'Job is not available to complete';
  end if;

  select requested_service_mode,requested_service_date
    into request_mode,request_date
  from public.service_requests
  where id=selected_job.service_request_id
  for update;

  if not found then
    raise exception 'Service request not found';
  end if;

  select *
    into selected_appointment
  from public.service_appointments
  where job_id=p_job_id
    and status in ('scheduled','confirmed')
  order by created_at
  limit 1
  for update;

  has_active_appointment:=found;

  if selected_job.status='assigned'
     and not has_active_appointment
     and now()>selected_job.assigned_at+interval '1 hour' then
    raise exception 'Appointment scheduling window has expired';
  end if;

  if request_mode='immediate' then
    if request_date is not null then
      raise exception 'Immediate request cannot contain a requested service date';
    end if;
  elsif request_mode='scheduled' then
    if request_date is null then
      raise exception 'Scheduled request requires a requested service date';
    end if;

    local_today:=(now() at time zone 'Europe/Istanbul')::date;

    if local_today<request_date then
      raise exception 'Scheduled job cannot be completed before requested service date';
    end if;

    if not has_active_appointment then
      raise exception 'Scheduled job requires an active appointment before completion';
    end if;

    appointment_date:=
      (selected_appointment.starts_at at time zone 'Europe/Istanbul')::date;

    if appointment_date is distinct from request_date then
      raise exception 'Appointment date does not match requested service date';
    end if;
  else
    raise exception 'Invalid requested service mode';
  end if;

  update public.service_jobs
  set
    status='completed',
    completed_at=coalesce(completed_at,now())
  where id=p_job_id;

  if has_active_appointment then
    update public.service_appointments
    set
      status='completed',
      ends_at=case
        when now()>starts_at then now()
        else null
      end,
      updated_at=now()
    where id=selected_appointment.id;
  end if;

  return p_job_id;
end;
$$;


revoke all on function public.record_dispatch_candidate_exclusion()
  from public,anon,authenticated;

revoke all on function public.open_service_distribution_round(uuid)
  from public,anon,authenticated;

revoke all on function public.start_service_distribution_cycle(uuid,uuid,uuid)
  from public,anon,authenticated;

revoke all on function public.timeout_service_job_for_missing_appointment(uuid)
  from public,anon,authenticated;

revoke all on function public.process_service_job_appointment_timeouts()
  from public,anon,authenticated;

revoke all on function public.advance_service_distribution_cycles()
  from public,anon,authenticated;

revoke all on function public.run_service_distribution_automation()
  from public,anon,authenticated;

revoke all on function public.accept_service_dispatch(uuid,uuid,text)
  from public,anon,authenticated;

revoke all on function public.set_technician_availability(uuid,boolean)
  from public,anon,authenticated;

revoke all on function public.complete_service_job(uuid,uuid)
  from public,anon,authenticated;

grant execute on function public.start_service_distribution_cycle(uuid,uuid,uuid)
  to service_role;

grant execute on function public.timeout_service_job_for_missing_appointment(uuid)
  to service_role;

grant execute on function public.process_service_job_appointment_timeouts()
  to service_role;

grant execute on function public.advance_service_distribution_cycles()
  to service_role;

grant execute on function public.run_service_distribution_automation()
  to service_role;

grant execute on function public.accept_service_dispatch(uuid,uuid,text)
  to service_role;

grant execute on function public.set_technician_availability(uuid,boolean)
  to service_role;

grant execute on function public.complete_service_job(uuid,uuid)
  to service_role;


create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $cron_setup$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname='teknik-o-service-distribution-automation'
    order by jobid
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'teknik-o-service-distribution-automation',
    '* * * * *',
    'select public.run_service_distribution_automation();'
  );
end;
$cron_setup$;

commit;