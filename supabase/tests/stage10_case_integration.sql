\set ON_ERROR_STOP on
do $$ begin if current_database()<>'tekniko_stage10_test' then raise exception 'Refusing Stage 10 test outside disposable database'; end if; end $$;
begin;
create temporary table s10(k text primary key,v uuid not null);
insert into s10 values('customer',gen_random_uuid()),('technician',gen_random_uuid()),('replacement',gen_random_uuid()),('unrelated',gen_random_uuid()),('admin',gen_random_uuid()),('request',gen_random_uuid()),('quote',gen_random_uuid()),('dispatch',gen_random_uuid()),('job',gen_random_uuid());
create function pg_temp.id(k text) returns uuid language sql as $$select v from s10 where s10.k=$1$$;
create function pg_temp.ok(v boolean,label text) returns void language plpgsql as $$begin if v is distinct from true then raise exception 'FAILED: %',label;end if;end$$;
insert into auth.users(id) select v from s10 where k in('customer','technician','replacement','unrelated','admin');
insert into public.users(id,name,role,is_active) values(pg_temp.id('customer'),'TEST CUSTOMER','customer',true),(pg_temp.id('technician'),'TEST TECH','technician',true),(pg_temp.id('replacement'),'TEST REPLACEMENT','technician',true),(pg_temp.id('unrelated'),'TEST UNRELATED','customer',true),(pg_temp.id('admin'),'TEST ADMIN','admin',true);
insert into public.customer_profiles(user_id) values(pg_temp.id('customer'));
update public.technician_profiles
set approval_status='approved',is_available=true
where user_id in(pg_temp.id('technician'),pg_temp.id('replacement'));
insert into public.cities(name) values('Test City');insert into public.districts(city_id,name) select id,'Test District' from public.cities limit 1;
insert into public.customer_addresses(customer_id,city_id,district_id,address_line,is_default) select pg_temp.id('customer'),c.id,d.id,'Test address line',true from public.cities c join public.districts d on d.city_id=c.id limit 1;
insert into public.technician_service_categories(technician_id,category_id,approval_status) select u,c.id,'approved' from (values(pg_temp.id('technician')),(pg_temp.id('replacement'))) x(u) cross join public.service_categories c where c.code='boiler';
insert into public.technician_service_areas(technician_id,city_id,district_id) select u,c.id,null from (values(pg_temp.id('technician')),(pg_temp.id('replacement'))) x(u) cross join public.cities c;
insert into public.service_requests(id,customer_id,category_id,address_id,status) select pg_temp.id('request'),pg_temp.id('customer'),c.id,a.id,'diagnosing' from public.service_categories c cross join public.customer_addresses a where c.code='boiler' limit 1;
insert into public.service_quotes(id,service_request_id,version,status,currency,subtotal,service_fee,total_amount,offered_at) values(pg_temp.id('quote'),pg_temp.id('request'),1,'offered','TRY',1000,150,1150,now());
select public.accept_service_quote(pg_temp.id('quote'),pg_temp.id('customer'));
insert into public.service_distribution_cycles(service_request_id,quote_id,status,current_round) values(pg_temp.id('request'),pg_temp.id('quote'),'accepted',1);
insert into public.service_dispatches(id,service_request_id,quote_id,status,started_at,closed_at) values(pg_temp.id('dispatch'),pg_temp.id('request'),pg_temp.id('quote'),'accepted',now(),now());
insert into public.service_jobs(id,service_request_id,dispatch_id,accepted_quote_id,technician_id,status,assignment_source) values(pg_temp.id('job'),pg_temp.id('request'),pg_temp.id('dispatch'),pg_temp.id('quote'),pg_temp.id('technician'),'assigned','automatic');
insert into public.service_appointments(job_id,starts_at,status) values(pg_temp.id('job'),now()+interval '1 hour','scheduled');

