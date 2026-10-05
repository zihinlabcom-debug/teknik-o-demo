-- Disposable local database only. All test rows roll back.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() not in ('tekniko_stage4_final_test','tekniko_stage4_final_test_v2','tekniko_stage4_final_test_v3') then
    raise exception 'Refusing Stage 4 final test outside disposable local database';
  end if;
end $$;
-- The compact operation-core fixture omits core users RLS grants/policies.
grant select on public.users to authenticated;
create policy stage4_final_users_read on public.users for select to authenticated
  using (id=(select auth.uid()) or (select public.is_app_admin()));

create temporary table final_ids(k text primary key,v uuid not null) on commit drop;
insert into final_ids values ('admin',gen_random_uuid()),('tech',gen_random_uuid()),
  ('other',gen_random_uuid()),('customer',gen_random_uuid());
grant select on final_ids to service_role;
grant select on final_ids to authenticated;
create function pg_temp.fid(k text) returns uuid language sql stable as $$
  select v from pg_temp.final_ids where final_ids.k=$1
$$;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;

insert into auth.users(id) select v from final_ids;
insert into public.users(id,name,role,is_active) values
  (pg_temp.fid('admin'),'STAGE 4 FINAL ADMIN','admin',true),
  (pg_temp.fid('tech'),'STAGE 4 FINAL TECH','technician',true),
  (pg_temp.fid('other'),'STAGE 4 FINAL OTHER TECH','technician',true),
  (pg_temp.fid('customer'),'STAGE 4 FINAL CUSTOMER','customer',true);
insert into public.technician_profiles(user_id,approval_status,is_available)
  select v,'pending',false from final_ids where k in ('tech','other') on conflict do nothing;

select pg_temp.ok((select requires_document from public.service_categories where code='boiler'),
  'boiler requires document');
select pg_temp.ok((select not requires_document from public.service_categories where code='painting'),
  'painting does not require document');
select pg_temp.ok((select count(*) from public.technician_service_categories
  where approval_status='approved')=(select count(*) from public.technician_service_categories a
  join public.technician_profiles p on p.user_id=a.technician_id
  where p.approval_status='approved') and
  (select count(*) from public.technician_service_categories where approval_status='approved')>0,
  'pre-existing approved category links preserved');

insert into public.technician_service_categories(technician_id,category_id)
  select pg_temp.fid('tech'),id from public.service_categories where code in ('boiler','painting');
select pg_temp.ok((select approval_status='pending_document' from public.technician_service_categories a
  join public.service_categories c on c.id=a.category_id
  where a.technician_id=pg_temp.fid('tech') and c.code='boiler'), 'required category starts pending_document');
select pg_temp.ok((select approval_status='pending' from public.technician_service_categories a
  join public.service_categories c on c.id=a.category_id
  where a.technician_id=pg_temp.fid('tech') and c.code='painting'), 'optional category starts pending');

do $$ declare blocked boolean:=false; begin
  begin perform public.admin_change_technician_category(pg_temp.fid('customer'),pg_temp.fid('tech'),
    (select id from public.service_categories where code='painting'),'approve');
  exception when others then blocked:=true; end;
  perform pg_temp.ok(blocked,'customer cannot approve category');
end $$;
set role service_role;
select pg_temp.ok(public.admin_change_technician_category(pg_temp.fid('admin'),pg_temp.fid('tech'),
  (select id from public.service_categories where code='painting'),'approve'), 'painting approved without document');
reset role;
do $$ declare blocked boolean:=false; begin
  begin perform public.admin_change_technician_category(pg_temp.fid('admin'),pg_temp.fid('tech'),
    (select id from public.service_categories where code='boiler'),'approve');
  exception when others then blocked:=true; end;
  perform pg_temp.ok(blocked,'boiler approval blocked without verified document');
end $$;

insert into public.technician_documents(technician_id,category_id,document_type,status,
  storage_path,original_file_name,mime_type)
select pg_temp.fid('tech'),id,'qualification','pending',
  'technician/'||pg_temp.fid('tech')::text||'/proof.pdf','proof.pdf','application/pdf'
  from public.service_categories where code='boiler';
create temporary table final_doc as select id from public.technician_documents
  where technician_id=pg_temp.fid('tech');
