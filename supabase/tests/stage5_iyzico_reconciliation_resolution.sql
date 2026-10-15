\set ON_ERROR_STOP on

do $$
declare v_intent_id uuid;
begin
  select intent_id into v_intent_id from public.finance_iyzico_operations
  where operation_id='stage5:upgrade:authorize';
  if not exists(select 1 from public.finance_reconciliation_issues
      where intent_id=v_intent_id and code='iyzico_authorize_unknown'
        and status='resolved' and resolved_at is not null) then
    raise exception 'ASSERT: migration must close a safely evidenced legacy unknown issue';
  end if;
  if not exists(select 1 from public.finance_reconciliation_issues
      where intent_id=v_intent_id and code='iyzico_distribution_release_failed'
        and status='open' and resolved_at is null) then
    raise exception 'ASSERT: migration must preserve unrelated reconciliation issues';
  end if;
  if has_function_privilege('anon',
      'public.finance_iyzico_resolve_unknown(text,integer,text,text)','EXECUTE')
     or has_function_privilege('authenticated',
      'public.finance_iyzico_resolve_unknown(text,integer,text,text)','EXECUTE')
     or not has_function_privilege('service_role',
      'public.finance_iyzico_resolve_unknown(text,integer,text,text)','EXECUTE') then
    raise exception 'ASSERT: resolve RPC must remain service-role only';
  end if;
end
$$;

select 'STAGE 5 IYZICO RECONCILIATION RESOLUTION: PASS' as result;