-- Run only through the dedicated local test runner; read-only effective ACL assertions.
begin;
do $$
declare role_name text; signature text; col text; tab text;
begin
 foreach role_name in array array['anon','authenticated'] loop
  foreach signature in array array[
   'public.email_auth_begin(uuid,text,jsonb)','public.email_auth_complete(uuid,text)',
   'public.email_auth_pending(uuid,text)','public.email_auth_rate_limit(text,integer,integer)',
   'public.email_recovery_consume(text)','public.sync_verified_account_phone(uuid,text)'
  ] loop
   if has_function_privilege(role_name,signature,'EXECUTE') then raise exception 'Unexpected effective EXECUTE privilege: % %',role_name,signature; end if;
   if not has_function_privilege('service_role',signature,'EXECUTE') then raise exception 'Missing service EXECUTE: %',signature; end if;
  end loop;
  if has_schema_privilege(role_name,'account_private','USAGE') then raise exception 'Private schema exposed'; end if;
  if has_table_privilege(role_name,'account_private.email_registrations','SELECT') then raise exception 'Registration data exposed'; end if;
 end loop;
 foreach col in array array['phone','email','role','is_active','is_test'] loop
  if has_column_privilege('authenticated','public.users',col,'UPDATE') then raise exception 'Protected column writable: %',col; end if;
 end loop;
 if not has_column_privilege('authenticated','public.users','name','UPDATE') then raise exception 'Legacy name update privilege lost'; end if;
 foreach tab in array array['users','customer_profiles','technician_profiles','customer_addresses','technician_service_categories','technician_documents'] loop
  if not exists(select 1 from pg_policies where schemaname='public' and tablename=tab and policyname='email_verified_profile_gate' and permissive='RESTRICTIVE') then raise exception 'Verification RLS gate missing: %',tab; end if;
 end loop;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='email_verified_profile_gate' and permissive='RESTRICTIVE') then raise exception 'Storage gate missing'; end if;
 if has_function_privilege('service_role','public.complete_customer_password_registration(uuid,text,text,text,bigint,bigint,text)','EXECUTE')
 or has_function_privilege('service_role','public.complete_technician_registration(uuid,text,text,text,uuid[],bigint,bigint[],bigint,bigint,text)','EXECUTE') then raise exception 'Legacy phone completion remains callable'; end if;
 if position('phone_confirmed_at' in pg_get_functiondef('public.sync_verified_account_phone(uuid,text)'::regprocedure))=0 then raise exception 'Verified phone requirement lost'; end if;
end $$;
rollback;
