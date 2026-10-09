\set ON_ERROR_STOP on
do $$ begin if current_database()<>'tekniko_stage10_test' then raise exception 'Refusing Stage 10 audit outside disposable database'; end if; end $$;
begin;
create temporary table audit_ids(k text primary key,v uuid not null);
insert into audit_ids values
  ('customer',gen_random_uuid()),('technician',gen_random_uuid()),('oldtech',gen_random_uuid()),('admin',gen_random_uuid()),
  ('redistribution_request',gen_random_uuid()),('redistribution_quote',gen_random_uuid()),('redistribution_dispatch',gen_random_uuid()),('redistribution_job',gen_random_uuid()),
  ('cancel_request',gen_random_uuid()),('cancel_quote',gen_random_uuid()),('cancel_dispatch',gen_random_uuid()),('cancel_pending_dispatch',gen_random_uuid()),('cancel_job',gen_random_uuid()),
  ('closed_request',gen_random_uuid()),('closed_quote',gen_random_uuid()),('closed_dispatch',gen_random_uuid()),('closed_dispatch2',gen_random_uuid()),('closed_job',gen_random_uuid()),('closed_job2',gen_random_uuid());
create function pg_temp.aid(k text) returns uuid language sql as $$select v from audit_ids where audit_ids.k=$1$$;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;end$$;

insert into auth.users(id) select v from audit_ids where k in('customer','technician','oldtech','admin');
insert into public.users(id,name,role,is_active) values
  (pg_temp.aid('customer'),'AUDIT CUSTOMER','customer',true),(pg_temp.aid('technician'),'AUDIT TECH','technician',true),
  (pg_temp.aid('oldtech'),'AUDIT OLD TECH','technician',true),(pg_temp.aid('admin'),'AUDIT ADMIN','admin',true);
insert into public.customer_profiles(user_id) values(pg_temp.aid('customer'));
update public.technician_profiles set approval_status='approved',is_available=true where user_id in(pg_temp.aid('technician'),pg_temp.aid('oldtech'));
insert into public.cities(name) values('Audit City');
insert into public.districts(city_id,name) select id,'Audit District' from public.cities where name='Audit City';
insert into public.customer_addresses(customer_id,city_id,district_id,address_line,is_default)
select pg_temp.aid('customer'),c.id,d.id,'Audit address line',true from public.cities c join public.districts d on d.city_id=c.id where c.name='Audit City';
insert into public.technician_service_categories(technician_id,category_id,approval_status)
select u,c.id,'approved' from (values(pg_temp.aid('technician')),(pg_temp.aid('oldtech'))) x(u) cross join public.service_categories c where c.code='boiler';
insert into public.technician_service_areas(technician_id,city_id,district_id)
select u,c.id,null from (values(pg_temp.aid('technician')),(pg_temp.aid('oldtech'))) x(u) cross join public.cities c where c.name='Audit City';

-- A stale cancelled job must not hide an active redistribution cycle.
insert into public.service_requests(id,customer_id,category_id,address_id,status)
select pg_temp.aid('redistribution_request'),pg_temp.aid('customer'),c.id,a.id,'diagnosing' from public.service_categories c cross join public.customer_addresses a where c.code='boiler' and a.customer_id=pg_temp.aid('customer') limit 1;
insert into public.service_quotes(id,service_request_id,version,status,currency,subtotal,total_amount,offered_at)
values(pg_temp.aid('redistribution_quote'),pg_temp.aid('redistribution_request'),1,'offered','TRY',2000,2000,now());
select public.accept_service_quote(pg_temp.aid('redistribution_quote'),pg_temp.aid('customer'));
insert into public.service_dispatches(id,service_request_id,quote_id,status,started_at,closed_at)
values(pg_temp.aid('redistribution_dispatch'),pg_temp.aid('redistribution_request'),pg_temp.aid('redistribution_quote'),'accepted',now(),now());
insert into public.service_jobs(id,service_request_id,dispatch_id,accepted_quote_id,technician_id,status,cancelled_at)
values(pg_temp.aid('redistribution_job'),pg_temp.aid('redistribution_request'),pg_temp.aid('redistribution_dispatch'),pg_temp.aid('redistribution_quote'),pg_temp.aid('oldtech'),'assigned',null);
update public.service_jobs set status='cancelled',cancelled_at=now() where id=pg_temp.aid('redistribution_job');
insert into public.service_distribution_cycles(service_request_id,quote_id,source_job_id,status,current_round,next_round_at)
values(pg_temp.aid('redistribution_request'),pg_temp.aid('redistribution_quote'),pg_temp.aid('redistribution_job'),'active',1,now()+interval '7 minutes');
select pg_temp.ok(public.stage10_operation_contract(pg_temp.aid('redistribution_request'),pg_temp.aid('customer'))->>'stage'='distributing','stale cancelled job hid active redistribution');
select pg_temp.ok(public.stage10_operation_contract(pg_temp.aid('redistribution_request'),pg_temp.aid('customer'))->>'currentJobId' is null,'cancelled job exposed as current job');
do $$ begin
  perform public.stage10_operation_contract(pg_temp.aid('redistribution_request'),pg_temp.aid('oldtech'));
  raise exception 'FAILED: old technician retained operation access during redistribution';
