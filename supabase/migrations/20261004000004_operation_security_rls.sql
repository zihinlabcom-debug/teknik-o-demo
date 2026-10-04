-- Stage 1.5 / Stage 4: operation ownership RLS and request-access hardening.
begin;

do $$ begin
  if to_regclass('public.service_requests') is null
     or to_regclass('public.service_quotes') is null
     or to_regclass('public.service_dispatches') is null
     or to_regclass('public.service_dispatch_candidates') is null
     or to_regclass('public.service_jobs') is null
     or to_regclass('public.service_appointments') is null
     or to_regclass('public.operational_events') is null
     or to_regclass('public.users') is null then
    raise exception 'Stage 4 security prerequisites missing';
  end if;
end $$;

create or replace function public.can_access_service_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users me
    join public.service_requests r on r.id = p_request_id
    where me.id = (select auth.uid())
      and me.is_active
      and (
        me.role = 'admin'
        or (me.role = 'customer' and r.customer_id = me.id)
        or (
          me.role = 'technician'
          and exists (
            select 1 from public.service_jobs j
            where j.service_request_id = r.id and j.technician_id = me.id
          )
        )
      )
  );
$$;
revoke all on function public.can_access_service_request(uuid) from public, anon;
grant execute on function public.can_access_service_request(uuid) to authenticated;

create or replace function public.is_active_app_technician()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.users u
    where u.id=(select auth.uid())
      and u.role='technician'
      and u.is_active
  );
$$;
revoke all on function public.is_active_app_technician() from public, anon;
grant execute on function public.is_active_app_technician() to authenticated;

grant select on public.service_quotes, public.service_dispatches,
  public.service_dispatch_candidates, public.service_jobs, public.service_appointments
to authenticated;
revoke insert, update, delete on public.service_quotes, public.service_dispatches,
  public.service_dispatch_candidates, public.service_jobs, public.service_appointments,
  public.operational_events from authenticated;

drop policy if exists service_requests_read on public.service_requests;
create policy service_requests_read on public.service_requests for select to authenticated
using ((select public.can_access_service_request(id)));

drop policy if exists diagnostic_logs_read on public.diagnostic_logs;
create policy diagnostic_logs_read on public.diagnostic_logs for select to authenticated
using ((select public.can_access_service_request(request_id)));

drop policy if exists service_quotes_read on public.service_quotes;
create policy service_quotes_read on public.service_quotes for select to authenticated
using (
  (select public.can_access_service_request(service_request_id))
  or exists (
    select 1 from public.service_dispatches d
    join public.service_dispatch_candidates c on c.dispatch_id=d.id
    where d.quote_id=service_quotes.id
      and (select public.is_active_app_technician())
      and c.technician_id=(select auth.uid()) and c.status='offered'
  )
);

drop policy if exists service_dispatches_read on public.service_dispatches;
create policy service_dispatches_read on public.service_dispatches for select to authenticated
using (
  (select public.can_access_service_request(service_request_id))
  or exists (
    select 1 from public.service_dispatch_candidates c
    where c.dispatch_id=service_dispatches.id
      and (select public.is_active_app_technician())
      and c.technician_id=(select auth.uid())
  )
);

drop policy if exists service_dispatch_candidates_read on public.service_dispatch_candidates;
create policy service_dispatch_candidates_read on public.service_dispatch_candidates for select to authenticated
using (
  ((select public.is_active_app_technician()) and technician_id=(select auth.uid()))
  or (select public.is_app_admin())
);

drop policy if exists service_jobs_read on public.service_jobs;
create policy service_jobs_read on public.service_jobs for select to authenticated
using ((select public.can_access_service_request(service_request_id)));

drop policy if exists service_appointments_read on public.service_appointments;
create policy service_appointments_read on public.service_appointments for select to authenticated
using (
  exists (
    select 1 from public.service_jobs j
    where j.id=service_appointments.job_id
      and (select public.can_access_service_request(j.service_request_id))
  )
);

-- Operational events remain server-only in Stage 4.
revoke select on public.operational_events from authenticated;

-- Boiler operational visibility follows job ownership instead of legacy request.technician_id.
do $$ begin
  if to_regclass('public.boiler_diagnosis_sessions') is not null then
    execute 'drop policy if exists boiler_diagnosis_sessions_read on public.boiler_diagnosis_sessions';
    execute $policy$
      create policy boiler_diagnosis_sessions_read on public.boiler_diagnosis_sessions
      for select to authenticated
      using (
        (service_request_id is null and customer_id=(select auth.uid()))
        or (service_request_id is not null and (select public.can_access_service_request(service_request_id)))
        or (select public.is_app_admin())
      )
    $policy$;
  end if;
  if to_regclass('public.boiler_field_results') is not null then
    execute 'drop policy if exists boiler_field_results_read on public.boiler_field_results';
    execute $policy$
      create policy boiler_field_results_read on public.boiler_field_results
      for select to authenticated
      using ((select public.can_access_service_request(service_request_id)) or (select public.is_app_admin()))
    $policy$;
  end if;
end $$;

commit;
