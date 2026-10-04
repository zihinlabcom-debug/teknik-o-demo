-- Stage 1.5 / Stage 5. The accepted service_quotes row is the price snapshot.
-- Offered prices remain numeric; accepting never recomputes them.
begin;

do $$ begin
  if to_regclass('public.service_quotes') is null
     or to_regclass('public.service_requests') is null
     or to_regclass('public.operational_events') is null
     or to_regclass('public.users') is null then
    raise exception 'Accepted-price prerequisites missing';
  end if;
  if exists (
    select 1 from public.service_quotes
    where status='accepted' and accepted_at is null
  ) then
    raise exception 'Accepted quote without accepted_at requires review';
  end if;
  if exists (
    select 1 from public.service_quotes
    where status='accepted' group by service_request_id having count(*)>1
  ) then
    raise exception 'Multiple accepted quotes for one request require review';
  end if;
end $$;

create unique index service_quotes_one_accepted_per_request_idx
  on public.service_quotes(service_request_id) where status='accepted';

alter table public.service_quotes
  add constraint service_quotes_accepted_timestamp_check
  check (status <> 'accepted' or accepted_at is not null);

create function public.guard_accepted_service_quote() returns trigger
language plpgsql set search_path='' as $$
declare acceptance_owner text;
begin
  if tg_op='DELETE' then
    if old.status='accepted' then
      raise exception 'Accepted price snapshot cannot be deleted';
    end if;
    return old;
  end if;
  if tg_op='UPDATE' and old.status='accepted' then
    raise exception 'Accepted price snapshot cannot be changed';
  end if;
  if tg_op='UPDATE' and old.status<>'draft' and new.status='draft' then
    raise exception 'Published quote cannot return to draft';
  end if;
  if tg_op='UPDATE' and old.status<>'draft' and
     row(new.service_request_id,new.version,new.currency,new.subtotal,new.service_fee,
         new.total_amount,new.breakdown)
     is distinct from
     row(old.service_request_id,old.version,old.currency,old.subtotal,old.service_fee,
         old.total_amount,old.breakdown) then
    raise exception 'Offered quote terms cannot change; create a new version';
  end if;
  if new.status='accepted' then
    if tg_op='INSERT' then
      raise exception 'Accepted quote must use accept_service_quote';
    end if;
    select pg_get_userbyid(proowner) into acceptance_owner from pg_proc
      where oid='public.accept_service_quote(uuid,uuid)'::regprocedure;
    if current_user <> acceptance_owner then
      raise exception 'Accepted quote must use accept_service_quote';
    end if;
  end if;
  return new;
end $$;

create trigger service_quotes_accepted_guard
  before insert or update or delete on public.service_quotes
  for each row execute function public.guard_accepted_service_quote();

create function public.accept_service_quote(p_quote_id uuid,p_customer_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  requested_parent uuid;
  request_customer uuid;
  selected_quote public.service_quotes%rowtype;
  accepted_id uuid;
begin
  if p_quote_id is null or p_customer_id is null then
    raise exception 'Quote acceptance requires quote and customer';
  end if;
  select service_request_id into requested_parent
    from public.service_quotes where id=p_quote_id;
  if not found then raise exception 'Quote not found'; end if;

  -- The request row serializes competing quote acceptances for one customer.
  select customer_id into request_customer from public.service_requests
    where id=requested_parent for update;
  if not found then raise exception 'Service request not found'; end if;
  if request_customer is distinct from p_customer_id
     or not exists (select 1 from public.users
                    where id=p_customer_id and role='customer' and is_active) then
    raise exception 'Customer is not authorized for this quote';
  end if;

  select * into selected_quote from public.service_quotes
    where id=p_quote_id for update;
  if not found or selected_quote.service_request_id <> requested_parent then
    raise exception 'Quote request changed during acceptance';
  end if;
  select id into accepted_id from public.service_quotes
    where service_request_id=requested_parent and status='accepted';
  if found then
    if accepted_id=p_quote_id then return accepted_id; end if;
    raise exception 'Another quote is already accepted for this request';
  end if;
  if selected_quote.status <> 'offered'
     or (selected_quote.expires_at is not null and selected_quote.expires_at <= now()) then
    raise exception 'Quote is not available for acceptance';
  end if;

  update public.service_quotes
    set status='accepted',accepted_at=now()
    where id=p_quote_id;

  insert into public.operational_events(
    service_request_id,actor_user_id,event_type,entity_type,entity_id,payload
  ) values (
    requested_parent,p_customer_id,'quote.accepted','service_quote',p_quote_id,'{}'::jsonb
  );
  return p_quote_id;
end $$;

revoke all on function public.guard_accepted_service_quote() from public,anon,authenticated;
revoke all on function public.accept_service_quote(uuid,uuid) from public,anon,authenticated;
grant execute on function public.accept_service_quote(uuid,uuid) to service_role;

commit;
