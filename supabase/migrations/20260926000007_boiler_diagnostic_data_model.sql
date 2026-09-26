-- Boiler technical knowledge, diagnostic sessions, and field outcomes are separate stores.
-- No manufacturer, question, price, or field-result data is seeded here.
begin;

do $$ begin
  if (select count(*) from public.official_error_codes_raw) <> 1422 then
    raise exception 'Unexpected official_error_codes_raw row count';
  end if;
  if (select count(*) from public.cities) <> 81 or (select count(*) from public.districts) <> 973 then
    raise exception 'Location catalog is incomplete';
  end if;
  if (select count(*) from public.service_categories) <> 4
     or not exists (select 1 from public.service_categories where code = 'boiler') then
    raise exception 'Service categories differ from the reviewed baseline';
  end if;
  if to_regprocedure('public.set_updated_at()') is null
     or to_regprocedure('public.is_app_admin()') is null then
    raise exception 'Core updated_at/admin functions are required';
  end if;
end $$;

create table if not exists public.boiler_model_families (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  family_name text not null,
  normalized_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand, normalized_name)
);

create table if not exists public.boiler_official_models (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.boiler_model_families(id) on delete cascade,
  official_model_name text not null,
  normalized_name text not null,
  manufacturer_model_code text,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, normalized_name),
  unique (id, family_id)
);

