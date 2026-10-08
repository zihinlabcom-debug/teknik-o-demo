import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationsDir=new URL('../supabase/migrations/',import.meta.url);
const migrationName=fs.readdirSync(migrationsDir)
  .find(name=>name.endsWith('_stage9_admin_manual_assignment.sql'));

assert.ok(migrationName,'Stage 9 admin manual assignment migration not found');

const sql=fs.readFileSync(new URL(migrationName,migrationsDir),'utf8');

test('manual assignment is explicitly separated from automatic assignment',()=>{
  assert.match(sql,/add column if not exists assignment_source text not null default 'automatic'/i);
  assert.match(sql,/assignment_source in \('automatic','admin_manual'\)/i);
  assert.match(sql,/'admin_manual'/);
});

test('manual assignment requires an active admin and records the admin actor',()=>{
  assert.match(sql,/where id=p_admin_user_id[\s\S]*for update/i);
  assert.match(sql,/v_role<>'admin'/i);
  assert.match(sql,/v_active is distinct from true/i);
  assert.match(sql,/actor_user_id[\s\S]*p_admin_user_id/i);
  assert.match(sql,/'admin\.manual_assignment'/i);
});

test('manual assignment is allowed only after a fully exhausted three-round distribution',()=>{
  assert.match(sql,/status='active'/i);
  assert.match(sql,/Automatic distribution is still active/i);
  assert.match(sql,/v_cycle\.status<>'exhausted'/i);
  assert.match(sql,/v_cycle\.current_round<>3/i);
  assert.match(sql,/Manual assignment requires exhausted three-round distribution/i);
});

test('manual assignment cannot replace an already assigned or in-progress technician',()=>{
  assert.match(sql,/status in \('assigned','in_progress'\)/i);
  assert.match(sql,/Request already has an active job/i);
});

test('request-specific permanent technician exclusions cannot be bypassed by admin',()=>{
  assert.match(sql,/service_request_technician_exclusions/i);
  assert.match(sql,/technician_id=p_technician_id/i);
  assert.match(sql,/Technician is excluded from this request/i);
});

test('technician account profile category and service area remain mandatory',()=>{
  assert.match(sql,/v_role<>'technician'/i);
  assert.match(sql,/Technician account is not active/i);
  assert.match(sql,/v_profile_approval<>'approved'/i);
  assert.match(sql,/approval_status='approved'/i);
  assert.match(sql,/Technician category is not approved for request/i);
  assert.match(sql,/technician_service_areas/i);
  assert.match(sql,/Technician is not eligible for request service area/i);
});

test('availability and active-job count do not block an admin manual assignment',()=>{
  assert.match(sql,/approval_status,is_available/i);
  assert.match(sql,/v_available/i);
  assert.match(sql,/v_active_job_count/i);

  assert.doesNotMatch(
    sql,
    /if\s+v_available\s+is\s+distinct\s+from\s+true[\s\S]{0,150}raise exception/i
  );

  assert.doesNotMatch(
    sql,
    /if\s+v_active_job_count\s*(?:>=|>|=)[\s\S]{0,150}raise exception/i
  );
});

test('manual assignment preserves dispatch and accepted-price data integrity',()=>{
  assert.match(sql,/insert into public\.service_dispatches/i);
  assert.match(sql,/quote_id/i);
  assert.match(sql,/insert into public\.service_jobs/i);
  assert.match(sql,/dispatch_id/i);
  assert.match(sql,/accepted_quote_id/i);
  assert.match(sql,/status,[\s\S]*assigned_at/i);
});

test('manual assignment is idempotent and reason is mandatory',()=>{
  assert.match(sql,/p_idempotency_key/i);
  assert.match(sql,/where idempotency_key=p_idempotency_key/i);
  assert.match(sql,/return v_prior_job\.id/i);
  assert.match(sql,/p_reason is null/i);
  assert.match(sql,/btrim\(p_reason\)/i);
});

test('manual assignment RPC stays service-role only',()=>{
  assert.match(
    sql,
    /revoke all on function public\.admin_manual_assign_service_job\(uuid,uuid,uuid,text,text\)[\s\S]*from public,anon,authenticated/i
  );
  assert.match(
    sql,
    /grant execute on function public\.admin_manual_assign_service_job\(uuid,uuid,uuid,text,text\)[\s\S]*to service_role/i
  );
});