exception when others then if sqlerrm='FAILED: old technician retained operation access during redistribution' then raise; end if; end $$;

-- The shared cancellation primitive must close every active operation record once.
insert into public.service_requests(id,customer_id,category_id,address_id,status)
select pg_temp.aid('cancel_request'),pg_temp.aid('customer'),c.id,a.id,'diagnosing' from public.service_categories c cross join public.customer_addresses a where c.code='boiler' and a.customer_id=pg_temp.aid('customer') limit 1;
insert into public.service_quotes(id,service_request_id,version,status,currency,subtotal,total_amount,offered_at)
values(pg_temp.aid('cancel_quote'),pg_temp.aid('cancel_request'),1,'offered','TRY',1500,1500,now());
select public.accept_service_quote(pg_temp.aid('cancel_quote'),pg_temp.aid('customer'));
insert into public.service_distribution_cycles(service_request_id,quote_id,status,current_round,next_round_at)
values(pg_temp.aid('cancel_request'),pg_temp.aid('cancel_quote'),'active',1,now()+interval '7 minutes');
insert into public.service_dispatches(id,service_request_id,quote_id,status,started_at)
values(pg_temp.aid('cancel_dispatch'),pg_temp.aid('cancel_request'),pg_temp.aid('cancel_quote'),'accepted',now());
insert into public.service_dispatches(id,service_request_id,quote_id,status,started_at)
values(pg_temp.aid('cancel_pending_dispatch'),pg_temp.aid('cancel_request'),pg_temp.aid('cancel_quote'),'broadcasting',now());
insert into public.service_jobs(id,service_request_id,dispatch_id,accepted_quote_id,technician_id,status)
values(pg_temp.aid('cancel_job'),pg_temp.aid('cancel_request'),pg_temp.aid('cancel_dispatch'),pg_temp.aid('cancel_quote'),pg_temp.aid('technician'),'assigned');
insert into public.service_appointments(job_id,starts_at,status) values(pg_temp.aid('cancel_job'),now()+interval '1 hour','scheduled');
select pg_temp.ok(public.stage10_preflight_case_action('additional_cost',pg_temp.aid('technician'),null,pg_temp.aid('cancel_job')),'eligible additional-cost upload preflight failed');
select pg_temp.ok(public.stage10_preflight_case_action('complaint',pg_temp.aid('customer'),pg_temp.aid('cancel_request'),null),'eligible complaint upload preflight failed');
do $$ begin
  perform public.stage10_preflight_case_action('complaint',pg_temp.aid('admin'),pg_temp.aid('cancel_request'),null);
  raise exception 'FAILED: ineligible role passed complaint upload preflight';
exception when others then if sqlerrm='FAILED: ineligible role passed complaint upload preflight' then raise; end if; end $$;
select public.stage10_admin_cancel_service(pg_temp.aid('cancel_request'),pg_temp.aid('admin'),'Bağımsız denetim iptal gerekçesi','cancel-audit-key');
select pg_temp.ok((select status='cancelled' from public.service_requests where id=pg_temp.aid('cancel_request')),'request not cancelled');
select pg_temp.ok((select status='cancelled' from public.service_jobs where id=pg_temp.aid('cancel_job')),'job not cancelled');
select pg_temp.ok((select status='cancelled' from public.service_appointments where job_id=pg_temp.aid('cancel_job')),'appointment not cancelled');
select pg_temp.ok((select status='cancelled' from public.service_dispatches where id=pg_temp.aid('cancel_pending_dispatch')),'active dispatch not cancelled');
select pg_temp.ok((select status='accepted' from public.service_dispatches where id=pg_temp.aid('cancel_dispatch')),'historical accepted dispatch was rewritten');
select pg_temp.ok((select status='cancelled' from public.service_distribution_cycles where service_request_id=pg_temp.aid('cancel_request')),'cycle not cancelled');
select public.stage10_admin_cancel_service(pg_temp.aid('cancel_request'),pg_temp.aid('admin'),'Bağımsız denetim iptal gerekçesi','cancel-audit-key');
select pg_temp.ok((select count(*)=1 from public.operational_events where service_request_id=pg_temp.aid('cancel_request') and event_type='admin.service_cancelled'),'cancel retry duplicated audit event');

-- A valid upload preflight is advisory: if the job closes before the final RPC,
-- the transactional authorization must reject the request and evidence metadata.
do $$ begin
  perform public.stage10_create_additional_cost(
    pg_temp.aid('cancel_job'),pg_temp.aid('technician'),100,
    'Ön kontrolden sonra kapanan iş için ek maliyet',
    'preflight-race-key',
    jsonb_build_array(jsonb_build_object(
      'kind','photo','size',100,
      'path','stage10/'||pg_temp.aid('technician')::text||'/additional_cost/race.jpg',
      'mime','image/jpeg','name','race.jpg'
    ))
  );
  raise exception 'FAILED: final RPC accepted a job closed after upload preflight';
