// Real PostgreSQL only. No environment files, network services or credentials.
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
export const container='hizmetpey-t103-pg-20261025';
export const database=process.env.T103_TEST_DATABASE??process.argv.find(a=>a.startsWith('--database='))?.split('=')[1]??'t103';
if(!/^t103(?:_[a-z0-9]+)*$/.test(database))throw Error('Invalid T100-only database');
export function assertTarget(){
 const [c]=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}));
 if(c.Name!=='/'+container||c.Config.Labels?.['hizmetpey.scope']!=='t103'||
 c.Config.Labels?.['hizmetpey.owner']!=='codex-t103'||c.HostConfig.NetworkMode!=='none'||
 !c.State.Running||c.Mounts.some(m=>m.Type==='volume'||m.Type==='bind')||
 Object.keys(c.HostConfig.PortBindings??{}).length)throw Error('Unsafe PostgreSQL test target');
}
export function sql(text,{role=null}={}){
 assertTarget();
 const result=spawnSync('docker',['exec','-i',container,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','t100','-d',database],
 {input:(role?'set role '+role+';\n':'')+text,encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});
 if(result.status!==0)throw Error(result.stderr||result.error?.message||'psql failed');
 return result.stdout.trim();
}
function file(relative){
 let text=readFileSync(path.join(root,relative),'utf8');
 if(relative==='supabase/tests/stage10_local_fixture.sql'||relative.includes('integration.sql'))
 text=text.replaceAll('tekniko_stage10_test',database);
 if(relative.endsWith('20261007213150_assignment_timeout_redistribution.sql'))
 text=text.replace(/create extension if not exists pg_cron[\s\S]*?\$cron_setup\$;/,
 '-- pg_cron scheduling is not installed in vanilla PostgreSQL; lifecycle RPCs are unchanged.');
 sql(text);console.log('APPLIED '+relative);
}
if(process.argv.includes('--bootstrap')){
 assertTarget();
 if(!process.argv.includes('--resume')&&sql("select count(*) from information_schema.tables where table_schema='public'")!=='0')
 throw Error('Bootstrap refuses a non-empty database; no reset performed');
 if(!process.argv.includes('--resume'))file('supabase/tests/stage10_local_fixture.sql');
 if(!process.argv.includes('--resume'))sql("insert into public.cities(name,plate_code) values('T100',99); insert into public.districts(city_id,name) select id,'T100' from public.cities;");
 const migrations=readdirSync(path.join(root,'supabase/migrations')).filter(n=>n>='20261004000001'&&n<='20261009122000zz').sort();
 for(const n of migrations){
  if(n==='20261006184500_stage4_boiler_service_role_grants.sql'||process.argv.includes('--resume')&&n<'20261006221345')continue;
  if(n==='20261005193656_stage4_final_product_corrections.sql')file('supabase/tests/stage4_final_local_storage_stub.sql');
  file('supabase/migrations/'+n);
 }
 // Baseline case/security tests run BEFORE T100 changes.
 file('supabase/tests/stage10_case_integration.sql');
 file('supabase/tests/stage10_audit_integration.sql');
 sql("alter table public.customer_addresses add column if not exists city text,add column if not exists district text; create unique index if not exists technician_service_areas_city_unique on public.technician_service_areas(technician_id,city_id) where district_id is null;create unique index if not exists technician_service_areas_district_unique on public.technician_service_areas(technician_id,city_id,district_id) where district_id is not null;");
 for(const n of ['20261011000625_customer_technician_auth_profiles.sql','20261011084530_auth_profile_security_hardening.sql',
 '20261011215411_stage12_finance_core.sql','20261011215509_stage12_finance_gate_lifecycle.sql','20261014193758_stage12_iyzico_integration_draft.sql'])
 file('supabase/migrations/'+n);
 file('supabase/tests/stage12_finance_integration.sql');
 for(const n of ['20261014220856_stage12_iyzico_lifecycle_activation.sql','20261014234840_stage12_iyzico_refund_context_volatility.sql','20261015104311_stage12_iyzico_reconciliation_issue_resolution.sql'])
 file('supabase/migrations/'+n);
 file('supabase/migrations/20261025000345_t100_lifecycle_core.sql');
 for(const n of readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.includes('_t100_')&&n>'20261025000345_t100_lifecycle_core.sql').sort())file('supabase/migrations/'+n);
 for(const n of readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.includes('_t102_')).sort())file('supabase/migrations/'+n);
 if(process.argv.includes('--t103'))for(const n of readdirSync(path.join(root,'supabase/migrations')).filter(n=>n.includes('_t103_')).sort())file('supabase/migrations/'+n);
 console.log('T100_ALL_MIGRATIONS_APPLIED_REAL_POSTGRES');
}
