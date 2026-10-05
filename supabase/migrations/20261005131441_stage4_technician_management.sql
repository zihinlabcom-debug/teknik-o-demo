-- Stage 4 technician management. No storage bucket or dispatch selection is added.
begin;

do $$ begin
  if to_regclass('public.users') is null or to_regclass('public.technician_profiles') is null
    or to_regclass('public.technician_service_categories') is null
    or to_regclass('public.technician_service_areas') is null
    or to_regclass('public.operational_events') is null then
    raise exception 'Stage 4 prerequisites missing';
  end if;
  if exists (select 1 from public.technician_profiles p join public.users u on u.id=p.user_id
             where u.role<>'technician') then
    raise exception 'Existing non-technician profile requires review';
  end if;
end $$;

update public.technician_profiles set approval_status='pending' where approval_status is null;
update public.technician_profiles set is_available=false where is_available is null;
alter table public.technician_profiles alter column approval_status set not null;
alter table public.technician_profiles alter column is_available set not null;

-- A role transition to technician provisions exactly one profile. Demotion must
-- be reviewed explicitly rather than silently deleting assignments/documents.
create or replace function public.stage4_guard_technician_role() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.role='technician' and new.role<>'technician'
     and exists(select 1 from public.technician_profiles where user_id=old.id) then
    raise exception 'Technician profile must be reviewed before role change';
  end if;
  return new;
end $$;
revoke all on function public.stage4_guard_technician_role() from public,anon,authenticated;
drop trigger if exists stage4_guard_technician_role on public.users;
create trigger stage4_guard_technician_role before update of role on public.users
for each row execute function public.stage4_guard_technician_role();

create or replace function public.stage4_ensure_technician_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.role='technician' then
    insert into public.technician_profiles(user_id,approval_status,is_available)
    values(new.id,'pending',false) on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
revoke all on function public.stage4_ensure_technician_profile() from public,anon,authenticated;
drop trigger if exists stage4_ensure_technician_profile on public.users;
create trigger stage4_ensure_technician_profile after insert or update of role on public.users
for each row execute function public.stage4_ensure_technician_profile();

create or replace function public.stage4_guard_profile_owner() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.users where id=new.user_id and role='technician') then
    raise exception 'Technician profile requires technician role';
  end if;
  return new;
end $$;
revoke all on function public.stage4_guard_profile_owner() from public,anon,authenticated;
drop trigger if exists stage4_guard_profile_owner on public.technician_profiles;
create trigger stage4_guard_profile_owner before insert or update of user_id
on public.technician_profiles for each row execute function public.stage4_guard_profile_owner();

insert into public.technician_profiles(user_id,approval_status,is_available)
select id,'pending',false from public.users where role='technician'
on conflict (user_id) do nothing;

