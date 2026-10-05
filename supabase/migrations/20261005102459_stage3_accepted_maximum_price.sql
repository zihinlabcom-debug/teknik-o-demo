-- Stage 3: one customer action creates the request and accepts its maximum price.
-- The existing request-only RPC remains available for manual/uncertain work.
begin;

do $$ begin
  if to_regprocedure('public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb)') is null
    or to_regprocedure('public.accept_service_quote(uuid,uuid)') is null
    or to_regclass('public.service_quotes') is null then
    raise exception 'Stage 3 accepted-price prerequisites missing';
  end if;
end $$;

create function public.create_priced_service_request(
  p_customer_id uuid,
  p_category_code text,
  p_address_id uuid,
  p_issue_title text,
  p_problem_description text,
  p_pricing_reference text,
  p_request_key text,
  p_assessment_snapshot jsonb,
  p_currency text,
  p_subtotal numeric(12,2),
  p_service_fee numeric(12,2),
  p_total_amount numeric(12,2),
  p_breakdown jsonb
) returns jsonb
language plpgsql security definer set search_path=''
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

  -- Any failure below rolls back the request.created event and request as well.
  v_request_id:=public.create_service_request(
    p_customer_id,p_category_code,p_address_id,p_issue_title,p_problem_description,
    p_pricing_reference,p_request_key,p_assessment_snapshot);

  -- Serialize retries and any competing quote creation for this request.
  select r.customer_id,r.assessment_snapshot into v_customer_id,v_snapshot
  from public.service_requests r where r.id=v_request_id for update;
  if v_customer_id is distinct from p_customer_id or
     v_snapshot is distinct from p_assessment_snapshot then
    raise exception 'Existing request assessment mismatch';
  end if;

  select * into v_quote from public.service_quotes q
  where q.service_request_id=v_request_id and q.status='accepted';
  if found then
    if v_quote.currency<>p_currency or v_quote.subtotal<>p_subtotal or
      v_quote.service_fee<>p_service_fee or v_quote.total_amount<>p_total_amount or
      v_quote.breakdown is distinct from p_breakdown then
      raise exception 'Existing accepted price mismatch';
    end if;
    return jsonb_build_object('id',v_request_id,'quoteId',v_quote.id,
      'totalAmount',v_quote.total_amount,'currency',v_quote.currency);
  end if;
  if exists(select 1 from public.service_quotes q where q.service_request_id=v_request_id) then
    raise exception 'Existing quote requires review';
  end if;

  insert into public.service_quotes(
    service_request_id,version,status,currency,subtotal,service_fee,total_amount,
    breakdown,offered_at
  ) values (
    v_request_id,1,'offered',p_currency,p_subtotal,p_service_fee,p_total_amount,
    p_breakdown,now()
  ) returning * into v_quote;

  perform public.accept_service_quote(v_quote.id,p_customer_id);
  return jsonb_build_object('id',v_request_id,'quoteId',v_quote.id,
    'totalAmount',v_quote.total_amount,'currency',v_quote.currency);
end $$;

revoke all on function public.create_priced_service_request(
  uuid,text,uuid,text,text,text,text,jsonb,text,numeric,numeric,numeric,jsonb
) from public,anon,authenticated;
grant execute on function public.create_priced_service_request(
  uuid,text,uuid,text,text,text,text,jsonb,text,numeric,numeric,numeric,jsonb
) to service_role;

commit;
