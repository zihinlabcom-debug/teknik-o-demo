import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('customer scheduling UI exposes date selection only for the approved four categories',()=>{
  const ui=read('apps/customer/src/components/service-result.tsx');
  assert.match(ui,/SCHEDULED_SERVICE_CATEGORIES=new Set\(\['painting','cleaning','sofa_cleaning','carpet_cleaning'\]\)/);
  assert.doesNotMatch(ui,/SCHEDULED_SERVICE_CATEGORIES=new Set\([^)]*'boiler'/);
  assert.match(ui,/const canSelectDate=!!response\?\.category&&SCHEDULED_SERVICE_CATEGORIES\.has\(response\.category\)/);
  assert.match(ui,/const \[requestedServiceMode,setRequestedServiceMode\]=useState<'immediate'\|'scheduled'>\('immediate'\)/);
  assert.match(ui,/Hemen/);
  assert.match(ui,/Tarih seç/);
});

test('customer scheduling UI sends only signed conversation plus scheduling choice and uses Istanbul day bounds',()=>{
  const ui=read('apps/customer/src/components/service-result.tsx');
  assert.match(ui,/timeZone:'Europe\/Istanbul'/);
  assert.match(ui,/minServiceDate=istanbulServiceDate\(1\),maxServiceDate=istanbulServiceDate\(7\)/);
  assert.match(ui,/min=\{minServiceDate\} max=\{maxServiceDate\}/);
  assert.match(ui,/conversationToken:response\.conversationToken/);
  assert.match(ui,/requestedServiceMode:serviceMode/);
  assert.match(ui,/requestedServiceDate:serviceMode==='scheduled'\?serviceDate:null/);
  assert.doesNotMatch(ui,/body:JSON\.stringify\(\{[^}]*category:/s);
  assert.doesNotMatch(ui,/body:JSON\.stringify\(\{[^}]*(?:price|totalAmount|serviceFee|breakdown):/s);
});

test('request API defaults legacy callers to immediate and validates scheduling fields',()=>{
  const route=read('apps/customer/src/app/api/operations/requests/route.ts');
  assert.match(route,/body\.requestedServiceMode===undefined\?'immediate':body\.requestedServiceMode/);
  assert.match(route,/requestedServiceMode!=='immediate'&&requestedServiceMode!=='scheduled'/);
  assert.match(route,/rawRequestedServiceDate!==undefined&&rawRequestedServiceDate!==null&&typeof rawRequestedServiceDate!=='string'/);
  assert.match(route,/requestedServiceMode,/);
  assert.match(route,/requestedServiceDate:typeof rawRequestedServiceDate==='string'\?rawRequestedServiceDate:null/);
  assert.doesNotMatch(route,/body\.category/);
  assert.doesNotMatch(route,/body\.(?:price|totalAmount|serviceFee|breakdown)/);
});

test('server authoritatively validates category, Istanbul date and tomorrow through day 7',()=>{
  const server=read('apps/customer/src/lib/operation-server.ts');
  assert.match(server,/type RequestedServiceMode='immediate'\|'scheduled'/);
  assert.match(server,/DATE_SELECTABLE_CATEGORIES=new Set<string>\(\['painting','cleaning','sofa_cleaning','carpet_cleaning'\]\)/);
  assert.doesNotMatch(server,/DATE_SELECTABLE_CATEGORIES=new Set<string>\([^)]*'boiler'/);
  assert.match(server,/timeZone:'Europe\/Istanbul'/);
  assert.match(server,/if\(requestedServiceMode==='scheduled'\)/);
  assert.match(server,/!DATE_SELECTABLE_CATEGORIES\.has\(category\)/);
  assert.match(server,/const minDate=istanbulCalendarDate\(1\),maxDate=istanbulCalendarDate\(7\)/);
  assert.match(server,/!isStrictIsoDate\(requestedServiceDate\)/);
  assert.match(server,/requestedServiceDate<minDate\|\|requestedServiceDate>maxDate/);
  assert.match(server,/else if\(requestedServiceDate\)/);
  assert.match(server,/Hemen talebinde hizmet tarihi gönderilemez/);
});

test('server calls scheduling-aware RPC signatures and preserves schedule idempotency conflict',()=>{
  const server=read('apps/customer/src/lib/operation-server.ts');
  assert.match(server,/p_requested_service_mode:requestedServiceMode/);
  assert.match(server,/p_requested_service_date:requestedServiceDate/);
  assert.match(server,/db\.rpc\('create_priced_service_request'/);
  assert.match(server,/db\.rpc\('create_service_request',args\)/);
  assert.match(server,/existing request schedule mismatch/i);
  assert.match(server,/request_schedule_conflict/);
});

test('database scheduling RPC is authoritative and uses Europe Istanbul tomorrow through day 7',()=>{
  const sql=read('supabase/migrations/20261007012744_add_scheduled_service_request_rpc.sql');
  assert.match(sql,/p_requested_service_mode text/);
  assert.match(sql,/p_requested_service_date date/);
  assert.match(sql,/select c\.id, c\.customer_can_select_date/);
  assert.match(sql,/now\(\) at time zone 'Europe\/Istanbul'/);
  assert.match(sql,/v_mode not in \('immediate','scheduled'\)/);
  assert.match(sql,/Immediate request cannot include a service date/);
  assert.match(sql,/Category does not allow scheduled service/);
  assert.match(sql,/p_requested_service_date < v_today \+ 1/);
  assert.match(sql,/p_requested_service_date > v_today \+ 7/);
  assert.match(sql,/Existing request schedule mismatch/);
});

test('priced scheduling RPC forwards mode and date while legacy RPCs remain immediate',()=>{
  const priced=read('supabase/migrations/20261007012845_add_scheduled_priced_service_request_rpc.sql');
  const legacy=read('supabase/migrations/20261007012821_harden_unpriced_service_request_compatibility.sql');
  const legacyPriced=read('supabase/migrations/20261007012856_harden_priced_service_request_compatibility.sql');

  assert.match(priced,/p_requested_service_mode text/);
  assert.match(priced,/p_requested_service_date date/);
  assert.match(priced,/p_requested_service_mode,\s*\n\s*p_requested_service_date/s);

  for(const sql of [legacy,legacyPriced]){
    assert.match(sql,/'immediate',\s*\n\s*null/s);
  }
});
