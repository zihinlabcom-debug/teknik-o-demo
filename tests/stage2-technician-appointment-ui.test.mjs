import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('technician job detail loads customer scheduling mode and date',()=>{
  const server=read('apps/technician/src/lib/operation-server.ts');

  assert.match(
    server,
    /select\('id,category_id,address_id,status,requested_service_mode,requested_service_date'\)/
  );
});

test('technician job page only offers appointment creation for assigned job without active appointment',()=>{
  const page=read('apps/technician/src/app/usta/is/[id]/page.tsx');

  assert.match(page,/appointment\.status==='scheduled'\|\|appointment\.status==='confirmed'/);
  assert.match(page,/d\.status==='assigned'/);
  assert.match(page,/!activeAppointment/);
  assert.match(page,/requestMode==='scheduled'/);
  assert.match(page,/requestMode==='immediate'/);
  assert.match(page,/TechnicianAppointmentForm/);
});

test('scheduled appointment keeps customer date locked while immediate mode allows date selection',()=>{
  const form=read('apps/technician/src/components/technician-appointment-form.tsx');

  assert.match(form,/mode==='scheduled'/);
  assert.ok(form.includes('Müşterinin seçtiği tarih değiştirilemez.'));
  assert.match(form,/type="date"/);
  assert.match(form,/min=\{immediateMinDate\}/);
  assert.match(form,/max=\{immediateMaxDate\}/);
});

test('appointment form posts Istanbul timestamp and keeps 20:00 ceiling',()=>{
  const form=read('apps/technician/src/components/technician-appointment-form.tsx');

  assert.match(form,/\+03:00/);
  assert.ok(form.includes('max="20:00"'));
  assert.match(form,/\/api\/operations\/jobs\/\$\{jobId\}\/appointment/);
  assert.match(form,/JSON\.stringify\(\{startsAt\}\)/);
  assert.ok(form.includes('24 saat içinde'));
  assert.ok(form.includes('1 saat içinde'));
  assert.doesNotMatch(form,/SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/);
});
