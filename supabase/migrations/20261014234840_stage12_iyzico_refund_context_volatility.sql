-- Forward-only repair for finance_iyzico_refund_context.
-- The function acquires a row lock with SELECT ... FOR SHARE, so PostgreSQL must
-- treat it as VOLATILE. ALTER FUNCTION preserves its body, ownership and existing
-- dependencies; the grants below reassert its service-role-only RPC boundary.

do $$
begin
  if to_regprocedure('public.finance_iyzico_refund_context(uuid,uuid)') is null then
    raise exception 'finance_iyzico_refund_context(uuid,uuid) prerequisite is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='finance_iyzico_refund_context'
      and p.prokind='f'
      and p.prosecdef
      and pg_get_function_identity_arguments(p.oid)='p_intent_id uuid, p_customer_id uuid'
  ) then
    raise exception 'finance_iyzico_refund_context security contract mismatch';
  end if;
end
$$;

alter function public.finance_iyzico_refund_context(uuid,uuid) volatile;

revoke all on function public.finance_iyzico_refund_context(uuid,uuid)
from public,anon,authenticated;

grant execute on function public.finance_iyzico_refund_context(uuid,uuid)
to service_role;

comment on function public.finance_iyzico_refund_context(uuid,uuid) is
  'Returns the locked, service-role-only refundable iyzico Sandbox context; VOLATILE is required for SELECT FOR SHARE.';
