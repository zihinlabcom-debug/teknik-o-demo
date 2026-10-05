-- Disposable local DB only. Exercises the forward-only onboarding RPC.
begin;

create temp table onboarding_ids(kind text primary key,id uuid not null);
insert into onboarding_ids values
  ('new',gen_random_uuid()),('bad_category',gen_random_uuid()),
  ('bad_district',gen_random_uuid()),('bad_city',gen_random_uuid()),
  ('category',gen_random_uuid()),('inactive_category',gen_random_uuid());

insert into auth.users(id,phone,phone_confirmed_at,created_at)
select id,case kind when 'new' then '+905000000701'
  when 'bad_category' then '+905000000702' when 'bad_district' then '+905000000703'
  else '+905000000704' end,now(),now()
from onboarding_ids where kind in ('new','bad_category','bad_district','bad_city');
insert into public.users(id,name,role,phone,is_test,is_active)
select id,'TEST Başvuru','customer',case kind when 'new' then '+905000000701'
  when 'bad_category' then '+905000000702' when 'bad_district' then '+905000000703'
  else '+905000000704' end,true,true
from onboarding_ids where kind in ('new','bad_category','bad_district','bad_city');

insert into public.service_categories(id,code,name,is_active)
select id,'stage4_onboarding_fixture','TEST Hizmet',true from onboarding_ids where kind='category';
insert into public.service_categories(id,code,name,is_active)
select id,'stage4_onboarding_inactive','TEST Pasif Hizmet',false from onboarding_ids where kind='inactive_category';
insert into public.cities(name,is_active) values('TEST Onboarding Şehri',true);
insert into public.cities(name,is_active) values('TEST Farklı Şehir',true);
insert into public.districts(city_id,name,is_active)
select id,'TEST İlçe',true from public.cities where name='TEST Onboarding Şehri';
insert into public.districts(city_id,name,is_active)
select id,'TEST Farklı İlçe',true from public.cities where name='TEST Farklı Şehir';

do $$
declare
  v_new uuid:=(select id from onboarding_ids where kind='new');
  v_bad_category uuid:=(select id from onboarding_ids where kind='bad_category');
  v_bad_district uuid:=(select id from onboarding_ids where kind='bad_district');
  v_bad_city uuid:=(select id from onboarding_ids where kind='bad_city');
  v_category uuid:=(select id from onboarding_ids where kind='category');
  v_inactive uuid:=(select id from onboarding_ids where kind='inactive_category');
  v_city bigint:=(select id from public.cities where name='TEST Onboarding Şehri');
  v_district bigint:=(select id from public.districts where name='TEST İlçe');
  v_other bigint:=(select id from public.districts where name='TEST Farklı İlçe');
  v_failed boolean;
begin
  if not public.complete_technician_registration(v_new,'+905000000701','TEST Usta',null,
    array[v_category,v_category],v_city,array[v_district,v_district]) then
    raise exception 'Fresh signup must complete';
  end if;
  if (select role from public.users where id=v_new)<>'technician'
    or (select approval_status from public.technician_profiles where user_id=v_new)<>'pending'
    or (select is_available from public.technician_profiles where user_id=v_new)
    or (select count(*) from public.technician_service_categories where technician_id=v_new)<>1
    or (select count(*) from public.technician_service_areas where technician_id=v_new)<>1 then
    raise exception 'Signup did not create the canonical profile/selections';
  end if;
  if public.complete_technician_registration(v_new,'+905000000701','TEST Usta',null,
    array[v_category],v_city,array[v_district]) then
    raise exception 'Retry must be idempotent';
  end if;

  v_failed:=false;
  begin
    perform public.complete_technician_registration(v_bad_category,'+905000000702','TEST Usta',null,
      array[v_inactive],v_city,array[v_district]);
  exception when others then v_failed:=true; end;
  if not v_failed or (select role from public.users where id=v_bad_category)<>'customer'
    or exists(select 1 from public.technician_profiles where user_id=v_bad_category) then
    raise exception 'Invalid category must roll back the entire conversion';
  end if;

  v_failed:=false;
  begin
    perform public.complete_technician_registration(v_bad_district,'+905000000703','TEST Usta',null,
      array[v_category],v_city,array[v_other]);
  exception when others then v_failed:=true; end;
  if not v_failed or (select role from public.users where id=v_bad_district)<>'customer'
    or exists(select 1 from public.technician_profiles where user_id=v_bad_district) then
    raise exception 'District/city mismatch must roll back';
  end if;

  v_failed:=false;
  begin
    perform public.complete_technician_registration(v_bad_city,'+905000000704','TEST Usta',null,
      array[v_category],-1,array[v_district]);
  exception when others then v_failed:=true; end;
  if not v_failed or (select role from public.users where id=v_bad_city)<>'customer'
    or exists(select 1 from public.technician_profiles where user_id=v_bad_city) then
    raise exception 'Invalid city must roll back';
  end if;

  if has_function_privilege('anon','public.complete_technician_registration(uuid,text,text,text,uuid[],bigint,bigint[])','EXECUTE')
    or has_function_privilege('authenticated','public.complete_technician_registration(uuid,text,text,text,uuid[],bigint,bigint[])','EXECUTE')
    or not has_function_privilege('service_role','public.complete_technician_registration(uuid,text,text,text,uuid[],bigint,bigint[])','EXECUTE')
    or has_column_privilege('authenticated','public.users','role','UPDATE') then
    raise exception 'Provisioning privilege boundary broken';
  end if;
  v_failed:=false;
  begin perform public.set_technician_availability(v_new,true);
  exception when others then v_failed:=true; end;
  if not v_failed then raise exception 'Pending technician became available'; end if;
end $$;

rollback;
