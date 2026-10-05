-- Stage 4 final product corrections. Forward-only; no existing migration is rewritten.
begin;

alter table public.technician_profiles
  add column address_city_id bigint references public.cities(id) on delete restrict,
  add column address_district_id bigint,
  add column address_line text,
  add constraint technician_address_district_city_fk foreign key (address_district_id,address_city_id)
    references public.districts(id,city_id),
  add constraint technician_address_line_length_check check
    (address_line is null or length(btrim(address_line)) between 10 and 500),
  add constraint technician_address_complete_check check
    ((address_city_id is null and address_district_id is null and address_line is null) or
     (address_city_id is not null and address_district_id is not null and address_line is not null));

alter table public.service_categories
  add column requires_document boolean not null default false;
-- The actual seeded category code is `boiler` in core_schema.sql.
update public.service_categories set requires_document=true where code='boiler';

alter table public.technician_service_categories
  add column approval_status text not null default 'pending',
  add constraint technician_category_approval_check check
    (approval_status in ('pending','pending_document','approved','rejected'));

-- Preserve the previously approved technicians' existing category permissions.
update public.technician_service_categories a set approval_status=case
  when p.approval_status='approved' then 'approved'
  when c.requires_document then 'pending_document'
  else 'pending' end
from public.technician_profiles p,public.service_categories c
where p.user_id=a.technician_id and c.id=a.category_id;

create or replace function public.stage4_new_category_status() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if (select requires_document from public.service_categories where id=new.category_id) then
    new.approval_status:='pending_document';
  else
    new.approval_status:='pending';
  end if;
  return new;
end $$;
revoke all on function public.stage4_new_category_status() from public,anon,authenticated;
create trigger stage4_new_category_status before insert on public.technician_service_categories
for each row execute function public.stage4_new_category_status();

alter table public.technician_documents
  add column category_id uuid,
  add constraint technician_document_category_fk foreign key (technician_id,category_id)
    references public.technician_service_categories(technician_id,category_id) on delete restrict,
  add constraint technician_document_storage_path_check check
    (storage_path is null or storage_path like 'technician/'||technician_id::text||'/%');
create unique index technician_documents_storage_path_unique
  on public.technician_documents(storage_path) where storage_path is not null;
create index technician_documents_category_idx
  on public.technician_documents(technician_id,category_id,status);
grant insert on public.technician_documents to service_role;
grant update (requires_document) on public.service_categories to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('technician-documents','technician-documents',false,5242880,
  array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy technician_document_private_read on storage.objects for select to authenticated
using (bucket_id='technician-documents' and
  (exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='technician'
    and u.is_active and storage.objects.name like 'technician/'||u.id::text||'/%') or
   (select public.is_app_admin())));
-- Restrictive guards prevent any pre-existing broad Storage policy from
-- exposing or mutating this bucket. Uploads use a role-checked server route.
create policy technician_document_anon_read_guard on storage.objects as restrictive
  for select to anon using (bucket_id<>'technician-documents');
create policy technician_document_authenticated_read_guard on storage.objects as restrictive
  for select to authenticated using (bucket_id<>'technician-documents' or
    exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='technician'
      and u.is_active and storage.objects.name like 'technician/'||u.id::text||'/%') or
    (select public.is_app_admin()));
create policy technician_document_insert_guard on storage.objects as restrictive
  for insert to anon,authenticated with check (bucket_id<>'technician-documents');
create policy technician_document_update_guard on storage.objects as restrictive
  for update to anon,authenticated using (bucket_id<>'technician-documents')
  with check (bucket_id<>'technician-documents');
create policy technician_document_delete_guard on storage.objects as restrictive
  for delete to anon,authenticated using (bucket_id<>'technician-documents');

-- Replace the onboarding RPC with an address-aware signature. The old RPC loses
-- service_role EXECUTE, so new signups cannot omit the address.
create or replace function public.complete_technician_registration(
  p_user_id uuid,p_phone text,p_name text,p_email text,
  p_category_ids uuid[],p_city_id bigint,p_district_ids bigint[],
  p_address_city_id bigint,p_address_district_id bigint,p_address_line text
) returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_user public.users%rowtype;
  v_auth_phone text;
  v_confirmed_at timestamptz;
  v_created_at timestamptz;
  v_categories uuid[];
  v_districts bigint[];
