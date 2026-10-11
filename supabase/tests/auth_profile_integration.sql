-- Disposable PostgreSQL integration test for customer/technician auth profile migration.
\set ON_ERROR_STOP on
do $$ begin
  if current_database()<>'tekniko_stage10_test' then
    raise exception 'Refusing auth/profile test outside disposable database';
  end if;
end $$;

do $test$
declare
  v_city bigint;
  v_district_1 bigint;
  v_district_2 bigint;
  v_category uuid;
  v_customer uuid:=gen_random_uuid();
  v_technician uuid:=gen_random_uuid();
  v_status text;
begin
  insert into public.cities(name,plate_code) values('Auth Test City',98) returning id into v_city;
  insert into public.districts(city_id,name) values(v_city,'Auth District 1') returning id into v_district_1;
  insert into public.districts(city_id,name) values(v_city,'Auth District 2') returning id into v_district_2;
  select id into v_category from public.service_categories where is_active order by name limit 1;

  insert into auth.users(id,phone,phone_confirmed_at,created_at,raw_user_meta_data)
    values(v_customer,'+905551000001',now(),now()-interval '2 days','{"full_name":"Yerel Müşteri"}');
  insert into public.users(id,name,role,phone,is_active)
    values(v_customer,'Geçici Müşteri','customer','+905551000001',true);
  if not public.complete_customer_password_registration(v_customer,'+905551000001',
    'Yerel Müşteri','customer@local.test',v_city,v_district_1,'Yerel müşteri kayıt adresi') then
    raise exception 'Customer registration did not change state';
  end if;
  perform public.update_customer_profile(v_customer,'Yerel Müşteri Güncel',
    'updated-customer@local.test',jsonb_build_array(
      jsonb_build_object('slot',1,'label','Ev','cityId',v_city,'districtId',v_district_1,'addressLine','Yerel müşteri ev adresi güncel'),
      jsonb_build_object('slot',2,'label','İş','cityId',v_city,'districtId',v_district_2,'addressLine','Yerel müşteri iş adresi güncel')));
  if (select count(*) from public.customer_addresses where customer_id=v_customer)<>2 then
    raise exception 'Customer addresses were not persisted';
  end if;
  perform public.update_customer_profile(v_customer,'Yerel Müşteri Güncel',
    'updated-customer@local.test',jsonb_build_array(
      jsonb_build_object('slot',1,'label','Ev','cityId',v_city,'districtId',v_district_1,'addressLine','Yerel müşteri ev adresi son')));
  if (select count(*) from public.customer_addresses where customer_id=v_customer)<>2
     or (select count(*) from public.customer_addresses where customer_id=v_customer
          and profile_slot is not null and profile_archived_at is null)<>1
     or (select count(*) from public.customer_addresses where customer_id=v_customer
          and profile_slot is null and profile_archived_at is not null)<>1 then
    raise exception 'Removed customer address was not safely archived';
  end if;

  update auth.users set phone='+905551000011',phone_confirmed_at=now() where id=v_customer;
  perform public.sync_verified_account_phone(v_customer,'+905551000011');
  if (select phone from public.users where id=v_customer)<>'+905551000011' then
    raise exception 'Verified phone was not synchronized';
  end if;

  insert into auth.users(id,phone,phone_confirmed_at,created_at,raw_user_meta_data)
    values(v_technician,'+905551000002',now(),now()-interval '2 days','{"full_name":"Yerel Usta"}');
  insert into public.users(id,name,role,phone,is_active)
    values(v_technician,'Geçici Usta','customer','+905551000002',true);
  if not public.complete_technician_registration(v_technician,'+905551000002','Yerel Usta',
    'technician@local.test',array[v_category],v_city,array[v_district_1],
    v_city,v_district_1,'Yerel usta kayıt adresi') then
    raise exception 'Technician registration did not change state';
  end if;
  perform public.update_technician_profile(v_technician,'Yerel Usta Güncel',
    'updated-technician@local.test',v_city,v_district_2,'Yerel usta güncel kayıt adresi',
    v_city,array[v_district_1,v_district_2]);
  v_status:=public.add_technician_profile_category(v_technician,v_category);
  if v_status not in ('pending','pending_document','approved','rejected') then
    raise exception 'Category status missing';
  end if;
  if (select count(*) from public.technician_service_areas where technician_id=v_technician)<>2 then
    raise exception 'Technician service areas were not replaced';
  end if;

  update public.customer_profiles set avatar_path='customer/'||v_customer::text||'/avatar' where user_id=v_customer;
  update public.technician_profiles set avatar_path='technician/'||v_technician::text||'/avatar' where user_id=v_technician;
  if not exists(select 1 from storage.buckets where id='profile-avatars' and not public) then
    raise exception 'Private profile avatar bucket missing';
  end if;
  if has_column_privilege('authenticated','public.users','phone','UPDATE') then
    raise exception 'Authenticated still has direct phone UPDATE';
  end if;
  if has_table_privilege('authenticated','public.customer_addresses','INSERT')
     or has_table_privilege('authenticated','public.customer_addresses','UPDATE')
     or has_table_privilege('authenticated','public.customer_addresses','DELETE') then
    raise exception 'Authenticated still has direct address mutation privilege';
  end if;
  if has_function_privilege('authenticated','public.sync_verified_account_phone(uuid,text)','EXECUTE') then
    raise exception 'Authenticated can execute phone synchronization RPC';
  end if;
end
$test$;

select 'AUTH PROFILE DATABASE INTEGRATION: PASS' as result;
