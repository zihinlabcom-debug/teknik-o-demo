-- Keep the existing priced request RPC compatible by routing it to immediate mode.

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
  p_breakdown jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.create_priced_service_request(
    p_customer_id,
    p_category_code,
    p_address_id,
    p_issue_title,
    p_problem_description,
    p_pricing_reference,
    p_request_key,
    p_assessment_snapshot,
    p_currency,
    p_subtotal,
    p_service_fee,
    p_total_amount,
    p_breakdown,
    'immediate',
    null
  );
end
$$;

revoke all on function public.create_priced_service_request(
  uuid,text,uuid,text,text,text,text,jsonb,text,numeric,numeric,numeric,jsonb
)
from public, anon, authenticated;

grant execute on function public.create_priced_service_request(
  uuid,text,uuid,text,text,text,text,jsonb,text,numeric,numeric,numeric,jsonb
)
to service_role;
