begin;
create or replace function public.t100_answer_completion(p_job_id uuid,p_customer_id uuid,p_answer text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.t100_completion_reports%rowtype; req public.service_requests%rowtype;
begin
 perform t100_private.assert_actor(p_customer_id,'customer');
 if p_answer not in ('yes','no') or p_answer is null then raise exception 'T100 invalid answer'; end if;
 select q.* into req from public.service_requests q join public.service_jobs j on j.service_request_id=q.id where j.id=p_job_id for update of q;
 if not found or req.customer_id<>p_customer_id then raise exception 'T100 forbidden'; end if;
 select * into r from public.t100_completion_reports where job_id=p_job_id for update;
 if not found or r.voided_at is not null then raise exception 'T100 report not available'; end if;
 if r.resolution is not null or r.response<>'pending' then
  if (r.response=p_answer and r.resolution in ('customer_yes')) or (r.response='no' and p_answer='no' and r.resolution is null)
  then return to_jsonb(r); end if;
  raise exception 'T100 response conflict';
 end if;
 if exists(select 1 from public.t100_finalizations where service_request_id=req.id) then raise exception 'T100 resolution conflict'; end if;
 if clock_timestamp()>=r.deadline then
  update public.t100_completion_reports set resolution='timeout' where job_id=p_job_id returning * into r;
  return to_jsonb(r);
 end if;
 update public.t100_completion_reports set response=p_answer,
 resolution=case when p_answer='yes' then 'customer_yes' else null end where job_id=p_job_id returning * into r;
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(req.id,p_job_id,p_customer_id,'completion.customer_'||p_answer,'service_job',p_job_id,'{}');
 return to_jsonb(r);
end $$;
create or replace function public.t100_expire_completions(p_limit integer default 50) returns integer
language plpgsql security definer set search_path='' as $$
declare r record; total integer:=0;
begin
 if p_limit not between 1 and 100 then raise exception 'T100 invalid batch'; end if;
 for r in select q.id req,c.job_id from public.t100_completion_reports c
 join public.service_requests q on q.id=c.service_request_id
 where c.response='pending' and c.resolution is null and c.voided_at is null and c.deadline<=clock_timestamp()
 and not exists(select 1 from public.t100_reviews v where v.service_request_id=q.id and v.status='open')
 order by c.deadline limit p_limit for update of q skip locked
 loop
  update public.t100_completion_reports c set resolution='timeout'
  where c.job_id=r.job_id and c.response='pending' and c.resolution is null and c.voided_at is null
   and not exists(select 1 from public.t100_finalizations f where f.service_request_id=r.req);
  if found then total:=total+1; end if;
 end loop;
 return total;
end $$;
create function public.t100_prepare_finalization(p_job_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.t100_completion_reports%rowtype;j public.service_jobs%rowtype;
 q public.service_quotes%rowtype;i public.finance_payment_intents%rowtype;f public.t100_finalizations%rowtype;
begin
 select service_request_id into j.service_request_id from public.service_jobs where id=p_job_id;
 perform 1 from public.service_requests where id=j.service_request_id for update;
 select * into j from public.service_jobs where id=p_job_id for update;
 select * into r from public.t100_completion_reports where job_id=p_job_id for update;
 if not found or r.voided_at is not null or r.resolution is null then raise exception 'T100 completion decision required'; end if;
 if exists(select 1 from public.t100_reviews where service_request_id=j.service_request_id and status='open')
 and r.resolution not in ('admin_distribute','admin_refund') then raise exception 'T100 review required'; end if;
 select * into f from public.t100_finalizations where service_request_id=j.service_request_id;
 if found then
  if f.job_id is distinct from p_job_id or f.source<>r.resolution then raise exception 'T100 resolution conflict'; end if;
  return f.id;
 end if;
 if j.status not in ('assigned','in_progress') then raise exception 'T100 job not available'; end if;
 select * into q from public.service_quotes where id=j.accepted_quote_id and service_request_id=j.service_request_id and status='accepted';
 if not found or q.currency<>'TRY' or q.total_amount<=0 then raise exception 'T100 approved price required'; end if;
 select * into i from public.finance_payment_intents where service_request_id=j.service_request_id and purpose='initial' for update;
 if i.id is not null and (i.quote_id<>q.id or i.amount<>q.total_amount or i.currency<>q.currency) then raise exception 'T100 price intent mismatch'; end if;
 insert into public.t100_finalizations(service_request_id,job_id,source,action,amount,intent_id)
 values(j.service_request_id,j.id,r.resolution,case when r.resolution='admin_refund' then 'refund' else 'distribute' end,q.total_amount,i.id) returning * into f;
 if f.action='distribute' then perform t100_private.legacy_complete_service_job(j.id,j.technician_id); end if;
 return f.id;
end $$;

create function public.t100_completion_tick(p_limit integer default 50) returns integer
language plpgsql security definer set search_path='' as $$
declare item record;total integer:=0;
begin
 if p_limit not between 1 and 100 then raise exception 'T100 invalid batch'; end if;
 perform public.t100_expire_completions(p_limit);
 for item in select c.job_id from public.t100_completion_reports c join public.service_requests q on q.id=c.service_request_id
 where c.resolution is not null and c.voided_at is null and
 not exists(select 1 from public.t100_finalizations f where f.service_request_id=c.service_request_id)
 order by c.deadline limit p_limit for update of q skip locked
 loop
  begin
   perform public.t100_prepare_finalization(item.job_id);total:=total+1;
  exception when others then
   insert into public.operational_events(service_request_id,job_id,event_type,entity_type,entity_id,payload)
   select c.service_request_id,c.job_id,'completion.preparation_blocked','service_job',c.job_id,'{}'
   from public.t100_completion_reports c where c.job_id=item.job_id
   and not exists(select 1 from public.operational_events e where e.job_id=item.job_id and e.event_type='completion.preparation_blocked');
  end;
 end loop;
 return total;
end $$;

create function public.t100_request_state(p_request_id uuid,p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare req public.service_requests%rowtype;j public.service_jobs%rowtype;role_name text;policy jsonb;
begin
 select * into req from public.service_requests where id=p_request_id;
 select role into role_name from public.users where id=p_actor_id and is_active;
 if req.id is null then raise exception 'T100 not found'; end if;
 if role_name is null or not (role_name='customer' and req.customer_id=p_actor_id or role_name='admin' or
 role_name='technician' and exists(select 1 from public.service_jobs where service_request_id=req.id and technician_id=p_actor_id))
 then raise exception 'T100 forbidden'; end if;
 select * into j from public.service_jobs where service_request_id=req.id and (role_name<>'technician' or technician_id=p_actor_id)
 order by (status in ('assigned','in_progress')) desc,assigned_at desc,id desc limit 1;
 if role_name='customer' or role_name='technician' and j.status in ('assigned','in_progress')
 then policy:=public.t100_cancellation_policy(req.id,p_actor_id); end if;
 return jsonb_build_object('requestId',req.id,'jobId',j.id,'jobStatus',j.status,'policy',policy,'serverNow',clock_timestamp(),
 'completion',(select to_jsonb(c) from public.t100_completion_reports c where c.job_id=j.id),
 'review',(select jsonb_build_object('status',v.status,'complaintId',v.complaint_id) from public.t100_reviews v where v.service_request_id=req.id),
 'finalization',(select jsonb_build_object('id',f.id,'action',f.action,'state',f.state,'amount',f.amount,'source',f.source) from public.t100_finalizations f where f.service_request_id=req.id),
 'simulation',(select jsonb_build_object('mode',s.mode,'bankTransfer',s.bank_transfer,'technicianMinor',s.technician_minor,'platformMinor',s.platform_minor,'totalMinor',s.total_minor) from public.t100_distribution_simulations s where s.service_request_id=req.id),
 'penaltyTotal',case when role_name='technician' then (select coalesce(sum(points),0) from public.t100_penalty_entries where technician_id=p_actor_id) else null end);
end $$;
do $t100_cron$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('hizmetpey-t100-completion','* * * * *','select public.t100_completion_tick(50);');
 end if;
end $t100_cron$;
revoke all on function public.t100_prepare_finalization(uuid),public.t100_completion_tick(integer),public.t100_request_state(uuid,uuid) from public,anon,authenticated;
grant execute on function public.t100_prepare_finalization(uuid),public.t100_completion_tick(integer),public.t100_request_state(uuid,uuid) to service_role;
revoke all on all functions in schema t100_private from public,anon,authenticated,service_role;
commit;
