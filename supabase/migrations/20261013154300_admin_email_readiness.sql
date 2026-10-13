-- Forward-only hardening: administrators also need a confirmed Auth email.
-- Keep the existing admin role exception for customer/technician profile completion.
-- This migration must NOT run against staging or production without separate approval.
begin;
create or replace function public.email_account_ready()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
   select 1 from public.users u
   join auth.users a on a.id=u.id
   where u.id=(select auth.uid()) and u.is_active
     and a.email is not null and a.email_confirmed_at is not null
     and (
       u.role='admin'
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
