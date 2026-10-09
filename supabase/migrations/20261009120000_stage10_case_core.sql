-- Stage 10: complaint, warranty and additional-cost data core.
-- Forward-only. Existing operation states and Stage 9.3 assignment rules are unchanged.
begin;

do $$ begin
  if to_regclass('public.service_requests') is null
     or to_regclass('public.service_jobs') is null
     or to_regclass('public.service_quotes') is null
     or to_regclass('public.operational_events') is null
     or to_regclass('public.service_categories') is null
     or to_regclass('public.users') is null then
    raise exception 'Stage 10 prerequisites missing';
  end if;
end $$;

create table public.service_category_warranty_policies (
  category_id uuid primary key references public.service_categories(id) on delete restrict,
  warranty_class text not null check (warranty_class in ('electronic_30','non_electronic_7')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.service_category_warranty_policies(category_id,warranty_class)
select id,case when code='boiler' then 'electronic_30' else 'non_electronic_7' end
from public.service_categories
where code in ('boiler','painting','cleaning','upholstery_carpet')
on conflict (category_id) do nothing;

do $$ begin
  if exists(
    select 1 from public.service_categories c
    left join public.service_category_warranty_policies p on p.category_id=c.id
    where c.is_active and p.category_id is null
  ) then raise exception 'Every active service category requires an explicit warranty policy'; end if;
end $$;

create function public.stage10_require_category_warranty_policy() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_category_id uuid:=case when tg_op='DELETE' then old.category_id else new.id end;
begin
  if exists(select 1 from public.service_categories where id=v_category_id and is_active)
     and not exists(select 1 from public.service_category_warranty_policies where category_id=v_category_id) then
    raise exception 'Active service category requires an explicit warranty policy';
  end if;
  return null;
end $$;
create constraint trigger service_category_warranty_policy_required
  after insert or update of is_active on public.service_categories deferrable initially deferred
  for each row execute function public.stage10_require_category_warranty_policy();
create constraint trigger service_category_warranty_policy_delete_guard
  after delete on public.service_category_warranty_policies deferrable initially deferred
  for each row execute function public.stage10_require_category_warranty_policy();

create table public.service_additional_cost_requests (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete restrict,
  job_id uuid not null references public.service_jobs(id) on delete restrict,
  technician_id uuid not null references public.users(id) on delete restrict,
  original_quote_id uuid not null references public.service_quotes(id) on delete restrict,
  original_total numeric(12,2) not null check (original_total>=0),
  requested_amount numeric(12,2) not null check (requested_amount>0),
  reason text not null check (length(btrim(reason)) between 20 and 1000),
  status text not null default 'pending_admin' check (status in (
    'pending_admin','admin_rejected','pending_customer','customer_accepted',
    'customer_rejected','admin_continue','admin_cancelled'
  )),
  admin_user_id uuid references public.users(id) on delete restrict,
  admin_reason text check (admin_reason is null or length(btrim(admin_reason)) between 10 and 1000),
  admin_decided_at timestamptz,
  customer_decided_at timestamptz,
  final_total numeric(12,2) check (final_total is null or final_total>=0),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (technician_id,idempotency_key),
  unique (id,service_request_id)
);

create table public.service_complaints (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete restrict,
  related_job_id uuid not null references public.service_jobs(id) on delete restrict,
  applicant_user_id uuid not null references public.users(id) on delete restrict,
  applicant_role text not null check (applicant_role in ('customer','technician')),
  description text not null check (length(btrim(description)) between 20 and 1000),
  status text not null default 'under_review' check (status in ('under_review','resolved')),
  ai_category text,
  ai_priority text check (ai_priority is null or ai_priority in ('normal','high','critical')),
  ai_recommendation text,
  ai_assessed_at timestamptz,
  resolved_at timestamptz,
  legal_hold boolean not null default false,
  retain_until timestamptz,
  version integer not null default 1 check (version>0),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (applicant_user_id,idempotency_key)
);
create unique index service_complaints_one_open_per_request_idx
  on public.service_complaints(service_request_id) where status='under_review';

create table public.complaint_information_requests (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.service_complaints(id) on delete restrict,
  admin_user_id uuid not null references public.users(id) on delete restrict,
  message text not null check (length(btrim(message)) between 10 and 1000),
  created_at timestamptz not null default now()
);

create table public.complaint_decisions (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null unique references public.service_complaints(id) on delete restrict,
  admin_user_id uuid not null references public.users(id) on delete restrict,
  final_category text not null check (length(btrim(final_category)) between 2 and 100),
  decision text not null check (decision in ('no_action','warning','restrict_new_operations','temporary_suspension','permanent_closure','finance_review')),
  reason text not null check (length(btrim(reason)) between 20 and 2000),
  created_at timestamptz not null default now()
);

create table public.complaint_decision_corrections (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.complaint_decisions(id) on delete restrict,
  admin_user_id uuid not null references public.users(id) on delete restrict,
  correction_text text not null check (length(btrim(correction_text)) between 20 and 2000),
  created_at timestamptz not null default now()
);

create table public.account_sanctions (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references public.users(id) on delete restrict,
  complaint_decision_id uuid not null references public.complaint_decisions(id) on delete restrict,
  sanction_type text not null check (sanction_type in ('warning','restrict_new_operations','temporary_suspension','permanent_closure','finance_review')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((sanction_type='temporary_suspension' and ends_at is not null and ends_at>starts_at)
    or (sanction_type<>'temporary_suspension' and ends_at is null))
);

create table public.account_sanction_corrections (
  id uuid primary key default gen_random_uuid(),
  sanction_id uuid not null references public.account_sanctions(id) on delete restrict,
  admin_user_id uuid not null references public.users(id) on delete restrict,
  action text not null check (action='revoked'),
  reason text not null check (length(btrim(reason)) between 20 and 2000),
  created_at timestamptz not null default now(),
  unique (sanction_id,action)
);

create table public.service_warranty_claims (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete restrict,
  customer_id uuid not null references public.users(id) on delete restrict,
  original_job_id uuid not null references public.service_jobs(id) on delete restrict,
  warranty_class text not null check (warranty_class in ('electronic_30','non_electronic_7')),
  warranty_days integer not null check (warranty_days in (7,30)),
  service_completed_at timestamptz not null,
  description text not null check (length(btrim(description)) between 20 and 1000),
  status text not null default 'under_review' check (status in ('under_review','accepted','rejected','correction_pending','correction_assigned','corrected')),
  admin_user_id uuid references public.users(id) on delete restrict,
  customer_reason text check (customer_reason is null or length(btrim(customer_reason)) between 10 and 1000),
  internal_reason text check (internal_reason is null or length(btrim(internal_reason)) between 10 and 2000),
  decided_at timestamptz,
  version integer not null default 1 check (version>0),
  idempotency_key text not null check (length(idempotency_key) between 8 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id,idempotency_key)
);
create unique index service_warranty_claims_one_active_idx on public.service_warranty_claims(service_request_id)
  where status in ('under_review','accepted','correction_pending','correction_assigned');

create table public.warranty_correction_assignments (
  id uuid primary key default gen_random_uuid(),
  warranty_claim_id uuid not null references public.service_warranty_claims(id) on delete restrict,
  technician_id uuid not null references public.users(id) on delete restrict,
  assignment_kind text not null check (assignment_kind in ('original_technician','replacement_technician')),
  status text not null default 'offered' check (status in ('offered','accepted','declined','completed','cancelled')),
  customer_charge numeric(12,2) not null default 0 check (customer_charge=0),
  cost_responsibility text not null check (cost_responsibility in ('original_technician','teknik_o')),
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index warranty_correction_one_open_idx on public.warranty_correction_assignments(warranty_claim_id)
  where status in ('offered','accepted');

create table public.service_case_evidence (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid references public.service_complaints(id) on delete restrict,
  warranty_claim_id uuid references public.service_warranty_claims(id) on delete restrict,
  additional_cost_request_id uuid references public.service_additional_cost_requests(id) on delete restrict,
  uploader_user_id uuid not null references public.users(id) on delete restrict,
  evidence_kind text not null check (evidence_kind in ('photo','video','document')),
  storage_path text not null unique,
  original_file_name text not null check (length(original_file_name) between 1 and 200),
  mime_type text not null,
  byte_size bigint not null check (byte_size>0 and byte_size<=52428800),
  created_at timestamptz not null default now(),
  check (num_nonnulls(complaint_id,warranty_claim_id,additional_cost_request_id)=1),
  check ((evidence_kind='video' and byte_size<=52428800)
    or (evidence_kind in ('photo','document') and byte_size<=10485760)),
  check (storage_path like 'stage10/'||uploader_user_id::text||'/%')
);

create index service_additional_cost_request_idx on public.service_additional_cost_requests(service_request_id,created_at desc);
create index service_complaints_applicant_idx on public.service_complaints(applicant_user_id,created_at desc);
create index service_complaints_review_idx on public.service_complaints(status,created_at);
create index account_sanctions_subject_idx on public.account_sanctions(subject_user_id,starts_at,ends_at);
create index service_warranty_customer_idx on public.service_warranty_claims(customer_id,created_at desc);
create index service_case_evidence_complaint_idx on public.service_case_evidence(complaint_id);
create index service_case_evidence_warranty_idx on public.service_case_evidence(warranty_claim_id);

do $$ declare t text; begin
  foreach t in array array[
    'service_category_warranty_policies','service_additional_cost_requests','service_complaints','service_warranty_claims'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',t||'_set_updated_at',t);
  end loop;
end $$;

-- Decisions and evidence are append-only. Workflow status changes are only made by RPCs.
create function public.stage10_reject_immutable_mutation() returns trigger
language plpgsql set search_path='' as $$ begin
  raise exception 'Stage 10 audit records are immutable';
end $$;
create trigger complaint_decisions_immutable before update or delete on public.complaint_decisions
  for each row execute function public.stage10_reject_immutable_mutation();
create trigger complaint_corrections_immutable before update or delete on public.complaint_decision_corrections
  for each row execute function public.stage10_reject_immutable_mutation();
create trigger account_sanctions_immutable before update or delete on public.account_sanctions
  for each row execute function public.stage10_reject_immutable_mutation();
create trigger account_sanction_corrections_immutable before update or delete on public.account_sanction_corrections
  for each row execute function public.stage10_reject_immutable_mutation();
create trigger case_evidence_immutable before update or delete on public.service_case_evidence
  for each row execute function public.stage10_reject_immutable_mutation();

do $$ declare t text; begin
  foreach t in array array[
    'service_category_warranty_policies','service_additional_cost_requests','service_complaints',
    'complaint_information_requests','complaint_decisions','complaint_decision_corrections',
    'account_sanctions','account_sanction_corrections','service_warranty_claims','warranty_correction_assignments','service_case_evidence'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update on public.%I to service_role',t);
  end loop;
end $$;
revoke delete on public.service_category_warranty_policies,public.service_additional_cost_requests,
  public.service_complaints,public.complaint_information_requests,public.complaint_decisions,
  public.complaint_decision_corrections,public.account_sanctions,public.account_sanction_corrections,public.service_warranty_claims,
  public.warranty_correction_assignments,public.service_case_evidence from service_role;
revoke all on function public.stage10_require_category_warranty_policy() from public,anon,authenticated;
revoke all on function public.stage10_reject_immutable_mutation() from public,anon,authenticated;

commit;
