-- Stage 1.5 / Stage 8: narrow technician visibility and explicit append-only ACL.
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
    raise exception 'Operation access prerequisites missing';
  end if;
end $$;

-- Cross-table checks live in SECURITY DEFINER helpers so RLS policies do not recurse.
-- Identity is still bound to auth.uid(); no caller-supplied identity is trusted.
create or replace function public.can_read_offered_dispatch(p_dispatch_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.service_dispatches d
    join public.service_dispatch_candidates c on c.dispatch_id=d.id
    join public.users u on u.id=c.technician_id
    where d.id=p_dispatch_id
      and d.status in ('pending','broadcasting')
      and c.technician_id=(select auth.uid())
      and c.status='offered'
      and u.role='technician'
      and u.is_active
  );
$$;

create or replace function public.can_read_offered_quote(p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.service_dispatches d
    join public.service_dispatch_candidates c on c.dispatch_id=d.id
    join public.users u on u.id=c.technician_id
    where d.quote_id=p_quote_id
      and d.status in ('pending','broadcasting')
      and c.technician_id=(select auth.uid())
      and c.status='offered'
      and u.role='technician'
      and u.is_active
  );
$$;

create or replace function public.can_read_service_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.service_jobs j
    join public.service_requests r on r.id=j.service_request_id
    join public.users me on me.id=(select auth.uid())
    where j.id=p_job_id
      and me.is_active
      and (
        me.role='admin'
        or (me.role='customer' and r.customer_id=me.id)
        or (me.role='technician' and j.technician_id=me.id)
      )
  );
$$;

create or replace function public.can_read_service_appointment(p_appointment_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.service_appointments a
    join public.service_jobs j on j.id=a.job_id
    join public.service_requests r on r.id=j.service_request_id
    join public.users me on me.id=(select auth.uid())
    where a.id=p_appointment_id
      and me.is_active
      and (
        me.role='admin'
        or (me.role='customer' and r.customer_id=me.id)
        or (me.role='technician' and j.technician_id=me.id)
      )
  );
$$;

revoke all on function public.can_read_offered_dispatch(uuid) from public,anon;
revoke all on function public.can_read_offered_quote(uuid) from public,anon;
revoke all on function public.can_read_service_job(uuid) from public,anon;
revoke all on function public.can_read_service_appointment(uuid) from public,anon;
grant execute on function public.can_read_offered_dispatch(uuid) to authenticated;
grant execute on function public.can_read_offered_quote(uuid) to authenticated;
grant execute on function public.can_read_service_job(uuid) to authenticated;
grant execute on function public.can_read_service_appointment(uuid) to authenticated;

drop policy if exists service_quotes_read on public.service_quotes;
create policy service_quotes_read on public.service_quotes for select to authenticated
using (
  (select public.can_access_service_request(service_request_id))
  or (select public.can_read_offered_quote(id))
);

drop policy if exists service_dispatches_read on public.service_dispatches;
create policy service_dispatches_read on public.service_dispatches for select to authenticated
using (
  (select public.can_access_service_request(service_request_id))
  or (select public.can_read_offered_dispatch(id))
);

drop policy if exists service_dispatch_candidates_read on public.service_dispatch_candidates;
create policy service_dispatch_candidates_read on public.service_dispatch_candidates for select to authenticated
using (
  (select public.is_app_admin())
  or (
    technician_id=(select auth.uid())
    and status='offered'
    and (select public.can_read_offered_dispatch(dispatch_id))
  )
);

drop policy if exists service_jobs_read on public.service_jobs;
create policy service_jobs_read on public.service_jobs for select to authenticated
using ((select public.can_read_service_job(id)));

drop policy if exists service_appointments_read on public.service_appointments;
create policy service_appointments_read on public.service_appointments for select to authenticated
using ((select public.can_read_service_appointment(id)));

revoke all on public.operational_events from anon,authenticated;
revoke all on public.operational_events from service_role;
grant select,insert on public.operational_events to service_role;

commit;
