begin;
-- T111 source: 20261031093430_t111_finance_completion_evidence.sql

create table public.t111_finance_decisions(
 id uuid primary key default gen_random_uuid(),
 service_request_id uuid not null unique references public.service_requests(id),
 job_id uuid not null references public.service_jobs(id),
 admin_id uuid not null references public.users(id),
 complaint_id uuid not null references public.service_complaints(id),
 report_version uuid,
 decision text not null check(decision in('distribute','refund')),
 reason text not null check(length(btrim(reason)) between 20 and 2000),
 evidence_ids uuid[] not null check(cardinality(evidence_ids) between 1 and 5),
 idempotency_key text not null check(length(idempotency_key) between 8 and 128),
 fingerprint text not null,
 created_at timestamptz not null default clock_timestamp(),
 unique(admin_id,idempotency_key),check(decision<>'distribute' or report_version is not null)
);
alter table public.t111_finance_decisions enable row level security;
revoke all on public.t111_finance_decisions from public,anon,authenticated,service_role;
grant select on public.t111_finance_decisions to service_role;
create trigger t111_finance_decision_immutable before update or delete on public.t111_finance_decisions
for each row execute function public.stage10_reject_immutable_mutation();

alter function public.t100_admin_finance_decision(uuid,uuid,text) set schema t100_private;
alter function t100_private.t100_admin_finance_decision(uuid,uuid,text) rename to pre_t111_admin_finance_decision;
revoke all on function t100_private.pre_t111_admin_finance_decision(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.t100_admin_finance_decision(p_job_id uuid,p_admin_id uuid,p_decision text)returns jsonb
language plpgsql security definer set search_path='' as $$begin
 perform t100_private.assert_actor(p_admin_id,'admin');
 raise exception 'T111 reason and current evidence required';
end$$;

create function public.t111_admin_finance_decision(p_job_id uuid,p_admin_id uuid,p_decision text,p_complaint_id uuid,p_report_version uuid,p_reason text,p_evidence_ids uuid[],p_idempotency_key text)returns jsonb
language plpgsql security definer set search_path='' as $$
declare j public.service_jobs%rowtype;r public.t100_completion_reports%rowtype;c public.service_complaints%rowtype;
 a public.t111_finance_decisions%rowtype;f public.t100_finalizations%rowtype;fingerprint text;result jsonb;
begin
 perform t100_private.assert_actor(p_admin_id,'admin');
 if p_decision is null or p_decision not in('distribute','refund') or p_reason is null or length(btrim(p_reason)) not between 20 and 2000
 or p_idempotency_key is null or length(p_idempotency_key) not between 8 and 128
 or p_evidence_ids is null or cardinality(p_evidence_ids) not between 1 and 5
 or cardinality(p_evidence_ids)<>(select count(distinct id) from unnest(p_evidence_ids) id)
 then raise exception 'T111 reason and evidence required';end if;
 select * into j from public.service_jobs where id=p_job_id;
 if j.id is null then raise exception 'T111 job not found';end if;
 perform pg_advisory_xact_lock(hashtextextended('t111:finance:'||p_admin_id::text||':'||p_idempotency_key,0));
 perform 1 from public.service_requests where id=j.service_request_id for update;
 select * into j from public.service_jobs where id=p_job_id for update;
 fingerprint:=md5(jsonb_build_object('job',p_job_id,'decision',p_decision,'complaint',p_complaint_id,'report',p_report_version,'reason',btrim(p_reason),'evidence',(select jsonb_agg(id order by id) from unnest(p_evidence_ids) id))::text);
 select * into a from public.t111_finance_decisions where admin_id=p_admin_id and idempotency_key=p_idempotency_key;
 if found then
  if a.fingerprint<>fingerprint then raise exception 'T111 idempotency conflict';end if;
  select * into f from public.t100_finalizations where service_request_id=a.service_request_id and job_id=a.job_id and source='admin_'||a.decision;
  if f.id is null then raise exception 'T111 decision result unresolved';end if;
  return jsonb_build_object('id',f.id,'state',f.state,'action',f.action,'decisionId',a.id);
 end if;
 if j.status not in('assigned','in_progress') or exists(select 1 from public.t100_finalizations where service_request_id=j.service_request_id)
 then raise exception 'T111 resolution conflict';end if;
 if exists(select 1 from public.finance_payment_intents where service_request_id=j.service_request_id and status='requires_review')
 then raise exception 'T111 financial outcome uncertain';end if;
 select * into r from public.t100_completion_reports where job_id=j.id for update;
 -- Complaint closure and the separately pending financial review are independent states.
 select * into c from public.service_complaints where id=p_complaint_id and service_request_id=j.service_request_id for update;
 if c.id is null or c.status not in('under_review','resolved') or not coalesce((r.complaint_id=c.id and r.response='no' and r.voided_at is null
 or exists(select 1 from public.t100_reviews where service_request_id=j.service_request_id and status='open' and complaint_id=c.id)),false)
 then raise exception 'T111 current complaint required';end if;
 if r.job_id is not null and (r.voided_at is not null or r.resolution is not null or r.report_version is distinct from p_report_version)
 or r.job_id is null and p_report_version is not null
 or p_decision='distribute' and (r.job_id is null or p_report_version is null)
 then raise exception 'T111 current completion evidence required';end if;
 if exists(select 1 from unnest(p_evidence_ids) e where not exists(select 1 from public.service_case_evidence x where x.id=e and x.complaint_id=c.id))
 then raise exception 'T111 complaint evidence mismatch';end if;
 insert into public.t111_finance_decisions(service_request_id,job_id,admin_id,complaint_id,report_version,decision,reason,evidence_ids,idempotency_key,fingerprint)
 values(j.service_request_id,j.id,p_admin_id,c.id,p_report_version,p_decision,btrim(p_reason),p_evidence_ids,p_idempotency_key,fingerprint) returning * into a;
 result:=t100_private.pre_t111_admin_finance_decision(j.id,p_admin_id,p_decision);
 insert into public.operational_events(service_request_id,job_id,actor_user_id,event_type,entity_type,entity_id,payload)
 values(j.service_request_id,j.id,p_admin_id,'admin.finance_decision_recorded','t111_finance_decision',a.id,jsonb_build_object('finalizationId',result->>'id','complaintId',c.id,'reportVersion',p_report_version));
 return result||jsonb_build_object('decisionId',a.id);
end$$;

-- Independent database guards: no old RPC, worker or provider path can invent completion.
create function t100_private.t111_assert_completion(p_job_id uuid,p_source text) returns void
language plpgsql security definer set search_path='' as $$
declare r public.t100_completion_reports%rowtype;j public.service_jobs%rowtype;
begin
 select * into j from public.service_jobs where id=p_job_id;
 select * into r from public.t100_completion_reports where job_id=p_job_id;
 if j.id is null or r.job_id is null or r.service_request_id<>j.service_request_id or r.technician_id<>j.technician_id or r.voided_at is not null
 or r.resolution is null or r.resolution not in('customer_yes','timeout','admin_distribute') or r.resolution is distinct from p_source
 then raise exception 'T111 current completion evidence required';end if;
 if exists(select 1 from public.service_jobs where service_request_id=j.service_request_id and status in('assigned','in_progress') and id<>j.id)
 then raise exception 'T111 assignment changed';end if;
 if p_source='admin_distribute' and not exists(select 1 from public.t111_finance_decisions a
 where a.service_request_id=j.service_request_id and a.job_id=j.id and a.report_version=r.report_version and a.decision='distribute' and a.complaint_id=r.complaint_id)
 then raise exception 'T111 verified admin decision required';end if;
end$$;
create function t100_private.t111_guard_completion() returns trigger language plpgsql security definer set search_path='' as $$
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
    if new.metadata->>'purpose' is distinct from 'cancellation_fee' or f.amount<=0 or new.amount<=0
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
create trigger t111_job_completion before update of status on public.service_jobs for each row execute function t100_private.t111_guard_completion();
create trigger t111_finalization_completion before insert or update on public.t100_finalizations for each row execute function t100_private.t111_guard_completion();
create trigger t111_capture_completion before insert or update on public.finance_transactions for each row execute function t100_private.t111_guard_completion();
create trigger t111_distribution_completion before insert on public.t100_distribution_simulations for each row execute function t100_private.t111_guard_completion();
revoke all on function t100_private.t111_assert_completion(uuid,text),t100_private.t111_guard_completion() from public,anon,authenticated,service_role;
revoke all on function public.t100_admin_finance_decision(uuid,uuid,text),public.t111_admin_finance_decision(uuid,uuid,text,uuid,uuid,text,uuid[],text) from public,anon,authenticated;
grant execute on function public.t100_admin_finance_decision(uuid,uuid,text),public.t111_admin_finance_decision(uuid,uuid,text,uuid,uuid,text,uuid[],text) to service_role;

-- T111 source: 20261031093657_t111_private_case_communication.sql

alter table public.complaint_information_requests add column recipient_user_id uuid references public.users(id),add column request_key text,add column fingerprint text;
alter table public.complaint_information_requests add constraint t111_targeted_question check((recipient_user_id is null and request_key is null and fingerprint is null) or (recipient_user_id is not null and length(request_key) between 8 and 128 and fingerprint is not null));
create unique index t111_question_once on public.complaint_information_requests(admin_user_id,request_key) where request_key is not null;
create table public.t111_information_responses(
 question_id uuid primary key references public.complaint_information_requests(id),responder_id uuid not null references public.users(id),
 response_text text not null check(length(btrim(response_text)) between 10 and 2000),response_key text not null check(length(response_key) between 8 and 128),fingerprint text not null,
 created_at timestamptz not null default clock_timestamp(),unique(responder_id,response_key)
);
create table public.t111_case_resolutions(
 complaint_id uuid primary key references public.service_complaints(id),decision_id uuid not null unique references public.complaint_decisions(id),
 customer_message text not null check(length(btrim(customer_message)) between 20 and 2000),operation_message text,
 admin_id uuid not null references public.users(id),request_key text not null check(length(request_key) between 8 and 128),fingerprint text not null,created_at timestamptz not null default clock_timestamp(),unique(admin_id,request_key)
);
create table public.t111_case_notifications(
 id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.users(id),service_request_id uuid not null references public.service_requests(id),
 kind text not null check(kind in('question','case_result','operation_decision')),source_id uuid not null,message text not null,
 created_at timestamptz not null default clock_timestamp(),unique(recipient_id,kind,source_id)
);
do $$declare n text;begin foreach n in array array['t111_information_responses','t111_case_resolutions','t111_case_notifications']loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',n);
 execute format('grant select on public.%I to service_role',n);
 execute format('create trigger t111_immutable before update or delete on public.%I for each row execute function public.stage10_reject_immutable_mutation()',n);
end loop;end$$;

create function public.t111_request_information(p_id uuid,p_admin_id uuid,p_recipient_id uuid,p_message text,p_key text,p_version integer)returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.service_complaints%rowtype;q public.complaint_information_requests%rowtype;fp text;
begin
 perform t100_private.assert_actor(p_admin_id,'admin');
 if p_message is null or length(btrim(p_message)) not between 10 and 1000 or p_key is null or length(p_key) not between 8 and 128 then raise exception 'T111 invalid information request';end if;
 perform pg_advisory_xact_lock(hashtextextended('t111:question:'||p_admin_id::text||':'||p_key,0));
 select * into c from public.service_complaints where id=p_id for update;
 if c.id is null then raise exception 'T111 complaint not found';end if;
 fp:=md5(jsonb_build_array(p_id,p_recipient_id,btrim(p_message),p_version)::text);
 select * into q from public.complaint_information_requests where admin_user_id=p_admin_id and request_key=p_key;
 if found then if q.fingerprint<>fp then raise exception 'T111 question replay conflict';end if;return q.id;end if;
 if c.status<>'under_review' or c.version is distinct from p_version then raise exception 'T111 complaint closed or changed';end if;
 if not exists(select 1 from public.users u where u.id=p_recipient_id and u.is_active and
 (u.role='customer' and exists(select 1 from public.service_requests r where r.id=c.service_request_id and r.customer_id=u.id)
 or u.role='technician' and exists(select 1 from public.service_jobs j where j.service_request_id=c.service_request_id and j.technician_id=u.id)))
 then raise exception 'T111 forbidden question recipient';end if;
 insert into public.complaint_information_requests(complaint_id,admin_user_id,message,recipient_user_id,request_key,fingerprint)
 values(c.id,p_admin_id,btrim(p_message),p_recipient_id,p_key,fp) returning * into q;
 insert into public.t111_case_notifications(recipient_id,service_request_id,kind,source_id,message) values(p_recipient_id,c.service_request_id,'question',q.id,btrim(p_message));
 return q.id;
end$$;
create or replace function public.stage10_admin_request_complaint_info(p_id uuid,p_admin_id uuid,p_message text) returns uuid language plpgsql security definer set search_path='' as $$begin
 perform t100_private.assert_actor(p_admin_id,'admin');raise exception 'T111 explicit recipient and version required';end$$;

create function public.t111_respond_information(p_id uuid,p_actor_id uuid,p_text text,p_key text)returns uuid
language plpgsql security definer set search_path='' as $$
declare q public.complaint_information_requests%rowtype;c public.service_complaints%rowtype;a public.t111_information_responses%rowtype;fp text;
begin
 if not exists(select 1 from public.users where id=p_actor_id and is_active and role in('customer','technician')) then raise exception 'T111 forbidden';end if;
 if p_text is null or length(btrim(p_text)) not between 10 and 2000 or p_key is null or length(p_key) not between 8 and 128 then raise exception 'T111 invalid response';end if;
 select * into q from public.complaint_information_requests where id=p_id;
 if q.recipient_user_id is distinct from p_actor_id then raise exception 'T111 forbidden';end if;
 select * into c from public.service_complaints where id=q.complaint_id for update;
 select * into q from public.complaint_information_requests where id=p_id for update;
 fp:=md5(jsonb_build_array(p_id,p_actor_id,btrim(p_text),p_key)::text);
 select * into a from public.t111_information_responses where question_id=q.id;
 if found then if a.fingerprint<>fp then raise exception 'T111 response replay conflict';end if;return a.question_id;end if;
 if c.status<>'under_review' then raise exception 'T111 complaint closed';end if;
 insert into public.t111_information_responses(question_id,responder_id,response_text,response_key,fingerprint)values(q.id,p_actor_id,btrim(p_text),p_key,fp);
 return q.id;
end$$;

alter function public.stage10_admin_decide_complaint(uuid,uuid,text,text,text,uuid,timestamptz,integer) set schema t100_private;
alter function t100_private.stage10_admin_decide_complaint(uuid,uuid,text,text,text,uuid,timestamptz,integer) rename to pre_t111_close_complaint;
revoke all on function t100_private.pre_t111_close_complaint(uuid,uuid,text,text,text,uuid,timestamptz,integer) from public,anon,authenticated,service_role;
create function public.stage10_admin_decide_complaint(p_id uuid,p_admin_id uuid,p_final_category text,p_decision text,p_reason text,p_subject_user_id uuid default null,p_sanction_ends_at timestamptz default null,p_expected_version integer default 1)returns uuid language plpgsql security definer set search_path='' as $$begin
 perform t100_private.assert_actor(p_admin_id,'admin');raise exception 'T111 public resolution required';end$$;
create function public.t111_close_complaint(p_id uuid,p_admin_id uuid,p_category text,p_decision text,p_reason text,p_subject_id uuid,p_ends_at timestamptz,p_version integer,p_customer_message text,p_operation_message text,p_key text)returns uuid
language plpgsql security definer set search_path='' as $$
declare c public.service_complaints%rowtype;r public.t111_case_resolutions%rowtype;decision_id uuid;fp text;customer_id uuid;notify_technician boolean;
begin
 perform t100_private.assert_actor(p_admin_id,'admin');
 if p_customer_message is null or length(btrim(p_customer_message)) not between 20 and 2000 or p_key is null or length(p_key) not between 8 and 128 then raise exception 'T111 public resolution required';end if;
 perform pg_advisory_xact_lock(hashtextextended('t111:close:'||p_admin_id::text||':'||p_key,0));
 select * into c from public.service_complaints where id=p_id for update;
 if c.id is null then raise exception 'T111 complaint not found';end if;
 fp:=md5(jsonb_build_array(p_id,p_admin_id,p_category,p_decision,p_reason,p_subject_id,p_ends_at,p_version,btrim(p_customer_message),p_operation_message,p_key)::text);
 select * into r from public.t111_case_resolutions where complaint_id=p_id;
 if found then if r.fingerprint<>fp then raise exception 'T111 decision replay conflict';end if;return r.decision_id;end if;
 if c.status<>'under_review' or c.version is distinct from p_version then raise exception 'T111 complaint changed';end if;
 notify_technician:=p_decision in('warning','restrict_new_operations','temporary_suspension','permanent_closure') and exists(select 1 from public.users where id=p_subject_id and role='technician');
 if notify_technician and (p_operation_message is null or length(btrim(p_operation_message)) not between 10 and 1000) then raise exception 'T111 operational notice required';end if;
 decision_id:=t100_private.pre_t111_close_complaint(p_id,p_admin_id,p_category,p_decision,p_reason,p_subject_id,p_ends_at,p_version);
 insert into public.t111_case_resolutions(complaint_id,decision_id,customer_message,operation_message,admin_id,request_key,fingerprint)
 values(p_id,decision_id,btrim(p_customer_message),case when notify_technician then btrim(p_operation_message) end,p_admin_id,p_key,fp);
 select r0.customer_id into customer_id from public.service_requests r0 where r0.id=c.service_request_id;
 insert into public.t111_case_notifications(recipient_id,service_request_id,kind,source_id,message)values(customer_id,c.service_request_id,'case_result',decision_id,btrim(p_customer_message));
 if notify_technician then insert into public.t111_case_notifications(recipient_id,service_request_id,kind,source_id,message)values(p_subject_id,c.service_request_id,'operation_decision',decision_id,btrim(p_operation_message));end if;
 return decision_id;
end$$;

create function public.t111_case_inbox(p_actor_id uuid)returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not exists(select 1 from public.users where id=p_actor_id and is_active and role in('customer','technician')) then raise exception 'T111 forbidden';end if;
 return jsonb_build_object('questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'requestId',c.service_request_id,'message',q.message,'createdAt',q.created_at,'closed',c.status<>'under_review','response',case when a.question_id is not null then jsonb_build_object('text',a.response_text,'createdAt',a.created_at) end) order by q.created_at desc)
 from public.complaint_information_requests q join public.service_complaints c on c.id=q.complaint_id left join public.t111_information_responses a on a.question_id=q.id and a.responder_id=p_actor_id where q.recipient_user_id=p_actor_id),'[]'::jsonb),
 'notices',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'requestId',n.service_request_id,'kind',n.kind,'message',n.message,'createdAt',n.created_at) order by n.created_at desc) from public.t111_case_notifications n where n.recipient_id=p_actor_id),'[]'::jsonb));