exception when others then if sqlerrm='FAILED: final RPC accepted a job closed after upload preflight' then raise; end if; end $$;
select pg_temp.ok(not exists(select 1 from public.service_additional_cost_requests where idempotency_key='preflight-race-key'),'preflight race created an additional-cost row');
select pg_temp.ok(not exists(select 1 from public.service_case_evidence where storage_path like '%/race.jpg'),'preflight race created evidence metadata');

-- Cancelled-without-completion does not invent an unlimited complaint window.
do $$ begin
  perform public.stage10_create_complaint(pg_temp.aid('cancel_request'),pg_temp.aid('customer'),'İptal edilen hizmet için şikâyet açıklaması','cancelled-complaint-key','[]');
  raise exception 'FAILED: cancelled incomplete service accepted a complaint';
exception when others then if sqlerrm='FAILED: cancelled incomplete service accepted a complaint' then raise; end if; end $$;

-- A completed service older than seven days is closed to new complaints.
insert into public.service_requests(id,customer_id,category_id,address_id,status)
select pg_temp.aid('closed_request'),pg_temp.aid('customer'),c.id,a.id,'diagnosing' from public.service_categories c cross join public.customer_addresses a where c.code='boiler' and a.customer_id=pg_temp.aid('customer') limit 1;
insert into public.service_quotes(id,service_request_id,version,status,currency,subtotal,total_amount,offered_at)
values(pg_temp.aid('closed_quote'),pg_temp.aid('closed_request'),1,'offered','TRY',1000,1000,now()-interval '9 days');
select public.accept_service_quote(pg_temp.aid('closed_quote'),pg_temp.aid('customer'));
insert into public.service_dispatches(id,service_request_id,quote_id,status,started_at,closed_at)
values(pg_temp.aid('closed_dispatch'),pg_temp.aid('closed_request'),pg_temp.aid('closed_quote'),'accepted',now()-interval '10 days',now()-interval '9 days');
insert into public.service_jobs(id,service_request_id,dispatch_id,accepted_quote_id,technician_id,status,assigned_at,completed_at)
values(pg_temp.aid('closed_job'),pg_temp.aid('closed_request'),pg_temp.aid('closed_dispatch'),pg_temp.aid('closed_quote'),pg_temp.aid('technician'),'assigned',now()-interval '10 days',null);
update public.service_jobs set status='completed',completed_at=now()-interval '8 days' where id=pg_temp.aid('closed_job');
insert into public.service_dispatches(id,service_request_id,quote_id,status,started_at,closed_at)
values(pg_temp.aid('closed_dispatch2'),pg_temp.aid('closed_request'),pg_temp.aid('closed_quote'),'accepted',now()-interval '40 days',now()-interval '8 days');
insert into public.service_jobs(id,service_request_id,dispatch_id,accepted_quote_id,technician_id,status,assigned_at,completed_at)
values(pg_temp.aid('closed_job2'),pg_temp.aid('closed_request'),pg_temp.aid('closed_dispatch2'),pg_temp.aid('closed_quote'),pg_temp.aid('technician'),'assigned',now()-interval '40 days',null);
update public.service_jobs set status='completed',completed_at=now()-interval '8 days' where id=pg_temp.aid('closed_job2');
do $$ begin
  perform public.stage10_create_complaint(pg_temp.aid('closed_request'),pg_temp.aid('customer'),'Süresi geçen hizmet için şikâyet açıklaması','expired-complaint-key','[]');
  raise exception 'FAILED: expired complaint window accepted';
exception when others then if sqlerrm='FAILED: expired complaint window accepted' then raise; end if; end $$;

-- KPI rates use the same-period cohort and cannot exceed one hundred.
update public.service_jobs set assigned_at=date_trunc('month',now())-interval '1 day',completed_at=date_trunc('month',now())+interval '1 day'
where id in(pg_temp.aid('closed_job'),pg_temp.aid('closed_job2'));
select pg_temp.ok((select (x->>'completionRate')::numeric<=100 from jsonb_array_elements(public.stage10_admin_kpi(pg_temp.aid('admin'),'monthly',current_date)->'technicians') x where x->>'technicianId'=pg_temp.aid('technician')::text),'completion rate exceeded 100');
select pg_temp.ok(public.stage10_admin_kpi(pg_temp.aid('admin'),'monthly',current_date)->'general'->'dateBasis'->>'timezone'='Europe/Istanbul','KPI timezone is not explicit');

-- Storage RLS remains private even with a hostile broad pre-existing policy.
insert into storage.objects(bucket_id,name) values('service-case-evidence','stage10/'||pg_temp.aid('customer')::text||'/unlinked.jpg');
set local role anon;
select pg_temp.ok((select count(*)=0 from storage.objects where bucket_id='service-case-evidence'),'anon read private evidence');
reset role;

-- Future active categories fail closed until an explicit warranty class is supplied.
do $$ begin
  insert into public.service_categories(code,name,is_active) values('audit_future','Audit Future',true);
  set constraints service_category_warranty_policy_required immediate;
  raise exception 'FAILED: active category without warranty policy accepted';
exception when others then if sqlerrm='FAILED: active category without warranty policy accepted' then raise; end if; end $$;

rollback;
