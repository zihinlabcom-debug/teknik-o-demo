-- Resolve only the reconciliation issue that represents the provider uncertainty
-- cleared by signed Retrieve evidence. Core application and distribution remain
-- separate fail-closed steps with their own reconciliation codes.

do $$
begin
  if to_regprocedure('public.finance_iyzico_resolve_unknown(text,integer,text,text)') is null
     or to_regclass('public.finance_iyzico_operations') is null
     or to_regclass('public.finance_reconciliation_issues') is null then
    raise exception 'Stage 12 iyzico reconciliation prerequisites are missing';
  end if;
end
$$;

create or replace function public.finance_iyzico_resolve_unknown(
  p_operation_id text,p_expected_revision integer,p_evidence_operation_id text,
  p_outcome text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_original public.finance_iyzico_operations%rowtype;
  v_evidence public.finance_iyzico_operations%rowtype;
  v_issue_code text;
begin
  select * into v_original from public.finance_iyzico_operations
  where provider='iyzico' and environment='sandbox' and operation_id=p_operation_id
  for update;
  if not found or v_original.state<>'unknown'
     or v_original.revision<>p_expected_revision
     or v_original.operation not in ('authorize','capture') then
    raise exception 'Iyzico resolution conflict';
  end if;
  select * into v_evidence from public.finance_iyzico_operations
  where provider='iyzico' and environment='sandbox'
    and operation_id=p_evidence_operation_id for update;
  if not found or v_evidence.operation<>'retrieve'
     or v_evidence.state not in ('succeeded','declined')
     or not v_evidence.signature_verified or v_evidence.state<>p_outcome
     or v_evidence.intent_id<>v_original.intent_id
     or v_evidence.amount<>v_original.amount or v_evidence.currency<>v_original.currency
     or v_evidence.basket_id is distinct from v_original.basket_id then
    raise exception 'Iyzico resolution evidence mismatch';
  end if;
  if v_original.operation='authorize' and (
       v_evidence.payment_conversation_id is distinct from v_original.conversation_id
       or (p_outcome='succeeded' and v_evidence.provider_phase<>'PRE_AUTH')
     ) then
    raise exception 'Iyzico authorization evidence mismatch';
  end if;
  if v_original.operation='capture' and (
       p_outcome<>'succeeded'
       or v_evidence.payment_id is distinct from v_original.payment_id
       or v_evidence.provider_phase<>'POST_AUTH'
     ) then
    raise exception 'Iyzico capture evidence mismatch';
  end if;

  update public.finance_iyzico_operations set
    state=p_outcome,payment_id=coalesce(v_evidence.payment_id,payment_id),
    payment_transaction_id=coalesce(v_evidence.payment_transaction_id,payment_transaction_id),
    host_reference=v_evidence.host_reference,provider_phase=v_evidence.provider_phase,
    signature_verified=true,retryable=false,error_code=v_evidence.error_code,
    resolution_evidence_operation_id=p_evidence_operation_id,
    revision=revision+1,updated_at=clock_timestamp()
  where id=v_original.id returning * into v_original;

  v_issue_code:=case v_original.operation
    when 'authorize' then 'iyzico_authorize_unknown'
    when 'capture' then 'iyzico_capture_unknown'
  end;
  update public.finance_reconciliation_issues
  set status='resolved',resolved_at=clock_timestamp()
  where intent_id=v_original.intent_id and code=v_issue_code and status='open';

  return public.finance_iyzico_operation_json(v_original);
end
$$;

-- Backfill only issues whose original operation already carries a durable link
-- to matching signed Retrieve evidence. Unrelated/manual-review issues stay open.
update public.finance_reconciliation_issues as issue
set status='resolved',resolved_at=clock_timestamp()
from public.finance_iyzico_operations as original
join public.finance_iyzico_operations as evidence
  on evidence.provider='iyzico'
 and evidence.environment='sandbox'
 and evidence.operation='retrieve'
 and evidence.operation_id=original.resolution_evidence_operation_id
 and evidence.intent_id=original.intent_id
 and evidence.state=original.state
 and evidence.state in ('succeeded','declined')
 and evidence.signature_verified
 and evidence.amount=original.amount
 and evidence.currency=original.currency
 and evidence.basket_id is not distinct from original.basket_id
where issue.intent_id=original.intent_id
  and issue.status='open'
  and original.provider='iyzico'
  and original.environment='sandbox'
  and original.operation in ('authorize','capture')
  and original.state in ('succeeded','declined')
  and original.resolution_evidence_operation_id is not null
  and issue.code=case original.operation
    when 'authorize' then 'iyzico_authorize_unknown'
    when 'capture' then 'iyzico_capture_unknown'
  end
  and (
    (original.operation='authorize'
      and evidence.payment_conversation_id is not distinct from original.conversation_id
      and (original.state='declined' or evidence.provider_phase='PRE_AUTH'))
    or
    (original.operation='capture'
      and original.state='succeeded'
      and evidence.payment_id is not distinct from original.payment_id
      and evidence.provider_phase='POST_AUTH')
  );

revoke all on function public.finance_iyzico_resolve_unknown(text,integer,text,text)
from public,anon,authenticated;
grant execute on function public.finance_iyzico_resolve_unknown(text,integer,text,text)
to service_role;

comment on function public.finance_iyzico_resolve_unknown(text,integer,text,text) is
  'Resolves an unknown authorize/capture only from matching signed Retrieve evidence and atomically closes that operation-specific unknown reconciliation issue.';