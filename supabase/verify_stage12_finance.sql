-- Stage 12 finance post-migration verifier. Read-only: it never changes data.
-- Run only after confirming the target is the intended staging project.
begin transaction read only;

select current_database() as database_name,current_user as database_role;

select to_regclass('supabase_migrations.schema_migrations') as migration_history_table,
  'Verify versions 20261011215411 and 20261011215509 separately with migration list' as required_check;

select id,gate_mode,provider,environment,updated_at
from public.finance_runtime_config
order by id;

select c.relname as relation_name,c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in (
    'finance_runtime_config','finance_payment_intents','finance_transactions',
    'finance_ledger_entries','finance_reconciliation_issues'
  )
order by c.relname;

select table_name,column_name,data_type,udt_name,is_nullable
from information_schema.columns
where table_schema='public'
  and table_name in (
    'finance_runtime_config','finance_payment_intents','finance_transactions',
    'finance_ledger_entries','finance_reconciliation_issues'
  )
order by table_name,ordinal_position;

select table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name like 'finance_%'
  and grantee in ('anon','authenticated','service_role')
order by table_name,grantee,privilege_type;

select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'create_payment_pending_service_request_v2','finance_fake_authorize',
  'finance_release_fake_sandbox_request','finance_fake_refund',
  'finance_record_reconciliation_issue','finance_reconciliation_snapshot'
)
order by p.proname;

select event_object_table,trigger_name,action_timing,event_manipulation
from information_schema.triggers
where trigger_schema='public' and trigger_name in (
  'service_requests_finance_gate','service_distribution_cycles_finance_guard',
  'service_dispatches_finance_guard','service_jobs_finance_distribution_guard',
  'service_jobs_finance_capture','service_requests_finance_terminal',
  'finance_payment_intents_guard_update','finance_transactions_append_only',
  'finance_ledger_entries_append_only','finance_ledger_balance_check'
)
order by event_object_table,trigger_name,event_manipulation;

-- Every query below must return zero rows before enabling the finance gate.
select 'sensitive_column_name' as check_name,table_name,column_name
from information_schema.columns
where table_schema='public' and table_name like 'finance_%'
  and lower(column_name) ~ '(pan|card_number|cvv|cvc|expiry|card_holder)';

select 'duplicate_initial_intent' as check_name,service_request_id,count(*) as row_count
from public.finance_payment_intents
where purpose='initial'
group by service_request_id
having count(*)>1;

select 'duplicate_operation_idempotency' as check_name,intent_id,
  operation,idempotency_key,count(*) as row_count
from public.finance_transactions
group by intent_id,operation,idempotency_key
having count(*)>1;

select 'distribution_before_authorization' as check_name,c.service_request_id,
  min(c.created_at) as first_distribution_at,max(i.authorized_at) as authorized_at
from public.service_distribution_cycles c
join public.service_requests r on r.id=c.service_request_id
left join public.finance_payment_intents i
  on i.service_request_id=r.id and i.purpose='initial'
where r.finance_gate_required
group by c.service_request_id
having max(i.authorized_at) is null or min(c.created_at)<max(i.authorized_at);

select 'job_before_authorization' as check_name,j.service_request_id,
  min(j.created_at) as first_job_at,max(i.authorized_at) as authorized_at
from public.service_jobs j
join public.service_requests r on r.id=j.service_request_id
left join public.finance_payment_intents i
  on i.service_request_id=r.id and i.purpose='initial'
where r.finance_gate_required
group by j.service_request_id
having max(i.authorized_at) is null or min(j.created_at)<max(i.authorized_at);

select 'invalid_amount_totals' as check_name,id,status,amount,authorized_amount,
  captured_amount,refunded_amount
from public.finance_payment_intents
where authorized_amount<0 or captured_amount<0 or refunded_amount<0
  or authorized_amount>amount or captured_amount>authorized_amount
  or refunded_amount>captured_amount;

select 'unbalanced_ledger_transaction' as check_name,transaction_id,
  coalesce(sum(amount) filter(where direction='debit'),0) as debit_total,
  coalesce(sum(amount) filter(where direction='credit'),0) as credit_total
from public.finance_ledger_entries
group by transaction_id
having coalesce(sum(amount) filter(where direction='debit'),0)<>
       coalesce(sum(amount) filter(where direction='credit'),0);

select 'unresolved_reconciliation_issue' as check_name,id,service_request_id,
  intent_id,code,created_at
from public.finance_reconciliation_issues
where status='open'
order by created_at;

rollback;
