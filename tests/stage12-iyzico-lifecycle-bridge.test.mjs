import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier,context,nextResolve){
    if(specifier==='server-only')
      return {url:'data:text/javascript,export%20{}',shortCircuit:true};
    if(specifier.startsWith('../')&&context.parentURL?.endsWith('.ts')&&!specifier.endsWith('.ts'))
      return nextResolve(`${specifier}.ts`,context);
    return nextResolve(specifier,context);
  },
});

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('iyzico pending mode is explicit, staging-only and project-pinned',async()=>{
  const {isIyzicoSandboxPendingRequestMode}=await import(
    '../apps/customer/src/lib/finance/iyzico/iyzico-stage12-contract.ts'
  );
  const valid={STAGE12_IYZICO_SANDBOX_ENABLED:'true',APP_ENV:'staging',
    NODE_ENV:'development',NEXT_PUBLIC_SUPABASE_URL:'https://ygrvtndujbmeatexjdej.supabase.co'};
  assert.equal(isIyzicoSandboxPendingRequestMode(valid),true);
  assert.equal(isIyzicoSandboxPendingRequestMode({...valid,STAGE12_IYZICO_SANDBOX_ENABLED:'false'}),false);
  assert.throws(()=>isIyzicoSandboxPendingRequestMode({...valid,APP_ENV:'production'}));
  assert.throws(()=>isIyzicoSandboxPendingRequestMode({...valid,
    NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co'}));
});

test('browser authorize input accepts only bounded card fields and never amount',async()=>{
  const {parseIyzicoAuthorizeBody,readIyzicoJson}=await import(
    '../apps/customer/src/lib/finance/iyzico/iyzico-stage12-http.ts'
  );
  const input={intentId:'11111111-1111-4111-8111-111111111111',cardHolderName:'Test User',
    cardNumber:'5528 7900 0000 0008',expireMonth:'12',expireYear:'2030',cvc:'123'};
  assert.equal(parseIyzicoAuthorizeBody(input).paymentCard.cardNumber,'5528790000000008');
  assert.throws(()=>parseIyzicoAuthorizeBody({...input,amount:'1.00'}));
  assert.throws(()=>parseIyzicoAuthorizeBody({...input,expireMonth:'13'}));
  await assert.rejects(()=>readIyzicoJson(new Request('https://test.invalid',{method:'POST',
    headers:{'Content-Type':'application/json'},body:'x'.repeat(4097)})));
});

test('activation migration preserves fake flow and fails closed for iyzico lifecycle',async()=>{
  const sql=await read('supabase/migrations/20261014220856_stage12_iyzico_lifecycle_activation.sql');
  assert.match(sql,/create_iyzico_payment_pending_service_request_v3/i);
  assert.match(sql,/'paymentProvider','iyzico'/i);
  assert.match(sql,/if v_intent\.provider='iyzico'[\s\S]*Authorized iyzico payment required before completion/i);
  assert.match(sql,/Verified iyzico cancellation required before terminal request/i);
  assert.match(sql,/Verified iyzico refund required before terminal request/i);
  assert.match(sql,/finance_iyzico_mark_manual_review[\s\S]*status='requires_review'/i);
  assert.match(sql,/finance_iyzico_mark_manual_review\(uuid,text,jsonb\)[\s\S]*to service_role/i);
  assert.match(sql,/if v_intent\.provider<>'fake'[\s\S]*Unsupported finance provider/i);
  assert.match(sql,/finance_fake_refund/i);
  assert.doesNotMatch(sql,/update\s+public\.finance_runtime_config/i);
  assert.match(sql,/revoke all on function public\.finance_capture_completed_job[\s\S]*service_role/i);
});

test('refund context forward repair changes only volatility and keeps service-role boundary',async()=>{
  const sql=await read(
    'supabase/migrations/20261014234840_stage12_iyzico_refund_context_volatility.sql'
  );
  assert.match(sql,/to_regprocedure\('public\.finance_iyzico_refund_context\(uuid,uuid\)'\)/i);
  assert.match(sql,/p\.prosecdef/i);
  assert.match(sql,/alter function public\.finance_iyzico_refund_context\(uuid,uuid\) volatile/i);
  assert.match(sql,/revoke all on function public\.finance_iyzico_refund_context\(uuid,uuid\)[\s\S]*from public,anon,authenticated/i);
  assert.match(sql,/grant execute on function public\.finance_iyzico_refund_context\(uuid,uuid\)[\s\S]*to service_role/i);
  assert.doesNotMatch(sql,/create\s+or\s+replace\s+function/i);
  assert.doesNotMatch(sql,/\b(update|delete|truncate|drop)\b\s+public\./i);
});

test('application bridge selects one provider and never trusts browser money',async()=>{
  const requestSource=await read('apps/customer/src/lib/operation-server.ts');
  const authorizeSource=await read('apps/customer/src/lib/finance/iyzico/iyzico-stage12-actions.ts');
  const completionSource=await read('apps/technician/src/lib/finance/iyzico-job-capture.ts');
  const completionRoute=await read('apps/technician/src/app/api/operations/jobs/[id]/complete/route.ts');
  assert.match(requestSource,/sandboxFinance&&iyzicoFinance/);
  assert.match(requestSource,/create_iyzico_payment_pending_service_request_v3/);
  assert.match(authorizeSource,/scope\.amount/);
  assert.doesNotMatch(authorizeSource,/body\.amount|input\.amount/);
  assert.match(completionSource,/server\.capture/);
  assert.match(completionSource,/server\.reconcile/);
  assert.match(completionSource,/outcome\.result\.outcome==='unknown'/);
  assert.match(completionRoute,/completeTechnicianJob\(id,requestIp\(req\)\)/);
  assert.match(completionRoute,/status:pending\?202:200/);
});

test('cancel stays manual-review and secrets/card data are not logged',async()=>{
  const adapter=await read('apps/customer/src/lib/finance/iyzico/iyzico-adapter.ts');
  const files=await Promise.all([
    read('apps/customer/src/lib/finance/iyzico/iyzico-stage12-actions.ts'),
    read('apps/customer/src/lib/finance/iyzico/iyzico-stage12-route.ts'),
    read('apps/customer/src/app/api/finance/iyzico/authorize/route.ts'),
  ]);
  assert.match(adapter,/return unknown\('cancel',input,'unsigned_cancel_response'\)/);
  for(const source of files){
    assert.doesNotMatch(source,/console\.(log|info|warn|error)/);
    assert.doesNotMatch(source,/IYZICO_SANDBOX_(API_KEY|SECRET_KEY)/);
  }
});
