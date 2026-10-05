import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('Stage 2 migration creates idempotent request RPC and event',()=>{
  const sql=read('supabase/migrations/20261004231649_service_request_creation.sql');
  assert.match(sql,/create_service_request/);
  assert.match(sql,/request\.created/);
  assert.match(sql,/service_requests_customer_request_key_uq/);
  assert.match(sql,/Address does not belong to customer/);
  assert.match(sql,/grant execute on function public\.create_service_request\(uuid,text,uuid,text,text,text,text\) to service_role/);
});

test('Stage 2 request API derives request data from signed conversation state',()=>{
  const route=read('src/app/api/operations/requests/route.ts');
  const server=read('src/lib/operation-server.ts');
  assert.match(route,/conversationToken/);
  assert.doesNotMatch(route,/body\.category|body\.requestKey|body\.pricingReference/);
  assert.match(server,/decodeConversationState/);
  assert.match(server,/conversation\?\.customerId!==account\.id/);
  assert.match(server,/conversation_owner_mismatch/);
  assert.match(server,/createHash\('sha256'\)/);
  assert.match(server,/conversation-sha256:/);
  assert.match(server,/currentAccount|requireRole/);
  assert.match(server,/create_service_request/);
  assert.match(server,/customer_addresses/);
  assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/);
});

test('Usta çağır dialog sends only signed conversation token',()=>{
  const ui=read('src/components/service-result.tsx');
  assert.match(ui,/\/api\/operations\/requests/);
  assert.match(ui,/conversationToken:response\.conversationToken/);
  assert.match(ui,/Talebiniz oluşturuldu/);
  assert.doesNotMatch(ui,/requestKey:`conversation:/);
  assert.doesNotMatch(ui,/Usta yönlendirmesi şu anda kullanılamıyor/);
});

test('Stage 2 server-role read migration grants only required request reads',()=>{
  const sql=read('supabase/migrations/20261005000002_stage2_service_role_reads.sql');
  assert.match(sql,/grant select on public\.customer_addresses to service_role/);
  assert.match(sql,/grant select on public\.service_requests to service_role/);
  assert.match(sql,/grant select on public\.service_categories to service_role/);
  assert.doesNotMatch(sql,/grant (insert|update|delete|all)/i);
});

test('Stage 2 validation script uses applied migration names',()=>{
  const script=read('STAGE2_VALIDATE.ps1');
  assert.match(script,/20261004231649_service_request_creation\.sql/);
  assert.match(script,/20261005000002_stage2_service_role_reads\.sql/);
  assert.doesNotMatch(script,/20261005000001_service_request_creation\.sql/);
});