grant select on final_doc to service_role;
select pg_temp.ok((select approval_status='pending_document' from public.technician_service_categories a
  join public.service_categories c on c.id=a.category_id
  where a.technician_id=pg_temp.fid('tech') and c.code='boiler'), 'upload never auto-approves');
set role service_role;
select pg_temp.ok(public.admin_change_technician(pg_temp.fid('admin'),pg_temp.fid('tech'),
  'document_verify',p_document_id=>(select id from pg_temp.final_doc)), 'admin verifies document');
select pg_temp.ok(public.admin_change_technician_category(pg_temp.fid('admin'),pg_temp.fid('tech'),
  (select id from public.service_categories where code='boiler'),'approve'), 'boiler approved after verification');
select pg_temp.ok(public.admin_change_technician(pg_temp.fid('admin'),pg_temp.fid('tech'),'approve'),
  'general account approved independently');
reset role;
select pg_temp.ok((select count(*)=2 from public.technician_service_categories
  where technician_id=pg_temp.fid('tech') and approval_status='approved'),
  'category approvals independent');
set role service_role;
select pg_temp.ok(public.admin_change_technician(pg_temp.fid('admin'),pg_temp.fid('tech'),
  'document_reject',p_document_id=>(select id from pg_temp.final_doc)),
  'admin rejects formerly verified document');
reset role;
select pg_temp.ok((select approval_status='pending_document' from public.technician_service_categories a
  join public.service_categories c on c.id=a.category_id
  where a.technician_id=pg_temp.fid('tech') and c.code='boiler'),
  'rejected verified document revokes boiler approval');
select pg_temp.ok((select approval_status='approved' from public.technician_service_categories a
  join public.service_categories c on c.id=a.category_id
  where a.technician_id=pg_temp.fid('tech') and c.code='painting'),
  'painting approval unaffected');
select pg_temp.ok((select count(*)=1 from public.technician_service_categories a
  join public.technician_profiles p on p.user_id=a.technician_id
  join public.users u on u.id=a.technician_id
  where a.technician_id=pg_temp.fid('tech') and a.approval_status='approved'
    and p.approval_status='approved' and u.is_active),
  'future eligibility query sees only the approved category');

select pg_temp.ok((select not public from storage.buckets where id='technician-documents'),
  'private document bucket');
do $$ declare blocked boolean:=false; begin
  set role authenticated;
  begin insert into storage.objects(bucket_id,name) values('technician-documents',
    'technician/'||pg_temp.fid('tech')::text||'/unauthorized.pdf');
  exception when others then blocked:=true; end;
  reset role;
  perform pg_temp.ok(blocked,'authenticated cannot directly upload despite a broad policy');
end $$;
insert into storage.objects(bucket_id,name) values('technician-documents',
  'technician/'||pg_temp.fid('tech')::text||'/proof.pdf');
set role anon;
select pg_temp.ok((select count(*)=0 from storage.objects where bucket_id='technician-documents'),
  'anon cannot read private document despite a broad policy');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.fid('tech')::text,true);
select pg_temp.ok((select count(*)=1 from storage.objects where bucket_id='technician-documents'),
  'owner reads private document');
select set_config('request.jwt.claim.sub',pg_temp.fid('other')::text,true);
select pg_temp.ok((select count(*)=0 from storage.objects where bucket_id='technician-documents'),
  'other technician cannot read document');
select set_config('request.jwt.claim.sub',pg_temp.fid('customer')::text,true);
select pg_temp.ok((select count(*)=0 from storage.objects where bucket_id='technician-documents'),
  'customer cannot read document');
select set_config('request.jwt.claim.sub',pg_temp.fid('admin')::text,true);
select pg_temp.ok((select count(*)=1 from storage.objects where bucket_id='technician-documents'),
  'admin reads private document');
reset role;

select pg_temp.ok(not has_function_privilege('anon',
  'public.admin_login_rate_limit(text,text)','EXECUTE') and
  not has_function_privilege('authenticated','public.admin_login_rate_limit(text,text)','EXECUTE'),
  'rate limiter server only');
set role service_role;
select pg_temp.ok(public.admin_login_rate_limit(repeat('a',64),'check'),
  'fresh admin login not blocked');
select public.admin_login_rate_limit(repeat('a',64),'failure') from generate_series(1,5);
select pg_temp.ok(not public.admin_login_rate_limit(repeat('a',64),'check'),
  'five failures lock the source');
reset role;
rollback;
