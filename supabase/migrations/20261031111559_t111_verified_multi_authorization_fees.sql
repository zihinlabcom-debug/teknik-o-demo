-- Preserve T103 verified fake cancellation parts without accepting legacy service captures.
begin;
create or replace function t100_private.t111_guard_completion() returns trigger language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;s text;
begin
 if tg_table_name='service_jobs' then
  if new.status='completed' and old.status is distinct from 'completed' then
   select resolution into s from public.t100_completion_reports where job_id=new.id;
   perform t100_private.t111_assert_completion(new.id,s);
  end if;
 elsif tg_table_name='t100_finalizations' then
  if new.action='distribute' then perform t100_private.t111_assert_completion(new.job_id,new.source);end if;
 elsif tg_table_name='finance_transactions' then
  if new.operation='capture' and new.status='succeeded' then
   select * into f from public.t100_finalizations where service_request_id=new.service_request_id;
   if f.action='cancel' then
    if (new.metadata->>'purpose' is distinct from 'cancellation_fee' and not coalesce((
      f.multi_payment and new.metadata->>'provider'='fake'
      and new.metadata->>'finalizationId'=f.id::text
      and exists(select 1 from public.t103_finance_parts p
       join public.finance_payment_intents i on i.id=p.intent_id
       where p.finalization_id=f.id and p.intent_id=new.intent_id
        and p.operation='capture' and p.state='pending' and p.amount=new.amount
        and new.metadata->>'partId'=p.id::text and new.idempotency_key='t103-part:'||p.id::text
        and i.service_request_id=f.service_request_id and i.provider='fake' and i.environment='sandbox')
     ),false)) or f.amount<=0 or new.amount<=0
    or new.currency<>'TRY' or f.amount>least(100,public.t100_approved_total(f.service_request_id))
    or coalesce((select sum(t.amount) from public.finance_transactions t where t.service_request_id=f.service_request_id and t.operation='capture' and t.status='succeeded' and t.id<>new.id),0)+new.amount>f.amount
    then raise exception 'T111 verified cancellation fee capture required';end if;
    return new;
   end if;
   if f.id is null or f.action<>'distribute' then raise exception 'T111 service capture requires finalization';end if;
   perform t100_private.t111_assert_completion(f.job_id,f.source);
  end if;
 elsif tg_table_name='t100_distribution_simulations' and new.purpose='service' then
  select * into f from public.t100_finalizations where id=new.finalization_id;
  if f.id is null or f.action<>'distribute' or f.state<>'verified' then raise exception 'T111 distribution requires verified completion';end if;
  perform t100_private.t111_assert_completion(f.job_id,f.source);
 end if;
 return new;
end$$;

revoke all on function t100_private.t111_guard_completion() from public,anon,authenticated,service_role;
commit;
