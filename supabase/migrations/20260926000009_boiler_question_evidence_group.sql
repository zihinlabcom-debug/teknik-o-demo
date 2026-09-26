-- Two differently worded questions may represent the same customer observation.
-- A nullable group keeps existing questions compatible; the engine uses
-- question_key when no group has been assigned by a reviewer.
begin;
alter table public.boiler_diagnostic_questions
  add column if not exists evidence_group text;
do $$ begin
  if not exists (select 1 from pg_constraint
                 where conrelid='public.boiler_diagnostic_questions'::regclass
                   and conname='boiler_questions_evidence_group_nonempty') then
    alter table public.boiler_diagnostic_questions
      add constraint boiler_questions_evidence_group_nonempty
      check (evidence_group is null or length(trim(evidence_group)) > 0);
  end if;
end $$;
commit;
