-- Keep the existing 8-argument request RPC compatible by routing it to immediate mode.
-- The legacy 7-argument RPC remains unavailable to service_role.

create or replace function public.create_service_request(
  p_customer_id uuid,
  p_category_code text,
  p_address_id uuid,
  p_issue_title text,
  p_problem_description text,
  p_pricing_reference text,
  p_request_key text,
  p_assessment_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.create_service_request(
    p_customer_id,
    p_category_code,
    p_address_id,
    p_issue_title,
    p_problem_description,
    p_pricing_reference,
    p_request_key,
    p_assessment_snapshot,
    'immediate',
    null
  );
end
$$;

revoke all on function public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb)
from public, anon, authenticated;

grant execute on function public.create_service_request(uuid,text,uuid,text,text,text,text,jsonb)
to service_role;

revoke all on function public.create_service_request(uuid,text,uuid,text,text,text,text)
from public, anon, authenticated, service_role;
