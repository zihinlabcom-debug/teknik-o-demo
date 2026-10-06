-- Stage 4: persist service_role permissions required by the boiler diagnosis runtime.
-- Scope is limited to boiler technical/runtime tables.

grant select
on table
  public.boiler_model_families,
  public.boiler_official_models,
  public.boiler_model_aliases,
  public.boiler_fault_candidates,
  public.official_error_codes_raw,
  public.boiler_diagnostic_questions,
  public.boiler_question_effects,
  public.boiler_repair_pricing
to service_role;

grant select, insert, update, delete
on table public.boiler_diagnosis_sessions
to service_role;

grant select, insert, update, delete
on table public.boiler_diagnosis_answers
to service_role;

grant select, insert, update
on table public.boiler_diagnosis_candidates
to service_role;