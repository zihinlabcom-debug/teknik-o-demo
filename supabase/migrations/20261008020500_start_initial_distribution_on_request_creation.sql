-- Stage 2 blocker fix: start initial technician distribution when a priced
-- customer service request is created.
--
-- Product rule:
-- * "Talebi oluştur" accepts the shown price and immediately starts distribution
-- * one request may have only one initial distribution cycle (source_job_id is null)
-- * retries must reuse that initial cycle instead of starting a second one
-- * timeout redistribution remains separate and is keyed by source_job_id

begin;

do $initial_distribution_guard$
begin
  if exists(
    select 1
    from public.service_distribution_cycles
    where source_job_id is null
    group by service_request_id
    having count(*)>1
  ) then
    raise exception 'Duplicate initial distribution cycles exist';
  end if;
end;
$initial_distribution_guard$;

create unique index if not exists service_distribution_cycles_one_initial_request_idx
  on public.service_distribution_cycles(service_request_id)
  where source_job_id is null;


create or replace function public.start_service_distribution_cycle(
  p_service_request_id uuid,
  p_quote_id uuid,
  p_source_job_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_cycle_id uuid;
  v_existing_quote_id uuid;
begin
  if p_service_request_id is null or p_quote_id is null then
    raise exception 'Distribution requires request and quote';
  end if;

  perform 1
  from public.service_requests
  where id=p_service_request_id
  for update;

  if not found then
    raise exception 'Service request not found';
  end if;

  if p_source_job_id is null then
    select id,quote_id
      into v_cycle_id,v_existing_quote_id
    from public.service_distribution_cycles
    where service_request_id=p_service_request_id
      and source_job_id is null
    order by created_at
    limit 1;

    if found then
      if v_existing_quote_id is distinct from p_quote_id then
        raise exception 'Initial distribution quote mismatch';
      end if;

      return v_cycle_id;
    end if;
  else
    select id
      into v_cycle_id
    from public.service_distribution_cycles
    where source_job_id=p_source_job_id;

    if found then
      return v_cycle_id;
    end if;

    if not exists(
      select 1
      from public.service_jobs
      where id=p_source_job_id
        and service_request_id=p_service_request_id
        and accepted_quote_id=p_quote_id
        and status='cancelled'
    ) then
      raise exception 'Redistribution source job must be cancelled and match the accepted quote';
    end if;
  end if;

  if exists(
    select 1
    from public.service_jobs
    where service_request_id=p_service_request_id
      and status in ('assigned','in_progress')
  ) then
    raise exception 'Request already has an active job';
  end if;

  select id
    into v_cycle_id
  from public.service_distribution_cycles
  where service_request_id=p_service_request_id
    and status='active'
  order by created_at desc
  limit 1
  for update;

  if found then
    return v_cycle_id;
  end if;

  if not exists(
    select 1
    from public.service_quotes
    where id=p_quote_id
      and service_request_id=p_service_request_id
      and status='accepted'
  ) then
    raise exception 'Distribution requires accepted quote';
  end if;

  insert into public.service_distribution_cycles(
    service_request_id,
    quote_id,
    source_job_id,
    status,
    current_round,
    next_round_at
  )
  values(
    p_service_request_id,
    p_quote_id,
    p_source_job_id,
    'active',
    0,
    null
  )
  returning id into v_cycle_id;

  perform public.open_service_distribution_round(v_cycle_id);

  insert into public.operational_events(
    service_request_id,
    job_id,
    event_type,
    entity_type,
    entity_id,
    payload
  )
  values(
    p_service_request_id,
    p_source_job_id,
    case
      when p_source_job_id is null
        then 'distribution.started'
      else 'distribution.redistributed'
    end,
    'service_distribution_cycle',
    v_cycle_id,
    jsonb_build_object(
      'distribution_cycle_id',v_cycle_id,
      'reset_to_round',1
    )
  );

  return v_cycle_id;
end;
$$;


create or replace function public.create_priced_service_request(
  p_customer_id uuid,
  p_category_code text,
  p_address_id uuid,
  p_issue_title text,
  p_problem_description text,
  p_pricing_reference text,
  p_request_key text,
  p_assessment_snapshot jsonb,
  p_currency text,
  p_subtotal numeric,
  p_service_fee numeric,
  p_total_amount numeric,
  p_breakdown jsonb,
  p_requested_service_mode text,
  p_requested_service_date date
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_request_id uuid;
  v_quote public.service_quotes%rowtype;
  v_customer_id uuid;
  v_snapshot jsonb;
begin
  if p_currency is distinct from 'TRY' or p_total_amount is null or p_total_amount<=0
    or p_subtotal is null or p_subtotal<0 or p_service_fee is null or p_service_fee<0
    or p_subtotal+p_service_fee<>p_total_amount
    or p_total_amount::text in ('NaN','Infinity','-Infinity')
    or p_subtotal::text in ('NaN','Infinity','-Infinity')
    or p_service_fee::text in ('NaN','Infinity','-Infinity')
    or p_breakdown is null or jsonb_typeof(p_breakdown)<>'object'
    or octet_length(p_breakdown::text)>16384 then
    raise exception 'Invalid accepted maximum price';
  end if;

  v_request_id:=public.create_service_request(
    p_customer_id,
    p_category_code,
    p_address_id,
    p_issue_title,
    p_problem_description,
    p_pricing_reference,
    p_request_key,
    p_assessment_snapshot,
    p_requested_service_mode,
    p_requested_service_date
  );

  select r.customer_id,r.assessment_snapshot
    into v_customer_id,v_snapshot
  from public.service_requests r
  where r.id=v_request_id
  for update;

  if v_customer_id is distinct from p_customer_id
    or v_snapshot is distinct from p_assessment_snapshot then
    raise exception 'Existing request assessment mismatch';
  end if;

  select * into v_quote
  from public.service_quotes q
  where q.service_request_id=v_request_id
    and q.status='accepted';

  if found then
    if v_quote.currency<>p_currency
      or v_quote.subtotal<>p_subtotal
      or v_quote.service_fee<>p_service_fee
      or v_quote.total_amount<>p_total_amount
      or v_quote.breakdown is distinct from p_breakdown then
      raise exception 'Existing accepted price mismatch';
    end if;

    perform public.start_service_distribution_cycle(
      v_request_id,
      v_quote.id,
      null
    );

    return jsonb_build_object(
      'id',v_request_id,
      'quoteId',v_quote.id,
      'totalAmount',v_quote.total_amount,
      'currency',v_quote.currency
    );
  end if;

  if exists(
    select 1
    from public.service_quotes q
    where q.service_request_id=v_request_id
  ) then
    raise exception 'Existing quote requires review';
  end if;

  insert into public.service_quotes(
    service_request_id,
    version,
    status,
    currency,
    subtotal,
    service_fee,
    total_amount,
    breakdown,
    offered_at
  ) values (
    v_request_id,
    1,
    'offered',
    p_currency,
    p_subtotal,
    p_service_fee,
    p_total_amount,
    p_breakdown,
    now()
  )
  returning * into v_quote;

  perform public.accept_service_quote(v_quote.id,p_customer_id);

  perform public.start_service_distribution_cycle(
    v_request_id,
    v_quote.id,
    null
  );

  return jsonb_build_object(
    'id',v_request_id,
    'quoteId',v_quote.id,
    'totalAmount',v_quote.total_amount,
    'currency',v_quote.currency
  );
end;
$$;

commit;
