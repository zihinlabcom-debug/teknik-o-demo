import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import * as presentation from '../apps/admin/src/lib/operation-presentation.ts';
const {assignmentSourceLabel,operationEventLabel,operationStatusLabel,formatOperationDateTime}=presentation;

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('created request status stays distinct from operation and job completion',()=>{
  assert.equal(operationStatusLabel('created'),'Oluşturuldu');
  assert.equal(operationStatusLabel('completed'),'Tamamlandı');
  assert.equal(operationStatusLabel('unexpected_created'),'Bilinmeyen durum');
});

test('scheduled, completed and verified authorization events have their exact meanings',()=>{
  assert.equal(operationEventLabel('appointment.scheduled'),'Randevu oluşturuldu');
  assert.equal(operationEventLabel('appointment.completed'),'Randevu tamamlandı');
  assert.equal(operationEventLabel('finance.iyzico_authorize_succeeded'),'Ödeme provizyonu başarılı');
  assert.equal(operationEventLabel('finance.iyzico_capture_succeeded'),'Ödeme tahsil edildi');
});

test('unrecognized appointment and authorization outcomes retain the safe fallback',()=>{
  for(const event of ['appointment.unknown','finance.iyzico_authorize_declined','finance.iyzico_authorize_unknown','finance.iyzico_authorize_succeeded_extra']){
    assert.equal(operationEventLabel(event),'Tanımlanmamış teknik olay',event);
  }
});

test('Istanbul display preserves instants across UTC day boundaries and host timezones',()=>{
  const originalTZ=process.env.TZ;
  try{
    for(const zone of ['UTC','America/New_York','Asia/Tokyo']){
      process.env.TZ=zone;
      assert.equal(formatOperationDateTime('2026-10-22T00:58:50.432Z'),'22.10.2026 03:58:50');
      assert.equal(formatOperationDateTime('2026-10-22T03:58:50.432+03:00'),'22.10.2026 03:58:50');
      assert.equal(formatOperationDateTime('2026-12-31T22:30:00Z'),'01.01.2027 01:30:00');
      assert.equal(formatOperationDateTime('2026-06-01T00:00:00Z'),'01.06.2026 03:00:00');
    }
  }finally{if(originalTZ===undefined)delete process.env.TZ;else process.env.TZ=originalTZ;}
});

test('missing and invalid timestamps cannot masquerade as actual appointment times',()=>{
  for(const value of [null,undefined,'','invalid-time'])assert.equal(formatOperationDateTime(value),'—');
});

