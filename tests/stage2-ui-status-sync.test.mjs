import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('customer status follows job and distribution-cycle truth instead of stale request status',()=>{
  const server=read('apps/customer/src/lib/operation-server.ts');
  const list=read('apps/customer/src/app/musteri/taleplerim/page.tsx');
  const detail=read('apps/customer/src/app/musteri/taleplerim/[id]/page.tsx');

  assert.match(server,/service_distribution_cycles/);
  assert.match(server,/job\.status==='assigned'\|\|job\.status==='in_progress'/);
  assert.ok(server.includes('Teklifiniz tekrar dağıtımda.'));
  assert.ok(server.includes("code:'technician_unavailable' as const,label:'Usta bulunamadı'"));
  assert.match(server,/operation_status=customerOperationStatus/);
  assert.match(list,/r\.operation_status\.label/);
  assert.match(detail,/d\.operation_status\.label/);
});

test('customer detail does not keep a cancelled timed-out technician as the current technician',()=>{
  const server=read('apps/customer/src/lib/operation-server.ts');
  const detail=read('apps/customer/src/app/musteri/taleplerim/[id]/page.tsx');

  assert.match(server,/currentCustomerJob/);
  assert.match(server,/jobs\.find\(job=>job\.status==='assigned'\|\|job\.status==='in_progress'\)/);
  assert.match(server,/jobs\.find\(job=>job\.status==='completed'\)/);
  assert.match(detail,/Yeniden atanıyor/);
  assert.match(detail,/Usta bulunamadı/);
});

test('technician UI blocks stale actions after the one-hour appointment deadline',()=>{
  const server=read('apps/technician/src/lib/operation-server.ts');
  const active=read('apps/technician/src/app/usta/aktif-isler/page.tsx');
  const detail=read('apps/technician/src/app/usta/is/[id]/page.tsx');

  assert.match(server,/APPOINTMENT_SCHEDULING_WINDOW_MS=60\*60\*1000/);
  assert.match(server,/Date\.now\(\)>assignedAt\+APPOINTMENT_SCHEDULING_WINDOW_MS/);
  assert.match(server,/appointment_scheduling_expired/);
  assert.match(active,/Randevu süresi doldu/);
  assert.match(detail,/!d\.appointment_scheduling_expired/);
  assert.ok(detail.includes('Bu iş için artık işlem yapılamaz.'));
});

test('scheduled completion waits for both active appointment and selected service day',()=>{
  const server=read('apps/technician/src/lib/operation-server.ts');
  const detail=read('apps/technician/src/app/usta/is/[id]/page.tsx');

  assert.match(server,/scheduled_service_date_reached/);
  assert.match(server,/requestedDate<=istanbulToday\(\)/);
  assert.match(detail,/requestMode==='scheduled'/);
  assert.match(detail,/Boolean\(activeAppointment\)/);
  assert.match(detail,/d\.scheduled_service_date_reached/);
  assert.ok(detail.includes('müşterinin seçtiği hizmet tarihinden önce tamamlanamaz'));
});

test('admin request detail exposes distribution cycles, rounds, appointments and exclusions without mutation actions',()=>{
  const readServer=read('src/lib/admin-request-read.ts');
  const page=read('apps/admin/src/app/admin/talepler/[id]/page.tsx');

  assert.match(readServer,/service_distribution_cycles/);
  assert.match(readServer,/service_request_technician_exclusions/);
  assert.match(readServer,/distribution_cycle_id,round_no,expires_at/);
  assert.match(readServer,/service_appointments/);
  assert.ok(page.includes('Dağıtım döngüleri'));
  assert.ok(page.includes('İşler ve randevular'));
  assert.ok(page.includes('Dışlanan ustalar'));
  assert.doesNotMatch(page,/OperationActionButton|\/api\/operations\//);
});
