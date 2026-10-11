-- Stage 12 finance core. Forward-only, fail-closed and disabled by default.
-- Existing Stage 10 operational data is never rewritten or deleted.
begin;

do $$
begin
  if to_regclass('public.users') is null
     or to_regclass('public.service_requests') is null
     or to_regclass('public.service_quotes') is null
     or to_regclass('public.service_jobs') is null
     or to_regclass('public.operational_events') is null
     or to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Stage 12 finance prerequisites are missing';
  end if;
end
$$;

alter table public.service_requests
  add column if not exists finance_gate_required boolean not null default false;

create table if not exists public.finance_runtime_config (
  id smallint primary key default 1 check (id=1),
  gate_mode text not null default 'disabled'
    check (gate_mode in ('disabled','test_only','all')),
  provider text not null default 'fake'
    check (provider in ('fake','iyzico')),
  environment text not null default 'sandbox'
    check (environment in ('sandbox','live')),
  updated_by uuid references public.users(id) on delete no action,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_runtime_live_fake_guard check (
    not (provider='fake' and environment='live')
  )
);

insert into public.finance_runtime_config(id,gate_mode,provider,environment)
values(1,'disabled','fake','sandbox')
on conflict(id) do nothing;

do $$
begin
  if not exists(
    select 1 from public.finance_runtime_config
    where id=1 and gate_mode='disabled' and provider='fake' and environment='sandbox'
  ) then
    raise exception 'Existing finance runtime configuration must be disabled fake sandbox';
  end if;
end
$$;

create table if not exists public.finance_payment_intents (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete no action,
  quote_id uuid not null,
  customer_id uuid not null references public.users(id) on delete no action,
  provider text not null check (provider in ('fake','iyzico')),
  environment text not null check (environment in ('sandbox','live')),
  purpose text not null check (purpose in ('initial')),
  status text not null default 'pending_authorization' check (status in (
    'pending_authorization','authorization_failed','authorized','capture_failed',
    'captured','voided','partially_refunded','refunded','cancelled','requires_review'
  )),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  amount numeric(12,2) not null check (amount>0),
  authorized_amount numeric(12,2) not null default 0 check (authorized_amount>=0),
  captured_amount numeric(12,2) not null default 0 check (captured_amount>=0),
  refunded_amount numeric(12,2) not null default 0 check (refunded_amount>=0),
  creation_idempotency_key text not null check (
    length(creation_idempotency_key) between 8 and 128
    and creation_idempotency_key=btrim(creation_idempotency_key)
  ),
  provider_reference text check (
    provider_reference is null or length(provider_reference) between 1 and 200
  ),
  version integer not null default 1 check (version>0),
  authorized_at timestamptz,
  captured_at timestamptz,
  voided_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_payment_intents_quote_request_fk
    foreign key (quote_id,service_request_id)
    references public.service_quotes(id,service_request_id) on delete no action,
  constraint finance_payment_intents_request_purpose_uq
    unique(service_request_id,purpose),
  constraint finance_payment_intents_provider_key_uq
    unique(provider,environment,creation_idempotency_key),
  constraint finance_payment_intents_amounts_check check (
    authorized_amount<=amount
    and captured_amount<=authorized_amount
    and refunded_amount<=captured_amount
  ),
  constraint finance_payment_intents_state_amount_check check (
    (status in ('pending_authorization','authorization_failed','cancelled')
      and captured_amount=0 and refunded_amount=0)
    or (status in ('authorized','capture_failed','voided','requires_review')
      and captured_amount=0 and refunded_amount=0)
    or (status='captured' and captured_amount>0 and refunded_amount=0)
    or (status='partially_refunded' and captured_amount>0
      and refunded_amount>0 and refunded_amount<captured_amount)
    or (status='refunded' and captured_amount>0 and refunded_amount=captured_amount)
  )
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.finance_payment_intents(id) on delete no action,
  service_request_id uuid not null references public.service_requests(id) on delete no action,
  operation text not null check (operation in ('authorize','capture','void','refund')),
  status text not null check (status in ('succeeded','failed','no_op')),
  amount numeric(12,2) not null check (amount>=0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null check (
    length(idempotency_key) between 8 and 128 and idempotency_key=btrim(idempotency_key)
  ),
  provider_reference text check (
    provider_reference is null or length(provider_reference) between 1 and 200
  ),
  error_code text check (error_code is null or length(error_code) between 1 and 100),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=8192
  ),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint finance_transactions_idempotency_uq
    unique(intent_id,operation,idempotency_key)
);

