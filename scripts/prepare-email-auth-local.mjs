import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
if(!root.endsWith('teknik-o-email-auth-worktree'))throw new Error('Wrong worktree');
const container='supabase_db_hizmetpey-email-auth-20261013';
const check=spawnSync('docker',['inspect','--format','{{.Name}}',container],{encoding:'utf8'});
if(check.status||check.stdout.trim()!=='/'+container)throw new Error('Dedicated container not verified');
const stateFile=resolve('.local-email-auth/applied.json');
const applied=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):[];
function sql(name,input){
 if(applied.includes(name))return;
 const result=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',maxBuffer:4*1024*1024});
 if(result.status){console.error(name,result.stderr);process.exit(1);}
 applied.push(name);writeFileSync(stateFile,JSON.stringify(applied,null,2));console.log('APPLIED LOCAL:',name);
}
let fixture=readFileSync('supabase/tests/stage10_local_fixture.sql','utf8');
fixture=fixture.slice(fixture.indexOf('create table public.users'));
sql('stage10 fixture with REAL local Auth (no auth/storage stubs)',fixture);
sql('legacy address schema compatibility',"alter table public.customer_addresses add column city text,add column district text; create unique index technician_service_areas_city_unique on public.technician_service_areas(technician_id,city_id) where district_id is null; create unique index technician_service_areas_district_unique on public.technician_service_areas(technician_id,city_id,district_id) where district_id is not null;");
const names=[
'20260926000002_core_rls.sql','20261002000001_account_auth_stage1.sql',
'20261004000001_service_category_integrity.sql','20261004000002_operation_core.sql',
'20261004000003_dispatch_atomic_accept.sql','20261004000004_operation_security_rls.sql',
'20261004000005_accepted_price_snapshot.sql','20261004000006_operational_event_history.sql',
'20261004000007_operation_lifecycle_guard.sql','20261004000008_operation_access_hardening.sql',
'20261004231649_service_request_creation.sql','20261005012645_stage2_service_role_reads.sql',
'20261005025943_service_request_assessment_snapshot.sql','20261005122856_stage3_accepted_maximum_price.sql',
'20261005145000_stage4_technician_management.sql','20261005165245_technician_signup_onboarding.sql',
'20261005193656_stage4_final_product_corrections.sql','20261006221345_stage5_find_eligible_technicians.sql',
'20261006225806_stage5_remove_fixed_active_job_capacity.sql','20261006230127_stage5_require_approved_category_on_accept.sql',
'20261007005802_service_request_scheduling_model.sql','20261007012744_add_scheduled_service_request_rpc.sql',
'20261007012821_harden_unpriced_service_request_compatibility.sql','20261007012845_add_scheduled_priced_service_request_rpc.sql',
'20261007012856_harden_priced_service_request_compatibility.sql','20261007032904_enforce_single_active_job_and_appointment.sql',
'20261007043358_create_service_appointment_rpc.sql','20261007073033_allow_direct_job_completion.sql',
'20261007213150_assignment_timeout_redistribution.sql','20261008000451_start_initial_distribution_on_request_creation.sql',
'20261008094945_stage9_admin_manual_assignment.sql','20261008135114_stage9_admin_manual_assignment_candidates.sql',
'20261008150736_stage9_final_assignment_boundary.sql','20261009120000_stage10_case_core.sql',
'20261009121000_stage10_case_workflows.sql','20261009122000_stage10_private_evidence_kpi_admin.sql',
'20261011000625_customer_technician_auth_profiles.sql','20261011084530_auth_profile_security_hardening.sql',
'20261011215411_stage12_finance_core.sql','20261011215509_stage12_finance_gate_lifecycle.sql',
'20261013101905_email_auth_registration.sql'];
for(const name of names)sql(name,readFileSync('supabase/migrations/'+name,'utf8'));
sql('synthetic local location catalog',"insert into public.cities(name,plate_code) values('Yerel Test',34); insert into public.districts(city_id,name) select id,'Yerel İlçe' from public.cities where plate_code=34; notify pgrst,'reload schema';");
console.log('Local setup complete; no remote endpoints used.');