-- Additional cost remains absent from effective price until both approvals.
select public.stage10_create_additional_cost(pg_temp.id('job'),pg_temp.id('technician'),200,'Test için gerekli ek işlem gerekçesi','cost-key-0001','[]');
select pg_temp.ok((public.stage10_operation_contract(pg_temp.id('request'),pg_temp.id('customer'))->>'effectiveTotal')::numeric=1150,'unapproved cost changed price');
select public.stage10_admin_review_additional_cost((select id from public.service_additional_cost_requests),pg_temp.id('admin'),true,'Teknik gerekçe uygun bulundu',1);
select public.stage10_customer_decide_additional_cost((select id from public.service_additional_cost_requests),pg_temp.id('customer'),true,2);
select pg_temp.ok((public.stage10_operation_contract(pg_temp.id('request'),pg_temp.id('customer'))->>'effectiveTotal')::numeric=1350,'accepted cost missing');
select public.stage10_create_additional_cost(pg_temp.id('job'),pg_temp.id('technician'),300,'İkinci ek maliyet için yeterli gerekçe','cost-key-0002','[]');
select public.stage10_admin_review_additional_cost((select id from public.service_additional_cost_requests where idempotency_key='cost-key-0002'),pg_temp.id('admin'),true,'İkinci teknik gerekçe uygun bulundu',1);
select public.stage10_customer_decide_additional_cost((select id from public.service_additional_cost_requests where idempotency_key='cost-key-0002'),pg_temp.id('customer'),true,2);
select pg_temp.ok((select final_total=1650 from public.service_additional_cost_requests where idempotency_key='cost-key-0002'),'second accepted cost is not cumulative');
select pg_temp.ok((public.stage10_operation_contract(pg_temp.id('request'),pg_temp.id('customer'))->>'effectiveTotal')::numeric=1650,'contract cumulative total is wrong');
select public.stage10_create_additional_cost(pg_temp.id('job'),pg_temp.id('technician'),40,'Geç onay kontrolü için ek maliyet','cost-key-late','[]');
select public.stage10_admin_review_additional_cost((select id from public.service_additional_cost_requests where idempotency_key='cost-key-late'),pg_temp.id('admin'),true,'Geç onay senaryosu inceleme sonucu',1);

-- Complaint concurrency/version gate and immutable resolution.
select public.stage10_create_complaint(pg_temp.id('request'),pg_temp.id('customer'),'En az yirmi karakterlik test şikâyeti','complaint-key-01','[]');
do $$ begin
  perform public.stage10_admin_decide_complaint((select id from public.service_complaints),pg_temp.id('admin'),'service_quality','warning','İlgisiz kullanıcıya yaptırım uygulanmamalıdır',pg_temp.id('unrelated'),null,1);
  raise exception 'FAILED: unrelated sanction subject accepted';
exception when others then if sqlerrm='FAILED: unrelated sanction subject accepted' then raise; end if; end $$;
select public.stage10_admin_decide_complaint((select id from public.service_complaints),pg_temp.id('admin'),'service_quality','restrict_new_operations','Kanıtlar incelendi ve yeni işlemler için kısıtlama gerekli',pg_temp.id('technician'),null,1);
select pg_temp.ok((select status='resolved' and retain_until>=now()+interval '4 years 364 days' from public.service_complaints),'complaint not resolved/retained');
select pg_temp.ok(public.stage10_has_new_operation_block(pg_temp.id('technician')),'active sanction did not block new operation');
select public.stage10_admin_correct_complaint_decision((select id from public.service_complaints),pg_temp.id('admin'),'Karar sonradan doğrulanan kayıt nedeniyle düzeltilmiştir',true);
select pg_temp.ok(not public.stage10_has_new_operation_block(pg_temp.id('technician')),'separate sanction correction did not revoke block');

-- Warranty uses explicit 30-day boiler policy and requires media evidence metadata.
update public.service_jobs set status='completed',completed_at=now() where id=pg_temp.id('job');
do $$ begin
  perform public.stage10_customer_decide_additional_cost((select id from public.service_additional_cost_requests where idempotency_key='cost-key-late'),pg_temp.id('customer'),true,2);
  raise exception 'FAILED: closed service accepted a late cost';
exception when others then if sqlerrm='FAILED: closed service accepted a late cost' then raise; end if; end $$;
select public.stage10_create_warranty_claim(pg_temp.id('request'),pg_temp.id('customer'),'En az yirmi karakterlik garanti açıklaması','warranty-key-01',jsonb_build_array(jsonb_build_object('kind','photo','size',100,'path','stage10/'||pg_temp.id('customer')::text||'/warranty/test.jpg','mime','image/jpeg','name','test.jpg')));
select pg_temp.ok((select warranty_days=30 from public.service_warranty_claims),'boiler warranty is not 30 days');
select public.stage10_admin_decide_warranty((select id from public.service_warranty_claims),pg_temp.id('admin'),true,'Ücretsiz düzeltme yapılacaktır','Kanıt ve hizmet ilişkisi doğrulandı',1);
select public.stage10_admin_assign_warranty_correction((select id from public.service_warranty_claims),pg_temp.id('admin'),pg_temp.id('technician'),2);
select pg_temp.ok((select customer_charge=0 from public.warranty_correction_assignments),'warranty charged customer');

-- KPI and operation contract are factual and role-gated.
select pg_temp.ok(public.stage10_admin_kpi(pg_temp.id('admin'),'monthly',current_date)->'general'->>'ratingsAvailable'='false','ratings availability invented');
select pg_temp.ok(public.stage10_operation_contract(pg_temp.id('request'),pg_temp.id('customer'))->>'stage'='completed','operation contract disagrees');
rollback;
