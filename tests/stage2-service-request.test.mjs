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
  assert.match(server,/createHash\('sha256'\)/);
  assert.match(server,/conversation-sha256:/);
  assert.match(server,/currentAccount|requireRole/);
  assert.match(server,/create_service_request/);
  assert.match(server,/customer_addresses/);
  assert.doesNotMatch(route,/SUPABASE_SERVICE_ROLE_KEY/);
});

test('Usta Ã§aÄŸÄ±r dialog sends only signed conversation token',()=>{
  const ui=read('src/components/service-result.tsx');
  assert.match(ui,/\/api\/operations\/requests/);
  assert.match(ui,/conversationToken:response\.conversationToken/);
  assert.match(ui,/Talebiniz oluÅŸturuldu/);
  assert.doesNotMatch(ui,/requestKey:`conversation:/);
  assert.doesNotMatch(ui,/Usta yÃ¶nlendirmesi ÅŸu anda kullanÄ±lamÄ±yor/);
});