create table if not exists public.finance_ledger_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.finance_transactions(id) on delete no action,
  intent_id uuid not null references public.finance_payment_intents(id) on delete no action,
  service_request_id uuid not null references public.service_requests(id) on delete no action,
  account text not null check (account in ('provider_clearing','service_settlement')),
  direction text not null check (direction in ('debit','credit')),
  amount numeric(12,2) not null check (amount>0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  constraint finance_ledger_entry_side_uq unique(transaction_id,account,direction)
);

create table if not exists public.finance_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete no action,
  intent_id uuid not null references public.finance_payment_intents(id) on delete no action,
  code text not null check (length(code) between 3 and 100),
  status text not null default 'open' check (status in ('open','resolved')),
  detail jsonb not null default '{}'::jsonb check (
    jsonb_typeof(detail)='object' and octet_length(detail::text)<=8192
  ),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint finance_reconciliation_resolution_check check (
    (status='open' and resolved_at is null)
    or (status='resolved' and resolved_at is not null)
  )
);

create unique index if not exists finance_reconciliation_one_open_code_idx
  on public.finance_reconciliation_issues(intent_id,code)
  where status='open';
create index if not exists finance_payment_intents_customer_created_idx
  on public.finance_payment_intents(customer_id,created_at desc);
create index if not exists finance_payment_intents_status_idx
  on public.finance_payment_intents(status,updated_at);
create index if not exists finance_transactions_request_occurred_idx
  on public.finance_transactions(service_request_id,occurred_at);
create index if not exists finance_ledger_request_created_idx
  on public.finance_ledger_entries(service_request_id,created_at);
create index if not exists finance_reconciliation_status_created_idx
  on public.finance_reconciliation_issues(status,created_at);

-- Existing staging finance tables are accepted only when the required contract
-- is already present. A partial/older draft fails the whole transaction.
do $$
declare item record;
begin
  for item in
    select * from (values
      ('finance_runtime_config','gate_mode','text'),
      ('finance_payment_intents','service_request_id','uuid'),
      ('finance_payment_intents','quote_id','uuid'),
      ('finance_payment_intents','customer_id','uuid'),
      ('finance_payment_intents','status','text'),
      ('finance_payment_intents','amount','numeric'),
      ('finance_payment_intents','currency','text'),
      ('finance_transactions','intent_id','uuid'),
      ('finance_transactions','service_request_id','uuid'),
      ('finance_transactions','currency','text'),
      ('finance_transactions','idempotency_key','text'),
      ('finance_ledger_entries','transaction_id','uuid'),
      ('finance_ledger_entries','intent_id','uuid'),
      ('finance_ledger_entries','service_request_id','uuid'),
      ('finance_ledger_entries','currency','text'),
      ('finance_reconciliation_issues','intent_id','uuid'),
      ('finance_reconciliation_issues','service_request_id','uuid')
    ) as expected(table_name,column_name,data_type)
  loop
    if not exists(
      select 1 from information_schema.columns c
      where c.table_schema='public' and c.table_name=item.table_name
        and c.column_name=item.column_name and c.data_type=item.data_type
    ) then
      raise exception 'Incompatible Stage 12 finance draft: %.% must be %',
        item.table_name,item.column_name,item.data_type;
    end if;
  end loop;
end
$$;