end$$;

alter function public.t100_request_state(uuid,uuid) set schema t100_private;
alter function t100_private.t100_request_state(uuid,uuid) rename to pre_t111_request_state;
revoke all on function t100_private.pre_t111_request_state(uuid,uuid) from public,anon,authenticated,service_role;
create function public.t100_request_state(p_request_id uuid,p_actor_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;actor_role text;begin
 result:=t100_private.pre_t111_request_state(p_request_id,p_actor_id);
 select role into actor_role from public.users where id=p_actor_id and is_active;
 if actor_role='technician' then
  result:=result||jsonb_build_object('completion',null,'complaint',null,'review',null,'preparation',null,'operationalHold',exists(select 1 from public.t100_reviews where service_request_id=p_request_id and status='open'));
  if result->>'jobStatus'='cancelled' then result:=result||jsonb_build_object('finalization',null,'simulation',null,'funding',null);end if;
 end if;
 return result;
end$$;
do $$declare p record;begin for p in select x.oid::regprocedure sig from pg_proc x join pg_namespace n on n.oid=x.pronamespace where n.nspname='public' and (x.proname like 't111_%' or x.proname in('stage10_admin_request_complaint_info','stage10_admin_decide_complaint','t100_request_state'))loop
 execute 'revoke all on function '||p.sig||' from public,anon,authenticated';execute 'grant execute on function '||p.sig||' to service_role';
end loop;end$$;

-- T111 source: 20261031094033_t111_admin_operations_read.sql


-- A private read model. Public callers only enter through verified admin RPCs.

create view t100_private.t111_admin_requests with (security_invoker=true) as

select r.id,r.created_at,r.customer_id,u.name customer_name,u.is_test,sc.name category_name,

 r.status::text request_status,coalesce(ci.name,a.city) city,coalesce(di.name,a.district) district,

 coalesce(public.t100_approved_total(r.id),q.total_amount) total_amount,q.currency,j.id job_id,j.status job_status,

 case when j.status in('assigned','in_progress','completed') then j.technician_id end technician_id,

 case when j.status in('assigned','in_progress','completed') then tech.name end technician_name,

 ap.starts_at appointment_at,ap.status appointment_status,

 coalesce(pi.status,'not_created') payment_status,

 exists(select 1 from public.finance_payment_intents i where i.service_request_id=r.id and i.status='requires_review')

 or exists(select 1 from public.t100_finalizations f where f.service_request_id=r.id and f.state in('unknown','blocked','failed')) financial_uncertainty,

 case when j.status='completed' then 'completed'

 when r.status='cancelled' then 'cancelled'

 when exists(select 1 from public.t100_reviews v where v.service_request_id=r.id and v.status='open') or cr.response='no' and cr.resolution is null and cr.voided_at is null then 'under_review'

 when cr.job_id is not null and cr.resolution is null and cr.voided_at is null then 'awaiting_customer'

 when j.status in('assigned','in_progress') then j.status

 when cy.status='active' then 'distributing'

 when cy.status='exhausted' then 'admin_intervention'

 when j.status='cancelled' then 'redistribution_pending'

 else 'request_open' end operation_status

from public.service_requests r join public.users u on u.id=r.customer_id

left join public.service_categories sc on sc.id=r.category_id

left join public.customer_addresses a on a.id=r.address_id

left join public.cities ci on ci.id=a.city_id left join public.districts di on di.id=a.district_id

left join lateral(select x.* from public.service_quotes x where x.service_request_id=r.id and x.status='accepted' order by x.version desc,x.id desc limit 1)q on true

left join lateral(select x.* from public.service_jobs x where x.service_request_id=r.id order by (x.status in('assigned','in_progress'))desc,(x.status='completed')desc,x.assigned_at desc,x.id desc limit 1)j on true

left join public.users tech on tech.id=j.technician_id

left join lateral(select x.* from public.service_appointments x where x.job_id=j.id and x.status<>'cancelled' order by x.created_at desc,x.id desc limit 1)ap on true

left join lateral(select x.* from public.finance_payment_intents x where x.service_request_id=r.id and x.purpose='initial' order by x.created_at desc,x.id desc limit 1)pi on true

left join lateral(select x.* from public.service_distribution_cycles x where x.service_request_id=r.id order by x.created_at desc,x.id desc limit 1)cy on true

left join public.t100_completion_reports cr on cr.job_id=j.id;

revoke all on t100_private.t111_admin_requests from public,anon,authenticated,service_role;



create function public.t111_admin_request_page(p_admin_id uuid,p_before timestamptz default null,p_before_id uuid default null,p_filter text default 'all',p_query text default '')returns jsonb

language plpgsql stable security definer set search_path='' as $$

declare result jsonb;begin

 perform t100_private.assert_actor(p_admin_id,'admin');

 if (p_before is null)<>(p_before_id is null) or p_filter is null or p_filter not in('all','unassigned','active','appointed','completed','cancelled','review','finance') or p_query is null or length(p_query)>100 then raise exception 'T111 invalid list filter';end if;

 with selected as(select v.* from t100_private.t111_admin_requests v

 where (p_before is null or (v.created_at,v.id)<(p_before,p_before_id))

 and (p_filter='all' or p_filter='unassigned' and v.technician_id is null and v.operation_status not in('cancelled','completed')

 or p_filter='active' and v.job_status in('assigned','in_progress') or p_filter='appointed' and v.job_status in('assigned','in_progress') and v.appointment_at is not null

 or p_filter='completed' and v.operation_status='completed' or p_filter='cancelled' and v.operation_status='cancelled'

 or p_filter='review' and v.operation_status='under_review' or p_filter='finance' and v.financial_uncertainty)

 and (p_query='' or position(lower(p_query) in lower(concat_ws(' ',v.customer_name,v.category_name,v.city,v.district,v.id::text)))>0)

 order by v.created_at desc,v.id desc limit 51), page as(select * from selected order by created_at desc,id desc limit 50)

 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc) from page p),'[]'::jsonb),

 'next',case when (select count(*) from selected)>50 then (select jsonb_build_object('at',p.created_at,'id',p.id) from page p order by p.created_at,p.id limit 1)end)into result;

 return result;

