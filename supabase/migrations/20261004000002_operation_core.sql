-- Stage 1.5 operation history. Forward-only; no legacy request columns change.
begin;

do $$ begin
  if to_regclass('public.service_requests') is null
     or to_regclass('public.users') is null
     or to_regclass('public.technician_profiles') is null
     or to_regclass('public.technician_service_categories') is null
     or to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Operation core prerequisites missing';
  end if;
  if exists (select 1 from pg_class where oid = any(array[
    to_regclass('public.service_quotes'),to_regclass('public.service_dispatches'),
    to_regclass('public.service_dispatch_candidates'),to_regclass('public.service_jobs'),
    to_regclass('public.service_appointments'),to_regclass('public.operational_events')
  ])) then
    raise exception 'Operation core tables already exist; inspect schema before migration';
  end if;
end $$;

create table public.service_quotes (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete no action,
  version integer not null check (version > 0),
  status text not null check (status in ('draft','offered','accepted','rejected','expired','cancelled')),
  currency text not null default 'TRY',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  service_fee numeric(12,2) not null default 0 check (service_fee >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  breakdown jsonb,
  offered_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_quotes_request_version_key unique (service_request_id,version),
  constraint service_quotes_id_request_key unique (id,service_request_id)
);

create table public.service_dispatches (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete no action,
  quote_id uuid,
  status text not null check (status in ('pending','broadcasting','accepted','expired','cancelled')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint service_dispatches_id_request_key unique (id,service_request_id),
  constraint service_dispatches_quote_request_fk foreign key (quote_id,service_request_id)
    references public.service_quotes(id,service_request_id) on delete no action
);

create table public.service_dispatch_candidates (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.service_dispatches(id) on delete no action,
  technician_id uuid not null references public.users(id) on delete no action,
  status text not null check (status in ('offered','accepted','declined','withdrawn','expired')),
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_dispatch_candidates_dispatch_technician_key unique (dispatch_id,technician_id)
);

create table public.service_jobs (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete no action,
  dispatch_id uuid,
  accepted_quote_id uuid,
  technician_id uuid not null references public.users(id) on delete no action,
  status text not null check (status in ('assigned','in_progress','completed','cancelled')),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  idempotency_key text check (idempotency_key is null or (length(idempotency_key) between 1 and 128 and idempotency_key = btrim(idempotency_key))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_jobs_dispatch_request_fk foreign key (dispatch_id,service_request_id)
    references public.service_dispatches(id,service_request_id) on delete no action,
  constraint service_jobs_quote_request_fk foreign key (accepted_quote_id,service_request_id)
    references public.service_quotes(id,service_request_id) on delete no action
);

create table public.service_appointments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.service_jobs(id) on delete no action,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null check (status in ('scheduled','confirmed','completed','cancelled','rescheduled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_appointments_time_check check (ends_at is null or ends_at > starts_at)
);

create table public.operational_events (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid references public.service_requests(id) on delete no action,
  job_id uuid references public.service_jobs(id) on delete no action,
  dispatch_id uuid references public.service_dispatches(id) on delete no action,
  actor_user_id uuid references public.users(id) on delete no action,
  event_type text not null check (length(btrim(event_type)) > 0),
  entity_type text not null check (length(btrim(entity_type)) > 0),
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint operational_events_context_check check (num_nonnulls(service_request_id,job_id,dispatch_id,entity_id) >= 1)
);

create index service_dispatches_request_status_idx on public.service_dispatches(service_request_id,status);
create index service_dispatch_candidates_dispatch_status_idx on public.service_dispatch_candidates(dispatch_id,status);
create index service_dispatch_candidates_technician_status_idx on public.service_dispatch_candidates(technician_id,status);
create unique index service_dispatch_candidates_one_accepted_idx on public.service_dispatch_candidates(dispatch_id) where status='accepted';
create index service_jobs_request_idx on public.service_jobs(service_request_id);
create index service_jobs_technician_status_idx on public.service_jobs(technician_id,status);
create unique index service_jobs_dispatch_unique_idx on public.service_jobs(dispatch_id) where dispatch_id is not null;
create unique index service_jobs_idempotency_unique_idx on public.service_jobs(idempotency_key) where idempotency_key is not null;
create index service_appointments_job_starts_idx on public.service_appointments(job_id,starts_at);
create index operational_events_request_occurred_idx on public.operational_events(service_request_id,occurred_at);
create index operational_events_job_occurred_idx on public.operational_events(job_id,occurred_at);
create index operational_events_dispatch_occurred_idx on public.operational_events(dispatch_id,occurred_at);

do $$ declare t text; begin
  foreach t in array array['service_quotes','service_dispatches','service_dispatch_candidates','service_jobs','service_appointments'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',t||'_set_updated_at',t);
  end loop;
end $$;

alter table public.service_quotes enable row level security;
alter table public.service_dispatches enable row level security;
alter table public.service_dispatch_candidates enable row level security;
alter table public.service_jobs enable row level security;
alter table public.service_appointments enable row level security;
alter table public.operational_events enable row level security;

revoke all on public.service_quotes,public.service_dispatches,public.service_dispatch_candidates,
  public.service_jobs,public.service_appointments,public.operational_events from public,anon,authenticated;
grant select,insert,update on public.service_quotes,public.service_dispatches,public.service_dispatch_candidates,
  public.service_jobs,public.service_appointments to service_role;
grant select,insert on public.operational_events to service_role;

commit;
