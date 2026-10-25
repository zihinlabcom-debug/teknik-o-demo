import test from 'node:test';import assert from 'node:assert/strict';import {sql} from './t100-local-db.mjs';
test('all six T100 tables have RLS; no role can directly mutate any journal',()=>{
 assert.deepEqual(sql("select tablename from pg_tables where schemaname='public' and tablename like 't100_%' order by tablename").split('\n'),['t100_cancellations','t100_completion_reports','t100_distribution_simulations','t100_finalizations','t100_penalty_entries','t100_reviews']);
 assert.equal(sql("select count(*) from pg_tables where schemaname='public' and tablename like 't100_%' and not rowsecurity"),'0');
 assert.equal(sql("select count(*) from pg_tables t cross join unnest(array['anon','authenticated','service_role']) r(role_name) cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE']) p(privilege_name) where schemaname='public' and tablename like 't100_%' and has_table_privilege(r.role_name,quote_ident(schemaname)||'.'||quote_ident(tablename),p.privilege_name)"),'0');
});
test('no non-trigger T100 RPC is executable by anon or authenticated',()=>assert.equal(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 't100_%' and p.prorettype<>'trigger'::regtype and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))"),'0'));