end$$;

create function public.t111_admin_summary(p_admin_id uuid)returns jsonb language plpgsql stable security definer set search_path='' as $$begin

 perform t100_private.assert_actor(p_admin_id,'admin');

 return jsonb_build_object('requests',(select count(*) from public.service_requests),

 'unassigned',(select count(*) from t100_private.t111_admin_requests where technician_id is null and operation_status not in('completed','cancelled')),

 'activeJobs',(select count(*) from public.service_jobs where status in('assigned','in_progress')),

 'appointedJobs',(select count(distinct j.id) from public.service_jobs j join public.service_appointments a on a.job_id=j.id and a.status<>'cancelled' where j.status in('assigned','in_progress')),

 'completedJobs',(select count(*) from public.service_jobs where status='completed'),

 'cancelledJobs',(select count(*) from public.service_jobs where status='cancelled'),

 'reviewRequests',(select count(*) from t100_private.t111_admin_requests where operation_status='under_review'),

 'customerComplaints',(select count(*) from public.service_complaints where applicant_role='customer' and status='under_review'),

 'financialReviewRequests',(select count(*) from t100_private.t111_admin_requests where financial_uncertainty));

end$$;

create function public.t111_admin_request_detail(p_admin_id uuid,p_request_id uuid,p_history boolean default false)returns jsonb