begin
  if p_user_id is null or p_phone is null or p_phone !~ '^\+905[0-9]{9}$'
     or p_name is null or length(trim(p_name))<2 or length(trim(p_name))>200
     or (p_email is not null and (length(p_email)>320 or p_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'))
     or p_city_id is null or p_address_city_id is null or p_address_district_id is null
     or p_address_line is null or length(btrim(p_address_line)) not between 10 and 500 then
    raise exception 'Invalid technician registration';
  end if;
  select array_agg(distinct x order by x) into v_categories from unnest(p_category_ids) as x;
  select array_agg(distinct x order by x) into v_districts from unnest(p_district_ids) as x;
  if v_categories is null or v_districts is null or
     cardinality(v_categories)>30 or cardinality(v_districts)>100 or
     array_position(v_categories,null) is not null or array_position(v_districts,null) is not null then
    raise exception 'Category and district selections required';
  end if;
  select phone,phone_confirmed_at,created_at into v_auth_phone,v_confirmed_at,v_created_at
    from auth.users where id=p_user_id for update;
  if not found or v_auth_phone is null or
     regexp_replace(v_auth_phone,'[^0-9]','','g') <> regexp_replace(p_phone,'[^0-9]','','g') or
     v_confirmed_at is null or v_created_at < now()-interval '15 minutes' then
    raise exception 'Fresh verified phone account required';
  end if;
  select * into v_user from public.users where id=p_user_id for update;
  if not found or regexp_replace(coalesce(v_user.phone,''),'[^0-9]','','g') <>
     regexp_replace(p_phone,'[^0-9]','','g') or not v_user.is_active then
    raise exception 'Account mismatch';
  end if;
  if v_user.role='technician' then return false; end if;
  if v_user.role<>'customer' or exists(select 1 from public.customer_profiles where user_id=p_user_id)
     or exists(select 1 from public.service_requests where customer_id=p_user_id)
     or exists(select 1 from public.technician_profiles where user_id=p_user_id) then
    raise exception 'Existing account cannot be converted';
  end if;
  if (select count(*) from public.service_categories where id=any(v_categories) and is_active)<>
      cardinality(v_categories) or
     not exists(select 1 from public.cities where id=p_city_id and is_active) or
     (select count(*) from public.districts where id=any(v_districts)
       and city_id=p_city_id and is_active)<>cardinality(v_districts) or
     not exists(select 1 from public.cities where id=p_address_city_id and is_active) or
     not exists(select 1 from public.districts where id=p_address_district_id
       and city_id=p_address_city_id and is_active) then
    raise exception 'Inactive or mismatched selection';
  end if;
  update public.users set name=trim(p_name),email=nullif(trim(coalesce(p_email,'')),''),
    role='technician' where id=p_user_id;
  update public.technician_profiles set address_city_id=p_address_city_id,
    address_district_id=p_address_district_id,address_line=btrim(p_address_line)
    where user_id=p_user_id;
  insert into public.technician_service_categories(technician_id,category_id)
    select p_user_id,unnest(v_categories) on conflict do nothing;
  insert into public.technician_service_areas(technician_id,city_id,district_id)
    select p_user_id,p_city_id,unnest(v_districts) on conflict do nothing;
  return true;
end $$;
revoke all on function public.complete_technician_registration(
  uuid,text,text,text,uuid[],bigint,bigint[]) from public,anon,authenticated,service_role;
revoke all on function public.complete_technician_registration(
  uuid,text,text,text,uuid[],bigint,bigint[],bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_technician_registration(
  uuid,text,text,text,uuid[],bigint,bigint[],bigint,bigint,text) to service_role;

create or replace function public.admin_change_technician_category(
  p_actor_id uuid,p_technician_id uuid,p_category_id uuid,p_action text
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_old text;v_target text;v_requires boolean;
begin
  if not exists(select 1 from public.users where id=p_actor_id and role='admin' and is_active) then
    raise exception 'Active admin required';
  end if;
  if p_action not in ('approve','reject') then raise exception 'Invalid category action'; end if;
  select a.approval_status,c.requires_document into v_old,v_requires
    from public.technician_service_categories a join public.service_categories c on c.id=a.category_id
    where a.technician_id=p_technician_id and a.category_id=p_category_id for update of a;
  if not found then raise exception 'Technician category not found'; end if;
  v_target:=case p_action when 'approve' then 'approved' else 'rejected' end;
  if v_old=v_target then return false; end if;
  if p_action='approve' and v_requires and not exists(
    select 1 from public.technician_documents d where d.technician_id=p_technician_id
      and d.category_id=p_category_id and d.status='verified' and d.storage_path is not null) then
    raise exception 'Verified category document required';
  end if;
  update public.technician_service_categories set approval_status=v_target
    where technician_id=p_technician_id and category_id=p_category_id;
  insert into public.operational_events(actor_user_id,event_type,entity_type,entity_id,payload)
    values(p_actor_id,'technician.category_'||v_target,'technician',p_technician_id,
      jsonb_build_object('category_id',p_category_id,'from',v_old,'to',v_target));
  return true;
end $$;
revoke all on function public.admin_change_technician_category(uuid,uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.admin_change_technician_category(uuid,uuid,uuid,text)
  to service_role;

create or replace function public.stage4_recheck_document_approval() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.status='verified' and new.status<>'verified' and old.category_id is not null
     and (select requires_document from public.service_categories where id=old.category_id)
     and not exists(select 1 from public.technician_documents d
       where d.technician_id=old.technician_id and d.category_id=old.category_id
         and d.id<>old.id and d.status='verified' and d.storage_path is not null) then
    update public.technician_service_categories set approval_status='pending_document'
      where technician_id=old.technician_id and category_id=old.category_id
        and approval_status='approved';
  end if;
  return new;
end $$;
revoke all on function public.stage4_recheck_document_approval() from public,anon,authenticated;
create trigger stage4_recheck_document_approval after update of status on public.technician_documents
for each row execute function public.stage4_recheck_document_approval();

create or replace function public.stage4_recheck_category_requirement() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.requires_document and not old.requires_document then
    update public.technician_service_categories a set approval_status='pending_document'
      where a.category_id=new.id and a.approval_status in ('pending','approved')
        and not exists(select 1 from public.technician_documents d
          where d.technician_id=a.technician_id and d.category_id=new.id
            and d.status='verified' and d.storage_path is not null);
  elsif old.requires_document and not new.requires_document then
    update public.technician_service_categories set approval_status='pending'
      where category_id=new.id and approval_status='pending_document';
  end if;
  return new;
end $$;
revoke all on function public.stage4_recheck_category_requirement() from public,anon,authenticated;
create trigger stage4_recheck_category_requirement after update of requires_document
  on public.service_categories for each row execute function public.stage4_recheck_category_requirement();

-- Shared-password login attempts are counted in the database so rate limits
-- survive serverless instance changes. The key is a server-side HMAC of IP.
create table public.admin_login_limits (
  fingerprint text primary key check (fingerprint ~ '^[a-f0-9]{64}$'),
  failures integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.admin_login_limits enable row level security;
revoke all on public.admin_login_limits from public,anon,authenticated;
create or replace function public.admin_login_rate_limit(p_fingerprint text,p_action text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_row public.admin_login_limits%rowtype;
begin
  if p_fingerprint !~ '^[a-f0-9]{64}$' or p_action not in ('check','failure','success') then
    raise exception 'Invalid rate limit request';
  end if;
  insert into public.admin_login_limits(fingerprint) values(p_fingerprint)
    on conflict (fingerprint) do nothing;
  select * into v_row from public.admin_login_limits where fingerprint=p_fingerprint for update;
  if p_action='check' then return v_row.locked_until is null or v_row.locked_until<=now(); end if;
  if p_action='success' then
    update public.admin_login_limits set failures=0,window_started_at=now(),locked_until=null
      where fingerprint=p_fingerprint;
    return true;
  end if;
  if v_row.window_started_at<now()-interval '15 minutes' then
    update public.admin_login_limits set failures=1,window_started_at=now(),locked_until=null
      where fingerprint=p_fingerprint;
  else
    update public.admin_login_limits set failures=v_row.failures+1,
      locked_until=case when v_row.failures+1>=5 then now()+interval '15 minutes'
        else v_row.locked_until end where fingerprint=p_fingerprint;
  end if;
  return false;
end $$;
revoke all on function public.admin_login_rate_limit(text,text) from public,anon,authenticated;
grant execute on function public.admin_login_rate_limit(text,text) to service_role;

commit;
