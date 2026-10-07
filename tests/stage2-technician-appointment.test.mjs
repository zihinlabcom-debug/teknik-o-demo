import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('technician appointment server action uses authenticated technician and appointment RPC',()=>{
  const server=read('apps/technician/src/lib/operation-server.ts');

  assert.match(server,/export async function createTechnicianAppointment/);
  assert.match(server,/requireRole\('technician'\)/);
  assert.match(server,/rpc\('create_service_appointment'/);
  assert.match(server,/p_job_id:jobId/);
  assert.match(server,/p_technician_id:account\.id/);
  assert.match(server,/p_starts_at:normalizedStart/);
  assert.match(server,/normalizeAppointmentStart/);
});

test('technician appointment API validates JSON body and uses shared operation error response',()=>{
  const route=read('apps/technician/src/app/api/operations/jobs/[id]/appointment/route.ts');

  assert.match(route,/await req\.json\(\)/);
  assert.match(route,/createTechnicianAppointment\(id,startsAt\)/);
  assert.match(route,/operationErrorResponse/);
  assert.match(route,/Cache-Control':'no-store/);
  assert.doesNotMatch(route,/SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/);
});

test('appointment database errors are converted to controlled application errors',()=>{
  const server=read('apps/technician/src/lib/operation-server.ts');

  for(const message of [
    'Technician is not assigned to this job',
    'Active appointment already exists for this job',
    'Appointment scheduling window has expired',
    'Appointment cannot start in the past',
    'Appointment cannot start after 20:00',
    'Appointment date must match requested service date',
    'Immediate appointment must be within 24 hours of assignment',
    'Job is not available for appointment scheduling',
  ]){
    assert.ok(server.includes(message),message);
  }
});

test('appointment RPC migration remains service-role only',()=>{
  const sql=read('supabase/migrations/20261007043358_create_service_appointment_rpc.sql');

  assert.match(sql,/create or replace function public\.create_service_appointment/);
  assert.match(sql,/revoke all on function public\.create_service_appointment\(uuid, uuid, timestamptz\)\s+from public, anon, authenticated/i);
  assert.match(sql,/grant execute on function public\.create_service_appointment\(uuid, uuid, timestamptz\)\s+to service_role/i);
});