language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin

 perform t100_private.assert_actor(p_admin_id,'admin');

 select to_jsonb(v) into result from t100_private.t111_admin_requests v where v.id=p_request_id;

 if result is null then raise exception 'T111 request not found';end if;

 if p_history then return jsonb_build_object('request',result,

 'cycles',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'status',c.status,'round',c.current_round,'startedAt',c.started_at,'nextAt',c.next_round_at)order by c.created_at,c.id)from public.service_distribution_cycles c where c.service_request_id=p_request_id),'[]'::jsonb),

 'dispatches',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'status',d.status,'round',d.round_no,'expiresAt',d.expires_at)order by d.created_at,d.id)from public.service_dispatches d where d.service_request_id=p_request_id),'[]'::jsonb),

 'exclusions',coalesce((select jsonb_agg(jsonb_build_object('technician',u.name,'reason',e.reason,'createdAt',e.created_at)order by e.created_at,e.technician_id)from public.service_request_technician_exclusions e join public.users u on u.id=e.technician_id where e.service_request_id=p_request_id),'[]'::jsonb),

 'jobs',coalesce((select jsonb_agg(jsonb_build_object('id',j.id,'technician',u.name,'status',j.status,'assignedAt',j.assigned_at,'cancelledAt',j.cancelled_at,'source',j.assignment_source) order by j.assigned_at,j.id)from public.service_jobs j join public.users u on u.id=j.technician_id where j.service_request_id=p_request_id),'[]'::jsonb),

 'offers',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'technician',u.name,'status',c.status,'round',d.round_no,'offeredAt',c.offered_at,'respondedAt',c.responded_at)order by c.offered_at,c.id)from public.service_dispatch_candidates c join public.service_dispatches d on d.id=c.dispatch_id join public.users u on u.id=c.technician_id where d.service_request_id=p_request_id),'[]'::jsonb),

 'cancellations',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'jobId',c.job_id,'actor',u.name,'role',c.actor_role,'reason',c.reason,'points',c.points,'feeMinor',c.fee_minor,'createdAt',c.created_at)order by c.created_at,c.id)from public.t100_cancellations c join public.users u on u.id=c.actor_id where c.service_request_id=p_request_id),'[]'::jsonb),

 'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'type',e.event_type,'actor',u.name,'at',e.occurred_at)order by e.occurred_at,e.id)from public.operational_events e left join public.users u on u.id=e.actor_user_id where e.service_request_id=p_request_id),'[]'::jsonb));end if;

 return jsonb_build_object('request',result,

 'payments',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'purpose',i.purpose,'provider',i.provider,'environment',i.environment,'status',i.status,'amount',i.amount,'authorized',i.authorized_amount,'captured',i.captured_amount,'refunded',i.refunded_amount,'currency',i.currency)order by i.created_at,i.id)from public.finance_payment_intents i where i.service_request_id=p_request_id),'[]'::jsonb),

 'transactions',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'operation',t.operation,'status',t.status,'amount',t.amount,'currency',t.currency,'at',t.occurred_at)order by t.occurred_at,t.id)from public.finance_transactions t where t.service_request_id=p_request_id),'[]'::jsonb),

 'ledger',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'transactionId',l.transaction_id,'account',l.account,'direction',l.direction,'amount',l.amount,'currency',l.currency)order by l.id)from public.finance_ledger_entries l where l.service_request_id=p_request_id),'[]'::jsonb),

 'simulation',(select jsonb_build_object('purpose',s.purpose,'totalMinor',s.total_minor,'technicianMinor',s.technician_minor,'platformMinor',s.platform_minor,'mode',s.mode,'bankTransfer',s.bank_transfer)from public.t100_distribution_simulations s where s.service_request_id=p_request_id),

 'finalization',(select jsonb_build_object('id',f.id,'action',f.action,'state',f.state,'amount',f.amount,'remainingAuthorizationVerified',f.remaining_authorization_verified)from public.t100_finalizations f where f.service_request_id=p_request_id),

 'complaints',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'status',c.status,'role',c.applicant_role)order by c.created_at,c.id)from public.service_complaints c where c.service_request_id=p_request_id),'[]'::jsonb));

end$$;

revoke all on function public.t111_admin_request_page(uuid,timestamptz,uuid,text,text),public.t111_admin_summary(uuid),public.t111_admin_request_detail(uuid,uuid,boolean) from public,anon,authenticated;

grant execute on function public.t111_admin_request_page(uuid,timestamptz,uuid,text,text),public.t111_admin_summary(uuid),public.t111_admin_request_detail(uuid,uuid,boolean) to service_role;


commit;
