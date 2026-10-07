import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationsDir=new URL('../supabase/migrations/',import.meta.url);
const migrationName=fs.readdirSync(migrationsDir)
  .find(name=>name.endsWith('_assignment_timeout_redistribution.sql'));

assert.ok(migrationName,'assignment timeout redistribution migration not found');

const sql=fs.readFileSync(new URL(migrationName,migrationsDir),'utf8');

test('appointment timeout is one hour and only applies to still-assigned jobs without active appointment',()=>{
  assert.match(sql,/assigned_at\+interval '1 hour'/);
  assert.match(sql,/v_job\.status<>'assigned'/);
  assert.match(sql,/status in \('scheduled','confirmed'\)/);
  assert.match(sql,/status='cancelled'/);
  assert.match(sql,/cancelled_at=coalesce\(cancelled_at,now\(\)\)/);
});

test('timed-out technician is permanently excluded from the same request',()=>{
  assert.match(sql,/service_request_technician_exclusions/);
  assert.match(sql,/'appointment_timeout'/);
  assert.match(sql,/primary key\(service_request_id,technician_id\)/);
  assert.match(sql,/Technician is excluded from this request/);
});

test('redistribution starts a fresh three-round cycle with seven-minute rounds',()=>{
  assert.match(sql,/current_round integer not null default 0/);
  assert.match(sql,/current_round between 0 and 3/);
  assert.match(sql,/v_round:=v_cycle\.current_round\+1/);
  assert.match(sql,/interval '7 minutes'/);
  assert.match(sql,/v_cycle\.current_round>=3/);
  assert.match(sql,/'distribution\.redistributed'/);
  assert.match(sql,/'reset_to_round',1/);
});

test('unanswered offers expire and may be reconsidered in a later round',()=>{
  assert.match(sql,/status='expired'/);
  assert.match(sql,/where dispatch_id=v_dispatch_id[\s\S]*status='offered'/);
  assert.doesNotMatch(sql,/service_request_technician_exclusions[\s\S]{0,300}reason[\s\S]{0,100}'expired'/);
});

test('technician open-offer capacity is capped at three and availability off withdraws offers',()=>{
  assert.match(sql,/v_open_offer_count>=3/);
  assert.match(sql,/c\.status='offered'/);
  assert.match(sql,/p_is_available is false/);
  assert.match(sql,/status='withdrawn'/);
});

test('timeout, appointment creation and completion serialize on the job row',()=>{
  assert.match(sql,/timeout_service_job_for_missing_appointment[\s\S]*where id=p_job_id[\s\S]*for update/);
  assert.match(sql,/complete_service_job[\s\S]*where id=p_job_id[\s\S]*for update/);
});

test('immediate direct completion is blocked after the one-hour window when no appointment exists',()=>{
  assert.match(sql,/selected_job\.status='assigned'[\s\S]*not has_active_appointment[\s\S]*assigned_at\+interval '1 hour'/);
  assert.match(sql,/Appointment scheduling window has expired/);
});

test('automatic processing runs from pg_cron every minute and privileged functions stay service-role only',()=>{
  assert.match(sql,/create extension if not exists pg_cron/i);
  assert.match(sql,/'\* \* \* \* \*'/);
  assert.match(sql,/run_service_distribution_automation/);
  assert.match(sql,/revoke all on function public\.run_service_distribution_automation\(\)[\s\S]*from public,anon,authenticated/i);
  assert.match(sql,/grant execute on function public\.run_service_distribution_automation\(\)[\s\S]*to service_role/i);
});
test('legacy start path cannot bypass appointment and timeout rules',()=>{
  assert.match(sql,/create or replace function public\.start_service_job/);
  assert.match(sql,/Active appointment required before starting job/);
  assert.match(sql,/start_service_job[\s\S]*assigned_at\+interval '1 hour'/);
  assert.match(sql,/revoke all on function public\.start_service_job\(uuid,uuid\)[\s\S]*from public,anon,authenticated/i);
});