do $$
declare required_constraint text;
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name like 'finance_%'
      and lower(column_name) ~ '(pan|card_number|cvv|cvc|expiry|card_holder)'
  ) then
    raise exception 'Existing finance draft contains prohibited card-data columns';
  end if;
  foreach required_constraint in array array[
    'finance_runtime_live_fake_guard',
    'finance_payment_intents_quote_request_fk',
    'finance_payment_intents_request_purpose_uq',
    'finance_payment_intents_provider_key_uq',
    'finance_payment_intents_amounts_check',
    'finance_payment_intents_state_amount_check',
    'finance_transactions_idempotency_uq',
    'finance_ledger_entry_side_uq',
    'finance_reconciliation_resolution_check'
  ] loop
    if not exists(select 1 from pg_constraint where conname=required_constraint) then
      raise exception 'Incompatible Stage 12 finance draft: missing constraint %',required_constraint;
    end if;
  end loop;
end
$$;

-- Cross-table composite keys prevent a service-role programming error from
-- attaching audit or ledger rows to a different request, intent or currency.
do $$
begin
  if not exists(select 1 from pg_constraint
    where conname='service_requests_finance_id_customer_key') then
    execute 'alter table public.service_requests add constraint service_requests_finance_id_customer_key unique(id,customer_id)';
  end if;
  if not exists(select 1 from pg_constraint
    where conname='finance_intents_id_request_currency_key') then
    execute 'alter table public.finance_payment_intents add constraint finance_intents_id_request_currency_key unique(id,service_request_id,currency)';
  end if;
  if not exists(select 1 from pg_constraint
    where conname='finance_intents_id_request_key') then
    execute 'alter table public.finance_payment_intents add constraint finance_intents_id_request_key unique(id,service_request_id)';
  end if;
  if not exists(select 1 from pg_constraint
    where conname='finance_intents_request_customer_fk') then
    execute 'alter table public.finance_payment_intents add constraint finance_intents_request_customer_fk foreign key(service_request_id,customer_id) references public.service_requests(id,customer_id) on delete no action';
  end if;
  if not exists(select 1 from pg_constraint
    where conname='finance_transactions_intent_request_currency_fk') then
    execute 'alter table public.finance_transactions add constraint finance_transactions_intent_request_currency_fk foreign key(intent_id,service_request_id,currency) references public.finance_payment_intents(id,service_request_id,currency) on delete no action';
  end if;
  if not exists(select 1 from pg_constraint
    where conname='finance_transactions_id_intent_request_currency_key') then
    execute 'alter table public.finance_transactions add constraint finance_transactions_id_intent_request_currency_key unique(id,intent_id,service_request_id,currency)';
  end if;
  if not exists(select 1 from pg_constraint
    where conname='finance_ledger_transaction_intent_request_currency_fk') then
    execute 'alter table public.finance_ledger_entries add constraint finance_ledger_transaction_intent_request_currency_fk foreign key(transaction_id,intent_id,service_request_id,currency) references public.finance_transactions(id,intent_id,service_request_id,currency) on delete no action';
  end if;
  if not exists(select 1 from pg_constraint
    where conname='finance_reconciliation_intent_request_fk') then
    execute 'alter table public.finance_reconciliation_issues add constraint finance_reconciliation_intent_request_fk foreign key(intent_id,service_request_id) references public.finance_payment_intents(id,service_request_id) on delete no action';
  end if;
end
$$;

