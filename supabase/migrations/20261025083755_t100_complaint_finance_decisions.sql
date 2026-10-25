begin;
alter table public.service_complaints add column t100_purpose text check(t100_purpose in ('completion_review','cancellation_review'));
create function t100_private.link_complaint() returns trigger
language plpgsql security definer set search_path='' as $$
declare req public.service_requests%rowtype;
begin
 if new.applicant_role<>'customer' then return new; end if;
 select * into req from public.service_requests where id=new.service_request_id for update;
 if req.customer_id<>new.applicant_user_id then raise exception 'T100 complaint owner mismatch'; end if;
 if exists(select 1 from public.t100_reviews where service_request_id=req.id and customer_id=new.applicant_user_id and status='open') then
  new.t100_purpose:='cancellation_review';
 elsif exists(select 1 from public.t100_completion_reports where service_request_id=req.id and response='no' and voided_at is null) then
  new.t100_purpose:='completion_review';
 end if;
 return new;
end $$;
create trigger t100_complaint_purpose before insert on public.service_complaints
for each row execute function t100_private.link_complaint();
create function t100_private.attach_complaint() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.t100_purpose is null then return new; end if;
 update public.t100_reviews set complaint_id=coalesce(complaint_id,new.id)
 where service_request_id=new.service_request_id and customer_id=new.applicant_user_id and status='open';
 update public.t100_completion_reports set complaint_id=coalesce(complaint_id,new.id)
 where service_request_id=new.service_request_id and response='no' and voided_at is null;
 return new;
end $$;
create trigger t100_complaint_link after insert on public.service_complaints
for each row execute function t100_private.attach_complaint();

create or replace function t100_private.guard_completion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='completed' and old.status is distinct from 'completed' and not (
 exists(select 1 from public.t100_completion_reports c where c.job_id=new.id and c.voided_at is null and c.resolution in ('customer_yes','timeout','admin_distribute'))
 or exists(select 1 from public.t100_finalizations f where f.job_id=new.id and f.source='admin_distribute' and f.action='distribute')
 ) then raise exception 'T100 customer completion decision required'; end if;
 return new;
end $$;

create or replace function public.t100_admin_finance_decision(p_job_id uuid,p_admin_id uuid,p_decision text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.service_jobs%rowtype;r public.t100_completion_reports%rowtype;v public.t100_reviews%rowtype;
 f public.t100_finalizations%rowtype;q public.service_quotes%rowtype;i public.finance_payment_intents%rowtype;desired text;
begin
 perform t100_private.assert_actor(p_admin_id,'admin');
 if p_decision not in ('distribute','refund') or p_decision is null then raise exception 'T100 invalid decision'; end if;
 select * into j from public.service_jobs where id=p_job_id;
 perform 1 from public.service_requests where id=j.service_request_id for update;
 select * into j from public.service_jobs where id=p_job_id for update;
 desired:='admin_'||p_decision;
 select * into f from public.t100_finalizations where service_request_id=j.service_request_id;
 if found then
  if f.source=desired and f.job_id=p_job_id then return jsonb_build_object('id',f.id,'state',f.state,'action',f.action); end if;
  raise exception 'T100 resolution conflict';
 end if;
 if j.status not in ('assigned','in_progress') then raise exception 'T100 job not available'; end if;
 select * into r from public.t100_completion_reports where job_id=j.id and voided_at is null for update;
 select * into v from public.t100_reviews where service_request_id=j.service_request_id and status='open' for update;
 if not (r.response='no' and r.complaint_id is not null or v.complaint_id is not null) then raise exception 'T100 complaint review required'; end if;
 -- A NULL expression is not authorization.
 if coalesce(r.complaint_id,v.complaint_id) is null then raise exception 'T100 complaint review required'; end if;
 if r.resolution is not null then raise exception 'T100 resolution conflict'; end if;
 update public.t100_reviews set status='resolved' where service_request_id=j.service_request_id and status='open';
 if r.job_id is not null then
  update public.t100_completion_reports set resolution=desired where job_id=j.id;
  perform public.t100_prepare_finalization(j.id);
  select * into f from public.t100_finalizations where service_request_id=j.service_request_id;
 else
  select * into q from public.service_quotes where id=j.accepted_quote_id and service_request_id=j.service_request_id and status='accepted';
  select * into i from public.finance_payment_intents where service_request_id=j.service_request_id and purpose='initial' for update;
  if q.id is null or q.currency<>'TRY' or q.total_amount<=0 or i.id is not null and (i.amount<>q.total_amount or i.quote_id<>q.id) then raise exception 'T100 approved price mismatch'; end if;
  insert into public.t100_finalizations(service_request_id,job_id,source,action,amount,intent_id)
  values(j.service_request_id,j.id,desired,p_decision,q.total_amount,i.id) returning * into f;
  if p_decision='distribute' then perform t100_private.legacy_complete_service_job(j.id,j.technician_id); end if;
 end if;
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(j.service_request_id,j.id,p_admin_id,'completion.'||desired,'t100_finalization',f.id,jsonb_build_object('providerConfirmed',false));
 return jsonb_build_object('id',f.id,'state',f.state,'action',f.action);
end $$;
-- Guard every legacy operational write that could race a reserved financial result.
create function t100_private.guard_reserved_job() returns trigger
language plpgsql security definer set search_path='' as $$
declare f public.t100_finalizations%rowtype;
begin
 select * into f from public.t100_finalizations where service_request_id=new.service_request_id;
 if f.id is not null then
  if new.status='completed' and f.action='distribute' and f.job_id=new.id then return new; end if;
  if new.status='cancelled' and f.state='verified' and f.action in ('refund','cancel') then return new; end if;
  if tg_op='INSERT' or new.status is distinct from old.status then raise exception 'T100 financial resolution reserved'; end if;
 end if;
 return new;
end $$;
create trigger t100_reserved_job before insert or update of status on public.service_jobs
for each row execute function t100_private.guard_reserved_job();

revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
