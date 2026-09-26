-- Scope a linked session by its service request, and exercise the critical
-- constraints inside exception subtransactions. No test row survives.
begin;

-- PostgreSQL CHECK treats NULL as passing. Make a missing evidence URL false.
alter table public.boiler_fault_candidates
  drop constraint if exists boiler_fault_candidates_check1;
alter table public.boiler_fault_candidates
  add constraint boiler_fault_candidates_verified_evidence_check check (
    verification_status <> 'verified' or
    (nullif(trim(evidence_source_type),'') is not null
     and coalesce(evidence_url ~ '^https://[^ ]+', false)
     and nullif(trim(evidence_note),'') is not null)
  );

drop policy if exists boiler_diagnosis_sessions_read on public.boiler_diagnosis_sessions;
create policy boiler_diagnosis_sessions_read on public.boiler_diagnosis_sessions for select to authenticated
  using ((service_request_id is null and customer_id=(select auth.uid()))
         or exists (select 1 from public.service_requests r
                    where r.id=service_request_id and
                      (r.customer_id=(select auth.uid()) or r.technician_id=(select auth.uid())))
         or (select public.is_app_admin()));

do $$ begin
  begin
    insert into public.boiler_question_effects(question_id,candidate_id,answer_key,effect)
      values (gen_random_uuid(),gen_random_uuid(),'unknown','support');
    raise exception 'unknown answer was accepted as support';
  exception when check_violation then null;
  end;
  begin
    insert into public.boiler_diagnosis_sessions(question_completion_percent) values (-1);
    raise exception 'Invalid question completion was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.boiler_diagnosis_sessions(diagnosis_confidence_percent) values (101);
    raise exception 'Invalid diagnosis confidence was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.boiler_diagnosis_candidates(session_id,candidate_id,probability_percent)
      values (gen_random_uuid(),gen_random_uuid(),101);
    raise exception 'Invalid candidate probability was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.boiler_fault_candidates(candidate_key,candidate_name,fault_class,
      verification_status,evidence_source_type,evidence_url,evidence_note)
      values ('invalid','Invalid','other','verified','manufacturer',null,'No real source');
    raise exception 'Verified candidate without source URL was accepted';
  exception when check_violation then null;
  end;
end $$;

commit;
