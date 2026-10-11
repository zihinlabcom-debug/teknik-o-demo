import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  assertSandboxEnabled,assertSameOrigin,effectiveAuthorizationState,
  FinanceInputError,parseFakeAuthorization,
} from '../apps/customer/src/lib/finance/sandbox-contract.ts';
import {handleFakeAuthorization} from '../apps/customer/src/lib/finance/fake-authorization-handler.ts';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const validEnv={
  STAGE12_FAKE_FINANCE_ENABLED:'true',APP_ENV:'staging',VERCEL_ENV:'preview',
  NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://ygrvtndujbmeatexjdej.supabase.co',
};

test('sandbox is explicit, staging-only and bound to the approved project',()=>{
  assert.doesNotThrow(()=>assertSandboxEnabled(validEnv));
  for(const env of [
    {...validEnv,STAGE12_FAKE_FINANCE_ENABLED:'false'},
    {...validEnv,APP_ENV:'production'},
    {...validEnv,VERCEL_ENV:'production'},
    {...validEnv,NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co'},
  ]) assert.throws(()=>assertSandboxEnabled(env),FinanceInputError);
});

test('fake authorization accepts no card or price fields',()=>{
  const input={intentId:'12000000-0000-4000-8000-000000000001',
    idempotencyKey:'approve:stage12',approve:true};
  assert.deepEqual(parseFakeAuthorization(input),input);
  assert.throws(()=>parseFakeAuthorization({...input,cardNumber:'4111111111111111'}),
    error=>error instanceof FinanceInputError&&error.code==='invalid_body');
  assert.throws(()=>parseFakeAuthorization({...input,totalAmount:1}),FinanceInputError);
  assert.throws(()=>parseFakeAuthorization({...input,idempotencyKey:'short'}),FinanceInputError);
});

test('same-origin and current-state decisions fail closed',()=>{
  assert.doesNotThrow(()=>assertSameOrigin('https://customer.test/api/finance','https://customer.test'));
  assert.throws(()=>assertSameOrigin('https://customer.test/api/finance','https://evil.test'),
    error=>error instanceof FinanceInputError&&error.code==='origin_denied');
  assert.equal(effectiveAuthorizationState({status:'authorized',currentIntentStatus:'voided'}),'other');
  assert.equal(effectiveAuthorizationState({status:'authorization_failed'}),'authorization_failed');
  assert.equal(effectiveAuthorizationState({currentIntentStatus:'authorized'}),'authorized');
});

test('fake authorization route enforces origin, JSON and byte limits',async()=>{
  const original=Object.fromEntries(Object.keys(validEnv).map(key=>[key,process.env[key]]));
  Object.assign(process.env,validEnv);
  try{
    let calls=0;
    const authorize=async input=>{calls++;return {intentId:input.intentId,
      paymentStatus:'authorized',distributionStarted:true,reconciliationRequired:false};};
    const body={intentId:'12000000-0000-4000-8000-000000000001',
      idempotencyKey:'approve:stage12',approve:true};
    const request=new Request('https://customer.test/api/finance/fake/authorize',{
      method:'POST',headers:{origin:'https://customer.test','content-type':'application/json'},
      body:JSON.stringify(body),
    });
    const response=await handleFakeAuthorization(request,authorize);
    assert.equal(response.status,200);assert.equal(calls,1);
    assert.equal(response.headers.get('cache-control'),'no-store');

    const crossOrigin=await handleFakeAuthorization(new Request(request.url,{
      method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},
      body:JSON.stringify(body),
    }),authorize);
    assert.equal(crossOrigin.status,403);assert.equal(calls,1);

    const wrongType=await handleFakeAuthorization(new Request(request.url,{
      method:'POST',headers:{origin:'https://customer.test','content-type':'text/plain'},body:'{}',
    }),authorize);
    assert.equal(wrongType.status,415);assert.equal(calls,1);

    const oversized=await handleFakeAuthorization(new Request(request.url,{
      method:'POST',headers:{origin:'https://customer.test','content-type':'application/json'},
      body:JSON.stringify({...body,padding:'x'.repeat(2200)}),
    }),authorize);
    assert.equal(oversized.status,413);assert.equal(calls,1);
  }finally{
    for(const [key,value] of Object.entries(original)){
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
});

test('finance migrations are disabled by default, server-only and close legacy distribution paths',async()=>{
  const core=await read('supabase/migrations/20261011215411_stage12_finance_core.sql');
  const gate=await read('supabase/migrations/20261011215509_stage12_finance_gate_lifecycle.sql');
  assert.match(core,/values\(1,'disabled','fake','sandbox'\)/i);
  assert.match(core,/revoke all on public\.finance_runtime_config[\s\S]*from public,anon,authenticated/i);
  assert.doesNotMatch(core,/^\s*(card_?number|cvv|cvc|pan)\s+/im);
  assert.match(core,/constraint trigger finance_ledger_balance_check/i);
  assert.match(core,/finance_transactions_append_only/i);
  assert.match(core,/grant select on public\.finance_runtime_config[\s\S]*to service_role/i);
  assert.match(core,/finance_ledger_transaction_intent_request_currency_fk/i);
  assert.match(gate,/service_distribution_cycles_finance_guard/i);
  assert.match(gate,/service_dispatches_finance_guard/i);
  assert.match(gate,/service_jobs_finance_distribution_guard/i);
  assert.match(gate,/Payment authorization required before distribution/i);
  assert.match(gate,/create_payment_pending_service_request_v2/i);
  assert.match(gate,/capture_finance_on_job_completion/i);
  assert.match(gate,/settle_finance_on_request_terminal/i);
  assert.match(gate,/from public,anon,authenticated/i);
});

test('server verifies customer ownership and test-account status before finance RPCs',async()=>{
  const server=await read('apps/customer/src/lib/finance/sandbox-finance-server.ts');
  assert.match(server,/requireRole\('customer'\)/);
  assert.match(server,/account\.is_test !== true/);
  assert.match(server,/request\.customer_id !== account\.id/);
  assert.match(server,/finance_gate_required !== true/);
  assert.match(server,/finance_record_reconciliation_issue/);
});