-- Metadata only: file upload/storage and document collection are Stage 10.
create table if not exists public.technician_documents (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.technician_profiles(user_id) on delete restrict,
  document_type text not null check (document_type ~ '^[a-z][a-z0-9_]{1,39}$'),
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  storage_path text,
  original_file_name text,
  mime_type text,
  verified_at timestamptz,
  verified_by uuid references public.users(id) on delete restrict,
  rejection_reason text check (rejection_reason is null or length(rejection_reason)<=500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint technician_documents_verification_check check
    ((status='verified' and verified_at is not null and verified_by is not null)
     or (status<>'verified' and verified_at is null))
);
create index if not exists technician_documents_technician_idx
  on public.technician_documents(technician_id,created_at desc);
drop trigger if exists technician_documents_set_updated_at on public.technician_documents;
create trigger technician_documents_set_updated_at before update on public.technician_documents
for each row execute function public.set_updated_at();
alter table public.technician_documents enable row level security;
revoke all on public.technician_documents from public,anon,authenticated;
grant select on public.technician_documents to authenticated;
drop policy if exists technician_documents_read on public.technician_documents;
create policy technician_documents_read on public.technician_documents for select to authenticated
using (technician_id=(select auth.uid()) or (select public.is_app_admin()));

-- All app mutations go through server-only service_role RPCs so the state change
-- and its operational event commit together. Browser roles retain read-only ACLs.
revoke update on public.technician_profiles from authenticated;
revoke update (is_available) on public.technician_profiles from authenticated;
drop policy if exists technician_profiles_update_self on public.technician_profiles;
grant select on public.users,public.technician_profiles,public.technician_service_categories,
  public.technician_service_areas,public.service_categories,public.cities,public.districts,
  public.technician_documents to service_role;

create or replace function public.admin_change_technician(
  p_actor_id uuid,p_technician_id uuid,p_action text,p_value text default null,
  p_category_id uuid default null,p_city_id bigint default null,
  p_district_id bigint default null,p_document_id uuid default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_old text;
  v_target text;
  v_event text;
  v_payload jsonb:='{}'::jsonb;
  v_rows integer;
begin
  if not exists(select 1 from public.users where id=p_actor_id and role='admin' and is_active) then
    raise exception 'Active admin required';
  end if;
  if not exists(select 1 from public.users u join public.technician_profiles t on t.user_id=u.id
                where u.id=p_technician_id and u.role='technician') then
    raise exception 'Technician profile not found';
  end if;

  if p_action in ('approve','reject','suspend','pending') then
    select approval_status into v_old from public.technician_profiles
      where user_id=p_technician_id for update;
    if not found then raise exception 'Technician profile not found'; end if;
    v_target:=case p_action when 'approve' then 'approved'
      when 'reject' then 'rejected' when 'suspend' then 'suspended' else 'pending' end;
    if v_old=v_target then return false; end if;
    update public.technician_profiles
      set approval_status=v_target,
        is_available=case when p_action='approve' then is_available else false end
      where user_id=p_technician_id;
    v_event:='technician.'||case p_action when 'approve' then 'approved'
      when 'reject' then 'rejected' when 'suspend' then 'suspended' else 'pending' end;
    v_payload:=jsonb_build_object('from',v_old,'to',v_target);
  elsif p_action in ('activate','deactivate') then
    select is_active::text into v_old from public.users where id=p_technician_id for update;
    if not found then raise exception 'Technician user not found'; end if;
    if v_old=(p_action='activate')::text then return false; end if;
    update public.users set is_active=(p_action='activate') where id=p_technician_id;
    if p_action='deactivate' then
      update public.technician_profiles set is_available=false where user_id=p_technician_id;
    end if;
    v_event:='technician.'||case p_action when 'activate' then 'activated' else 'deactivated' end;
    v_payload:=jsonb_build_object('from',v_old,'to',p_action='activate');
  elsif p_action in ('category_add','category_remove') then
    if p_category_id is null then raise exception 'Category required'; end if;
    if p_action='category_add' then
      if not exists(select 1 from public.service_categories where id=p_category_id and is_active) then
        raise exception 'Active category required';
      end if;
      insert into public.technician_service_categories(technician_id,category_id)
      values(p_technician_id,p_category_id) on conflict do nothing;
    else
      delete from public.technician_service_categories
      where technician_id=p_technician_id and category_id=p_category_id;
    end if;
    get diagnostics v_rows=row_count;
    if v_rows=0 then return false; end if;
    v_event:='technician.'||case p_action when 'category_add' then 'category_added' else 'category_removed' end;
    v_payload:=jsonb_build_object('category_id',p_category_id);
  elsif p_action in ('area_add','area_remove') then
    if p_city_id is null then raise exception 'City required'; end if;
    if p_action='area_add' then
      if not exists(select 1 from public.cities where id=p_city_id and is_active) then
        raise exception 'Active city required';
      end if;
      if p_district_id is not null and not exists(
        select 1 from public.districts where id=p_district_id and city_id=p_city_id and is_active) then
        raise exception 'Active district in selected city required';
      end if;
      insert into public.technician_service_areas(technician_id,city_id,district_id)
      values(p_technician_id,p_city_id,p_district_id) on conflict do nothing;
    else
      delete from public.technician_service_areas where technician_id=p_technician_id
        and city_id=p_city_id and district_id is not distinct from p_district_id;
    end if;
    get diagnostics v_rows=row_count;
    if v_rows=0 then return false; end if;
    v_event:='technician.'||case p_action when 'area_add' then 'area_added' else 'area_removed' end;
    v_payload:=jsonb_build_object('city_id',p_city_id,'district_id',p_district_id);
  elsif p_action in ('document_verify','document_reject') then
    if p_document_id is null then raise exception 'Document required'; end if;
    select status into v_old from public.technician_documents
    where id=p_document_id and technician_id=p_technician_id for update;
    if not found then raise exception 'Technician document not found'; end if;
    if v_old=(case p_action when 'document_verify' then 'verified' else 'rejected' end) then
      return false;
    end if;
    update public.technician_documents
      set status=case p_action when 'document_verify' then 'verified' else 'rejected' end,
        verified_at=case when p_action='document_verify' then now() else null end,
        verified_by=case when p_action='document_verify' then p_actor_id else null end,
        rejection_reason=null
      where id=p_document_id;
    v_event:='technician.'||case p_action when 'document_verify' then 'document_verified'
      else 'document_rejected' end;
    v_payload:=jsonb_build_object('document_id',p_document_id,'from',v_old);
  else
    raise exception 'Invalid technician action';
  end if;

  insert into public.operational_events(actor_user_id,event_type,entity_type,entity_id,payload)
  values(p_actor_id,v_event,'technician',p_technician_id,v_payload);
  return true;
end $$;
revoke all on function public.admin_change_technician(uuid,uuid,text,text,uuid,bigint,bigint,uuid)
from public,anon,authenticated;
grant execute on function public.admin_change_technician(uuid,uuid,text,text,uuid,bigint,bigint,uuid)
to service_role;

create or replace function public.set_technician_availability(
  p_actor_id uuid,p_is_available boolean
) returns boolean language plpgsql security definer set search_path='' as $$
declare v_old boolean;
begin
  if p_is_available is null then raise exception 'Availability required'; end if;
  select t.is_available into v_old from public.technician_profiles t
    join public.users u on u.id=t.user_id
    where t.user_id=p_actor_id and u.role='technician' and u.is_active
      and t.approval_status='approved' for update of t;
  if not found then raise exception 'Approved active technician required'; end if;
  if v_old=p_is_available then return false; end if;
  update public.technician_profiles set is_available=p_is_available where user_id=p_actor_id;
  insert into public.operational_events(actor_user_id,event_type,entity_type,entity_id,payload)
  values(p_actor_id,'technician.availability_changed','technician',p_actor_id,
    jsonb_build_object('from',v_old,'to',p_is_available));
  return true;
end $$;
revoke all on function public.set_technician_availability(uuid,boolean)
from public,anon,authenticated;
grant execute on function public.set_technician_availability(uuid,boolean) to service_role;

commit;