test('admin current detail and separate investigation history preserve status and all six Istanbul timestamps',async()=>{
  const d={status:'created',customer:{name:'TEST',is_test:true},category:{name:'Temizlik'},quotes:[],
    cycles:[{id:'cycle',status:'accepted',current_round:1,started_at:'2026-10-22T00:41:00Z',next_round_at:'2026-10-22T00:46:00Z'}],
    dispatches:[{id:'dispatch',status:'accepted',round_no:1,expires_at:'2026-10-22T00:48:00Z'}],
    jobs:[{id:'job',status:'completed',appointments:[{id:'appointment',status:'completed',starts_at:'2026-10-22T00:58:00Z'}]}],
    exclusions:[{technician_id:'excluded',reason:'declined',created_at:'2026-10-22T00:25:00Z'}],
    events:[{id:'capture',event_type:'finance.iyzico_capture_succeeded',occurred_at:'2026-10-22T00:58:50Z'}]};
  const before=structuredClone(d),exports={};
  const panels={PanelCard:({title,children})=>createElement('section',{'aria-label':title},children),PanelHeading:()=>null,RecordTypeBadge:()=>null,EmptyPanelState:({children})=>createElement('p',null,children)};
  const modules={
    'react/jsx-runtime':jsxRuntime,'next/link':{default:({children,href})=>createElement('a',{href},children)},'next/navigation':{notFound(){throw Error('UNEXPECTED_NOT_FOUND');}},
    '@/lib/t111-admin-read':{adminFinancialDetail:async()=>({request:{technician_name:'TEST USTA',appointment_at:'2026-10-22T00:58:00Z',operation_status:'completed'}}),adminRequestHistory:async()=>({request:{id:'request'},financeDecisions:[],jobs:[],offers:[],cancellations:[],cycles:[{id:'cycle',status:'accepted',round:1,startedAt:'2026-10-22T00:41:00Z',nextAt:'2026-10-22T00:46:00Z'}],dispatches:[{id:'dispatch',status:'accepted',round:1,expiresAt:'2026-10-22T00:48:00Z'}],exclusions:[{technician:'Excluded',reason:'declined',createdAt:'2026-10-22T00:25:00Z'}],events:[{id:'capture',type:'finance.iyzico_capture_succeeded',at:'2026-10-22T00:58:50Z',actor:'System'}]})},
    '@/components/t111-admin-finance-summary':{AdminFinanceSummary:()=>createElement('div',null,'Finance summary')},
    '@/lib/t100-server':{adminT100State:async()=>({completion:null,review:null,finalization:null})},
    '../../../../../../../src/components/t100-service-actions':{T100ServiceActions:()=>{throw Error('Unexpected lifecycle render in legacy timestamp fixture');}},
    '@/components/operation-panel':panels,'@/lib/operation-presentation':presentation,
    '@/lib/operation-server':{adminRequestDetail:async()=>d,adminManualAssignmentReady:async()=>false,adminManualAssignmentCandidates:async()=>{throw Error('UNEXPECTED_OPERATION');},OperationError:class extends Error{}},
    '@/lib/stage10-server':{adminOperationContract:async()=>({stage:'completed',assignmentSource:'automatic',terminal:true,currentJobId:'job'})},
    '@/lib/service-request-assessment-display':{assessmentDetailRows:()=>[]},
    '@/components/t100-admin-finance-actions':{T100AdminFinanceActions:()=>{throw Error('UNEXPECTED_FINANCE_RECOVERY_FOR_COMPLETED_FIXTURE');}},
    '@/components/manual-assignment-panel':{ManualAssignmentPanel:()=>null},
    '@/components/stage10-operation-intervention':{Stage10OperationIntervention:()=>null},
  };
  const code=ts.transpileModule(read('apps/admin/src/app/admin/talepler/[id]/page.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>{if(!(name in modules))throw Error('UNEXPECTED_IMPORT');return modules[name];}});
  const html=renderToStaticMarkup(await exports.default({params:Promise.resolve({id:'request'})}));
  const historyExports={};const historyCode=ts.transpileModule(read('apps/admin/src/app/admin/talepler/[id]/gecmis/page.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(historyCode,{exports:historyExports,require:name=>{if(!(name in modules))throw Error('UNEXPECTED_HISTORY_IMPORT '+name);return modules[name];}});
  const historyHtml=renderToStaticMarkup(await historyExports.default({params:Promise.resolve({id:'request'})}));
  assert.ok(!html.includes('Excluded'));assert.ok(!html.includes('03:41:00'));assert.ok(html.includes('/admin/talepler/request/gecmis'));
  const text=(html+historyHtml).replace(/<[^>]*>/g,'').replace(/\s+/g,' ');
  assert.match(text,/Durum: Oluşturuldu/);assert.match(text,/Operasyon: Tamamlandı/);
  for(const time of ['03:41:00','03:46:00','03:48:00','03:58:00','03:25:00','03:58:50'])assert.ok(text.includes('22.10.2026 '+time),time);
  assert.ok(text.includes('Ödeme tahsil edildi'));assert.deepEqual(d,before);
});

test('verified iyzico capture success has the collection label without changing its event code',()=>{
  assert.equal(operationEventLabel('finance.iyzico_capture_succeeded'),'Ödeme tahsil edildi');
  assert.equal(operationEventLabel('finance.captured'),'Ödeme tahsil edildi');
});

test('existing finance event meanings remain distinct and unchanged',()=>{
  for(const [event,label] of Object.entries({
    'finance.authorization_failed':'Ödeme provizyonu başarısız',
    'finance.authorized':'Ödeme provizyonu alındı',
    'finance.payment_pending':'Ödeme bekleniyor',
    'finance.voided':'Ödeme provizyonu iptal edildi',
    'finance.refunded':'Ödeme iade edildi',
  }))assert.equal(operationEventLabel(event),label,event);
});

test('other provider outcomes and unknown capture-like events never imply a successful collection',()=>{
  for(const event of [
    'finance.iyzico_capture_declined','finance.iyzico_capture_unknown','finance.iyzico_capture_in_flight',
    'finance.iyzico_authorize_succeeded','finance.iyzico_cancel_succeeded','finance.iyzico_refund_succeeded',
    'finance.iyzico_capture_succeeded_extra','unexpected.capture_succeeded',null,undefined,
  ])assert.notEqual(operationEventLabel(event),'Ödeme tahsil edildi',String(event));
  assert.equal(operationEventLabel('finance.iyzico_capture_declined'),'Tanımlanmamış teknik olay');
});

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
  const history=read('apps/admin/src/app/admin/talepler/[id]/gecmis/page.tsx');
  for(const field of ['request_status','operation_status'])assert.ok(list.includes('operationStatusLabel(r.'+field+')'));
  for(const call of ['operationStatusLabel(d.status)','operationStatusLabel(contract.stage)','assignmentSourceLabel(contract.assignmentSource)','operationStatusLabel(q.status)'])assert.ok(detail.includes(call),call);
  for(const call of ['operationStatusLabel(c.status)','operationStatusLabel(x.status)','operationStatusLabel(j.status)','operationEventLabel(e.type)'])assert.ok(history.includes(call),call);
  assert.ok(history.includes('formatOperationDateTime(e.at)'));
  assert.doesNotMatch(detail,/\{e\.event_type\}/);
});
