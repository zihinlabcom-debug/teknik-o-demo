import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('technician UI has no start action and exposes completion for the new flow',()=>{
  const page=read('apps/technician/src/app/usta/is/[id]/page.tsx');

  assert.doesNotMatch(page,/\/start/);
  assert.doesNotMatch(page,/İşi başlat/);
  assert.match(page,/\/complete/);
  assert.match(page,/requestMode==='immediate'/);
  assert.match(page,/requestMode==='scheduled'[\s\S]{0,120}Boolean\(activeAppointment\)[\s\S]{0,120}d\.scheduled_service_date_reached/);
});

test('direct completion migration enforces scheduled day and appointment rules',()=>{
  const sql=read('supabase/migrations/20261007073033_allow_direct_job_completion.sql');

  assert.match(sql,/old\.status = 'assigned'[\s\S]*'in_progress', 'completed', 'cancelled'/);
  assert.match(sql,/requested_service_mode, requested_service_date/);
  assert.match(sql,/Europe\/Istanbul/);
  assert.match(sql,/local_today < request_date/);
  assert.match(sql,/Scheduled job cannot be completed before requested service date/);
  assert.match(sql,/status in \('scheduled', 'confirmed'\)/);
  assert.match(sql,/Scheduled job requires an active appointment before completion/);
  assert.match(sql,/Appointment date does not match requested service date/);
});

test('immediate completion does not require an appointment and completion closes any active appointment',()=>{
  const sql=read('supabase/migrations/20261007073033_allow_direct_job_completion.sql');

  assert.match(sql,/request_mode = 'immediate'/);
  assert.doesNotMatch(sql,/request_mode = 'immediate'[\s\S]{0,300}requires an active appointment/i);
  assert.match(sql,/update public\.service_jobs[\s\S]*status = 'completed'/);
  assert.match(sql,/update public\.service_appointments[\s\S]*status = 'completed'/);
  assert.doesNotMatch(sql,/set[\s\S]{0,120}started_at\s*=/i);
});

test('completion RPC remains service-role only',()=>{
  const sql=read('supabase/migrations/20261007073033_allow_direct_job_completion.sql');

  assert.match(sql,/revoke all on function public\.complete_service_job\(uuid, uuid\)[\s\S]*from public, anon, authenticated/i);
  assert.match(sql,/grant execute on function public\.complete_service_job\(uuid, uuid\)[\s\S]*to service_role/i);
});
