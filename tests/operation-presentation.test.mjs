import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assignmentSourceLabel,operationEventLabel,operationStatusLabel} from '../apps/admin/src/lib/operation-presentation.ts';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('admin and technician operation statuses have controlled Turkish presentation',()=>{
  const technician=read('apps/technician/src/components/technician-ui.tsx');
  assert.equal(operationStatusLabel('pending_admin'),'Yönetim onayı bekleniyor');
  assert.equal(operationStatusLabel('technician_unavailable'),'Usta bulunamadı');
  assert.match(technician,/correction_assigned:'Düzeltme atandı'/);
  assert.equal(assignmentSourceLabel('admin_manual'),'Yönetici ataması');
  assert.equal(operationEventLabel('job.appointment_timeout'),'Randevu belirleme süresi doldu');
});

test('unknown technical codes are not presented as a valid or raw user-facing status',()=>{
  const technician=read('apps/technician/src/components/technician-ui.tsx');
  assert.equal(operationStatusLabel('unexpected_internal_code'),'Bilinmeyen durum');
  assert.match(technician,/labels\[value\]\?\?'Bilinmeyen durum'/);
  assert.equal(assignmentSourceLabel('unexpected_source'),'Bilinmeyen atama kaynağı');
  assert.equal(operationEventLabel('unexpected.event'),'Tanımlanmamış teknik olay');
});

test('admin request screens use presentation functions instead of interpolating raw operation codes',()=>{
  const list=read('apps/admin/src/app/admin/talepler/page.tsx');
  const detail=read('apps/admin/src/app/admin/talepler/[id]/page.tsx');
  assert.match(list,/operationStatusLabel\(r\.status\)/);
  for(const call of [
    'operationStatusLabel(d.status)','operationStatusLabel(contract.stage)','assignmentSourceLabel(contract.assignmentSource)',
    'operationStatusLabel(q.status)','operationStatusLabel(c.status)','operationStatusLabel(x.status)',
    'operationStatusLabel(a.status)','operationEventLabel(e.event_type)',
  ])assert.ok(detail.includes(call),call);
  assert.doesNotMatch(detail,/\{e\.event_type\}/);
});