create or replace function public.guard_finance_intent_update()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.service_request_id is distinct from old.service_request_id
     or new.quote_id is distinct from old.quote_id
     or new.customer_id is distinct from old.customer_id
     or new.provider is distinct from old.provider
     or new.environment is distinct from old.environment
     or new.purpose is distinct from old.purpose
     or new.currency is distinct from old.currency
     or new.amount is distinct from old.amount
     or new.creation_idempotency_key is distinct from old.creation_idempotency_key then
    raise exception 'Finance intent identity is immutable';
  end if;
  if new.status is distinct from old.status and not (
    (old.status='pending_authorization' and new.status in
      ('authorization_failed','authorized','cancelled','requires_review'))
    or (old.status='authorization_failed' and new.status in
      ('authorized','cancelled','requires_review'))
    or (old.status='authorized' and new.status in
      ('capture_failed','captured','voided','requires_review'))
    or (old.status='capture_failed' and new.status in
      ('captured','voided','requires_review'))
    or (old.status='captured' and new.status in
      ('partially_refunded','refunded','requires_review'))
    or (old.status='partially_refunded' and new.status in
      ('partially_refunded','refunded','requires_review'))
    or (old.status='requires_review' and new.status in
      ('authorized','capture_failed','captured','voided','partially_refunded','refunded'))
  ) then
    raise exception 'Invalid finance intent transition: % -> %',old.status,new.status;
  end if;
  if new.version is distinct from old.version then
    raise exception 'Finance intent version is server managed';
  end if;
  new.version:=old.version+1;
  new.updated_at:=now();
  return new;
end
$$;

drop trigger if exists finance_payment_intents_guard_update on public.finance_payment_intents;
create trigger finance_payment_intents_guard_update
before update on public.finance_payment_intents
for each row execute function public.guard_finance_intent_update();

create or replace function public.finance_audit_rows_append_only()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'Finance audit rows are append only';
end
$$;

drop trigger if exists finance_transactions_append_only on public.finance_transactions;
create trigger finance_transactions_append_only
before update or delete on public.finance_transactions
for each row execute function public.finance_audit_rows_append_only();
drop trigger if exists finance_ledger_entries_append_only on public.finance_ledger_entries;
create trigger finance_ledger_entries_append_only
before update or delete on public.finance_ledger_entries
for each row execute function public.finance_audit_rows_append_only();

create or replace function public.assert_finance_ledger_balanced()
returns trigger language plpgsql set search_path='' as $$
declare v_transaction_id uuid;v_debit numeric;v_credit numeric;
begin
  v_transaction_id:=coalesce(new.transaction_id,old.transaction_id);
  select coalesce(sum(amount) filter(where direction='debit'),0),
         coalesce(sum(amount) filter(where direction='credit'),0)
    into v_debit,v_credit
  from public.finance_ledger_entries where transaction_id=v_transaction_id;
  if v_debit<>v_credit then
    raise exception 'Finance ledger transaction is not balanced';
  end if;
  return null;
end
$$;

drop trigger if exists finance_ledger_balance_check on public.finance_ledger_entries;
create constraint trigger finance_ledger_balance_check
after insert or update or delete on public.finance_ledger_entries
deferrable initially deferred
for each row execute function public.assert_finance_ledger_balanced();

drop trigger if exists finance_runtime_config_set_updated_at on public.finance_runtime_config;
create trigger finance_runtime_config_set_updated_at
before update on public.finance_runtime_config
for each row execute function public.set_updated_at();

alter table public.finance_runtime_config enable row level security;
alter table public.finance_payment_intents enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_ledger_entries enable row level security;
alter table public.finance_reconciliation_issues enable row level security;

revoke all on public.finance_runtime_config,public.finance_payment_intents,
  public.finance_transactions,public.finance_ledger_entries,
  public.finance_reconciliation_issues from public,anon,authenticated;
grant select on public.finance_runtime_config,public.finance_payment_intents,
  public.finance_transactions,public.finance_ledger_entries,
  public.finance_reconciliation_issues to service_role;

revoke all on function public.guard_finance_intent_update(),
  public.finance_audit_rows_append_only(),public.assert_finance_ledger_balanced()
  from public,anon,authenticated,service_role;

comment on table public.finance_payment_intents is
  'Stage 12 provider-neutral payment state; no raw card data is stored.';
comment on table public.finance_transactions is
  'Immutable provider operation audit with per-operation idempotency.';
comment on table public.finance_ledger_entries is
  'Immutable balanced capture/refund ledger; authorization is not cash movement.';

commit;
