-- Forward-only. Apply only with separate approval; never changes user/business data.
-- Requires the two preceding email Auth migrations and real Supabase Auth tables.
begin;
create table account_private.admin_sessions (
  session_id uuid primary key,
  user_id uuid not null,
  marker_hash text not null check (marker_hash ~ '^[a-f0-9]{64}$'),
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > approved_at and expires_at <= approved_at + interval '8 hours')
);
alter table account_private.admin_sessions enable row level security;
revoke all on account_private.admin_sessions from public, anon, authenticated, service_role;

-- Only the server, after a successful personal password login and role checks,
-- can register the hash of its HttpOnly marker. No raw marker/token is stored.
create function public.admin_authorize_session(p_user_id uuid,p_session_id uuid,p_marker_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_expiry timestamptz;
begin
  if p_user_id is null or p_session_id is null or p_marker_hash is null
     or p_marker_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  select least(s.created_at + interval '8 hours', coalesce(s.not_after,'infinity'::timestamptz))
    into v_expiry
  from auth.sessions s
  join auth.users a on a.id=s.user_id
  join public.users u on u.id=a.id
  where s.id=p_session_id and s.user_id=p_user_id
    and u.role='admin' and u.is_active and a.email is not null and a.email_confirmed_at is not null
    and (a.banned_until is null or a.banned_until<=now())
    and exists(select 1 from auth.mfa_amr_claims m
      where m.session_id=s.id and m.authentication_method='password');
  if v_expiry is null or v_expiry<=now() then return false; end if;
  insert into account_private.admin_sessions(session_id,user_id,marker_hash,expires_at)
    values(p_session_id,p_user_id,p_marker_hash,v_expiry)
    on conflict (session_id) do nothing;
  -- Retrying is allowed, but cannot rotate the marker or extend a session.
  return exists(select 1 from account_private.admin_sessions g
    where g.session_id=p_session_id and g.user_id=p_user_id and g.marker_hash=p_marker_hash
      and g.expires_at>now());
end $$;
revoke all on function public.admin_authorize_session(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_authorize_session(uuid,uuid,text) to service_role;

create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from account_private.admin_sessions g
    join auth.sessions s on s.id=g.session_id and s.user_id=g.user_id
    join auth.users a on a.id=g.user_id
    join public.users u on u.id=g.user_id
    where g.user_id=(select auth.uid()) and u.role='admin' and u.is_active
      and a.email is not null and a.email_confirmed_at is not null
      and (a.banned_until is null or a.banned_until<=now())
      and s.id::text=(select auth.jwt()->>'session_id')
      and g.expires_at>now() and (s.not_after is null or s.not_after>now())
      and g.marker_hash=encode(extensions.digest(
        coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-hizmetpey-admin-session',''),
        'sha256'),'hex')
  );
$$;
revoke all on function public.is_app_admin() from public,anon;
grant execute on function public.is_app_admin() to authenticated,service_role;

-- Preserve the existing customer/technician readiness rules; tighten admin only.
create or replace function public.email_account_ready()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
   select 1 from public.users u join auth.users a on a.id=u.id
   where u.id=(select auth.uid()) and u.is_active
     and a.email is not null and a.email_confirmed_at is not null
     and (
       (u.role='admin' and (select public.is_app_admin()))
       or (u.role='customer' and exists (
         select 1 from public.customer_profiles p where p.user_id=u.id))
       or (u.role='technician' and exists (
         select 1 from public.technician_profiles p where p.user_id=u.id))
     )
 )
$$;
revoke all on function public.email_account_ready() from public,anon;
grant execute on function public.email_account_ready() to authenticated,service_role;
commit;