create table if not exists public.boiler_model_aliases (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.boiler_model_families(id) on delete cascade,
  official_model_id uuid,
  alias text not null,
  normalized_alias text not null,
  alias_type text not null default 'customer'
    check (alias_type in ('customer','manufacturer','technical','legacy')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  check (length(trim(normalized_alias)) > 0),
  foreign key (official_model_id, family_id)
    references public.boiler_official_models(id, family_id) on delete cascade
);

create table if not exists public.boiler_fault_candidates (
  id uuid primary key default gen_random_uuid(),
  official_error_record_id bigint references public.official_error_codes_raw(id) on delete restrict,
  family_id uuid references public.boiler_model_families(id),
  official_model_id uuid,
  error_code text,
  candidate_key text not null,
  candidate_name text not null,
  description text,
  fault_class text not null check (fault_class in
    ('gas_supply','ignition','sensor','hydraulic','electrical','electronic',
     'combustion_air','mechanical','installation','other')),
  verification_status text not null default 'needs_review'
    check (verification_status in ('needs_review','verified','rejected')),
  evidence_source_type text,
  evidence_url text,
  evidence_note text,
  requires_service boolean not null default true,
  customer_observable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (official_model_id is null or family_id is not null),
  check (verification_status <> 'verified' or
    (nullif(trim(evidence_source_type),'') is not null
     and evidence_url ~ '^https://[^ ]+'
     and nullif(trim(evidence_note),'') is not null)),
  foreign key (official_model_id, family_id)
    references public.boiler_official_models(id, family_id)
);

create table if not exists public.boiler_diagnostic_questions (
  id uuid primary key default gen_random_uuid(),
  question_key text not null unique,
  question_text text not null,
  answer_type text not null check (answer_type in
    ('yes_no_unknown','single_choice','number','text')),
  answer_options jsonb,
  customer_observable boolean not null default true,
  is_safety_question boolean not null default false,
  priority integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boiler_question_effects (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.boiler_diagnostic_questions(id) on delete cascade,
  candidate_id uuid not null references public.boiler_fault_candidates(id) on delete cascade,
  answer_key text not null,
  effect text not null check (effect in ('support','weaken','eliminate','neutral')),
  evidence_note text,
  source_url text,
  created_at timestamptz not null default now(),
  unique (question_id, candidate_id, answer_key),
  check (answer_key <> 'unknown' or effect = 'neutral')
);

create table if not exists public.boiler_repair_pricing (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.boiler_fault_candidates(id) on delete cascade,
  operation_name text not null,
  operation_description text,
  labor_minutes_min integer,
  labor_minutes_max integer,
  labor_price_min numeric,
  labor_price_max numeric,
  part_required boolean,
  part_name text,
  part_price_min numeric,
  part_price_max numeric,
  service_fee numeric,
  currency text not null default 'TRY',
  pricing_mode text not null default 'range'
    check (pricing_mode in ('fixed','range','scenario_range','onsite_required')),
  valid_from date,
  valid_until date,
  source_type text,
  source_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (labor_minutes_min is null or labor_minutes_min >= 0),
  check (labor_minutes_max is null or labor_minutes_max >= 0),
  check (labor_minutes_min is null or labor_minutes_max is null or labor_minutes_min <= labor_minutes_max),
  check (labor_price_min is null or labor_price_min >= 0),
  check (labor_price_max is null or labor_price_max >= 0),
  check (labor_price_min is null or labor_price_max is null or labor_price_min <= labor_price_max),
  check (part_price_min is null or part_price_min >= 0),
  check (part_price_max is null or part_price_max >= 0),
  check (part_price_min is null or part_price_max is null or part_price_min <= part_price_max),
  check (service_fee is null or service_fee >= 0),
  check (valid_from is null or valid_until is null or valid_from <= valid_until)
);

create table if not exists public.boiler_diagnosis_sessions (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid references public.service_requests(id),
  customer_id uuid references public.users(id),
  initial_message text,
  detected_brand text,
  family_id uuid references public.boiler_model_families(id),
  official_model_id uuid,
  error_code text,
  status text not null default 'diagnosing'
    check (status in ('diagnosing','completed','escalated','abandoned')),
  question_completion_percent numeric check (question_completion_percent between 0 and 100),
  diagnosis_confidence_percent numeric check (diagnosis_confidence_percent between 0 and 100),
  confidence_basis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (official_model_id is null or family_id is not null),
  foreign key (official_model_id, family_id)
    references public.boiler_official_models(id, family_id)
);

create table if not exists public.boiler_diagnosis_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.boiler_diagnosis_sessions(id) on delete cascade,
  question_id uuid not null references public.boiler_diagnostic_questions(id),
  raw_answer text,
  answer_key text,
  numeric_answer numeric,
  answer_source text not null default 'customer'
    check (answer_source in ('customer','ai_extracted','technician')),
  asked_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table if not exists public.boiler_diagnosis_candidates (
  session_id uuid not null references public.boiler_diagnosis_sessions(id) on delete cascade,
  candidate_id uuid not null references public.boiler_fault_candidates(id),
  status text not null default 'active'
    check (status in ('active','supported','weakened','eliminated','leading')),
  probability_percent numeric check (probability_percent between 0 and 100),
  evidence_summary jsonb,
  rank integer,
  updated_at timestamptz not null default now(),
  primary key (session_id, candidate_id)
);

create table if not exists public.boiler_field_results (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null unique references public.service_requests(id),
  diagnosis_session_id uuid references public.boiler_diagnosis_sessions(id),
  technician_id uuid references public.users(id),
  confirmed_candidate_id uuid references public.boiler_fault_candidates(id),
  technician_diagnosis text,
  resolution_status text not null check (resolution_status in
    ('repaired','temporary_fix','needs_part','no_fault_found','referred','not_repaired','cancelled')),
  work_performed text,
  labor_minutes integer check (labor_minutes is null or labor_minutes >= 0),
  labor_cost numeric check (labor_cost is null or labor_cost >= 0),
  final_customer_price numeric check (final_customer_price is null or final_customer_price >= 0),
  resolved boolean not null default false,
  technician_notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boiler_field_parts (
  id uuid primary key default gen_random_uuid(),
  field_result_id uuid not null references public.boiler_field_results(id) on delete cascade,
  part_name text not null,
  part_code text,
  quantity numeric not null default 1 check (quantity > 0),
  unit_cost numeric check (unit_cost is null or unit_cost >= 0),
  unit_customer_price numeric check (unit_customer_price is null or unit_customer_price >= 0),
  was_replaced boolean not null default true,
  warranty_months integer check (warranty_months is null or warranty_months >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.boiler_followups (
  id uuid primary key default gen_random_uuid(),
  field_result_id uuid not null references public.boiler_field_results(id) on delete cascade,
  followup_type text not null check (followup_type in
    ('customer_confirmation','repeat_fault','warranty_return','technician_revisit')),
  same_issue boolean,
  resolved boolean,
  related_service_request_id uuid references public.service_requests(id),
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Unique/primary-key indexes already cover family, model, question, session,
-- answer, session-candidate, effect-by-question and field-result request lookups.
create index if not exists boiler_model_aliases_normalized_idx
  on public.boiler_model_aliases(normalized_alias);
create index if not exists boiler_model_aliases_family_idx
  on public.boiler_model_aliases(family_id);
create index if not exists boiler_model_aliases_model_idx
  on public.boiler_model_aliases(official_model_id) where official_model_id is not null;
create index if not exists boiler_fault_candidates_raw_idx
  on public.boiler_fault_candidates(official_error_record_id);
create index if not exists boiler_fault_candidates_family_code_idx
  on public.boiler_fault_candidates(family_id,error_code);
create index if not exists boiler_fault_candidates_model_idx
  on public.boiler_fault_candidates(official_model_id);
create index if not exists boiler_fault_candidates_code_idx
  on public.boiler_fault_candidates(error_code);
create index if not exists boiler_fault_candidates_verified_idx
  on public.boiler_fault_candidates(verification_status,is_active);
create index if not exists boiler_question_effects_candidate_idx
  on public.boiler_question_effects(candidate_id);
create index if not exists boiler_repair_pricing_candidate_idx
  on public.boiler_repair_pricing(candidate_id);
create index if not exists boiler_diagnosis_sessions_request_idx
  on public.boiler_diagnosis_sessions(service_request_id);
create index if not exists boiler_diagnosis_sessions_customer_created_idx
  on public.boiler_diagnosis_sessions(customer_id,created_at desc);
create index if not exists boiler_diagnosis_sessions_family_code_idx
  on public.boiler_diagnosis_sessions(family_id,error_code);
create index if not exists boiler_diagnosis_sessions_model_idx
  on public.boiler_diagnosis_sessions(official_model_id);
create index if not exists boiler_diagnosis_sessions_code_idx
  on public.boiler_diagnosis_sessions(error_code);
create index if not exists boiler_diagnosis_sessions_created_idx
  on public.boiler_diagnosis_sessions(created_at desc);
create index if not exists boiler_diagnosis_answers_question_idx
  on public.boiler_diagnosis_answers(question_id);
create index if not exists boiler_diagnosis_candidates_candidate_idx
  on public.boiler_diagnosis_candidates(candidate_id);
create index if not exists boiler_field_results_session_idx
  on public.boiler_field_results(diagnosis_session_id);
create index if not exists boiler_field_results_technician_idx
  on public.boiler_field_results(technician_id);
create index if not exists boiler_field_results_candidate_idx
  on public.boiler_field_results(confirmed_candidate_id);
create index if not exists boiler_field_parts_result_idx
  on public.boiler_field_parts(field_result_id);
create index if not exists boiler_followups_result_idx
  on public.boiler_followups(field_result_id);
create index if not exists boiler_followups_request_idx
  on public.boiler_followups(related_service_request_id);

do $$ declare t text; begin
  foreach t in array array[
    'boiler_model_families','boiler_official_models','boiler_fault_candidates',
    'boiler_diagnostic_questions','boiler_repair_pricing','boiler_diagnosis_sessions',
    'boiler_diagnosis_candidates','boiler_field_results'
  ] loop
    if not exists (select 1 from pg_trigger
                   where tgrelid = format('public.%I',t)::regclass
                     and tgname = t || '_set_updated_at' and not tgisinternal) then
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                     t || '_set_updated_at', t);
    end if;
  end loop;
end $$;

-- Default is deny. All client access is explicit and read-only; server-side
-- service_role is required to create verified knowledge or real usage records.
do $$ declare t text; begin
  foreach t in array array[
    'boiler_model_families','boiler_official_models','boiler_model_aliases',
    'boiler_fault_candidates','boiler_diagnostic_questions','boiler_question_effects',
    'boiler_repair_pricing','boiler_diagnosis_sessions','boiler_diagnosis_answers',
    'boiler_diagnosis_candidates','boiler_field_results','boiler_field_parts',
    'boiler_followups'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;

drop policy if exists boiler_model_families_read on public.boiler_model_families;
create policy boiler_model_families_read on public.boiler_model_families for select to authenticated
  using (is_active or (select public.is_app_admin()));
drop policy if exists boiler_official_models_read on public.boiler_official_models;
create policy boiler_official_models_read on public.boiler_official_models for select to authenticated
  using ((is_active and exists (select 1 from public.boiler_model_families f
                                where f.id=family_id and f.is_active))
         or (select public.is_app_admin()));
drop policy if exists boiler_model_aliases_read on public.boiler_model_aliases;
create policy boiler_model_aliases_read on public.boiler_model_aliases for select to authenticated
  using ((is_verified and exists (select 1 from public.boiler_model_families f
                                  where f.id=family_id and f.is_active))
         or (select public.is_app_admin()));
drop policy if exists boiler_fault_candidates_read on public.boiler_fault_candidates;
create policy boiler_fault_candidates_read on public.boiler_fault_candidates for select to authenticated
  using ((verification_status='verified' and is_active)
         or (select public.is_app_admin()));
drop policy if exists boiler_diagnostic_questions_read on public.boiler_diagnostic_questions;
create policy boiler_diagnostic_questions_read on public.boiler_diagnostic_questions for select to authenticated
  using ((is_active and customer_observable) or (select public.is_app_admin()));
drop policy if exists boiler_question_effects_read on public.boiler_question_effects;
create policy boiler_question_effects_read on public.boiler_question_effects for select to authenticated
  using ((exists (select 1 from public.boiler_fault_candidates c where c.id=candidate_id)
          and exists (select 1 from public.boiler_diagnostic_questions q where q.id=question_id))
         or (select public.is_app_admin()));
drop policy if exists boiler_repair_pricing_read on public.boiler_repair_pricing;
create policy boiler_repair_pricing_read on public.boiler_repair_pricing for select to authenticated
  using ((is_active and exists (select 1 from public.boiler_fault_candidates c where c.id=candidate_id))
         or (select public.is_app_admin()));

-- Related rows inherit visibility through the parent session or field result.
-- No authenticated write grant is made because provisioning/AI persistence is
-- not yet an authenticated client workflow in this application.
drop policy if exists boiler_diagnosis_sessions_read on public.boiler_diagnosis_sessions;
create policy boiler_diagnosis_sessions_read on public.boiler_diagnosis_sessions for select to authenticated
  using (customer_id=(select auth.uid())
         or exists (select 1 from public.service_requests r
                    where r.id=service_request_id and
                      (r.customer_id=(select auth.uid()) or r.technician_id=(select auth.uid())))
         or (select public.is_app_admin()));
drop policy if exists boiler_diagnosis_answers_read on public.boiler_diagnosis_answers;
create policy boiler_diagnosis_answers_read on public.boiler_diagnosis_answers for select to authenticated
  using (exists (select 1 from public.boiler_diagnosis_sessions s where s.id=session_id)
         or (select public.is_app_admin()));
drop policy if exists boiler_diagnosis_candidates_read on public.boiler_diagnosis_candidates;
create policy boiler_diagnosis_candidates_read on public.boiler_diagnosis_candidates for select to authenticated
  using (exists (select 1 from public.boiler_diagnosis_sessions s where s.id=session_id)
         or (select public.is_app_admin()));
drop policy if exists boiler_field_results_read on public.boiler_field_results;
create policy boiler_field_results_read on public.boiler_field_results for select to authenticated
  using (exists (select 1 from public.service_requests r where r.id=service_request_id
                and (r.customer_id=(select auth.uid()) or r.technician_id=(select auth.uid())))
         or (select public.is_app_admin()));
drop policy if exists boiler_field_parts_read on public.boiler_field_parts;
create policy boiler_field_parts_read on public.boiler_field_parts for select to authenticated
  using (exists (select 1 from public.boiler_field_results f where f.id=field_result_id)
         or (select public.is_app_admin()));
drop policy if exists boiler_followups_read on public.boiler_followups;
create policy boiler_followups_read on public.boiler_followups for select to authenticated
  using (exists (select 1 from public.boiler_field_results f where f.id=field_result_id)
         or (select public.is_app_admin()));

commit;
