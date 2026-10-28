import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

registerHooks({resolve(specifier,context,nextResolve){
  if(specifier==='server-only')return {url:'data:text/javascript,export%20{}',shortCircuit:true};
  return nextResolve(specifier,context);
}});
const {assertIyzicoStage12Enabled,isIyzicoSandboxPendingRequestMode,IyzicoStage12Error}=
  await import('../apps/customer/src/lib/finance/iyzico/iyzico-stage12-contract.ts');
const {assertSandboxEnabled,isSandboxPendingRequestMode,FinanceInputError}=
  await import('../apps/customer/src/lib/finance/sandbox-contract.ts');
const runtime={enabled:true,gateMode:'test_only',provider:'iyzico',environment:'sandbox'};
const env={STAGE12_IYZICO_SANDBOX_ENABLED:'true',APP_ENV:'staging',VERCEL_ENV:'preview',
  NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://ysbaycbflopdmzwfhhnc.supabase.co'};

test('T105: isolated test project permits explicitly enabled iyzico Sandbox in Preview',()=>{
  assert.doesNotThrow(()=>assertIyzicoStage12Enabled(env,runtime));
  assert.equal(isIyzicoSandboxPendingRequestMode(env),true);
});
test('T105: legacy Staging behavior remains permitted',()=>{
  assert.doesNotThrow(()=>assertIyzicoStage12Enabled({...env,
    NEXT_PUBLIC_SUPABASE_URL:'https://ygrvtndujbmeatexjdej.supabase.co'},runtime));
});
test('T105: explicit local development remains permitted without Vercel metadata',()=>{
  assert.doesNotThrow(()=>assertIyzicoStage12Enabled({...env,VERCEL_ENV:undefined,NODE_ENV:'development'},runtime));
});
for(const [name,overrides]of Object.entries({
  'Vercel Production':{VERCEL_ENV:'production'},
  'Production app':{APP_ENV:'production'},
  'unidentified production build':{VERCEL_ENV:undefined},
  'disabled flag':{STAGE12_IYZICO_SANDBOX_ENABLED:'false'},
  'absent flag':{STAGE12_IYZICO_SANDBOX_ENABLED:undefined},
  'unknown project':{NEXT_PUBLIC_SUPABASE_URL:'https://unknown.supabase.co'},
  'Production database':{NEXT_PUBLIC_SUPABASE_URL:'https://dvrjwsbfircyngjggdxx.supabase.co'},
  'lookalike host':{NEXT_PUBLIC_SUPABASE_URL:'https://ysbaycbflopdmzwfhhnc.supabase.co.example.invalid'},
  'HTTP test URL':{NEXT_PUBLIC_SUPABASE_URL:'http://ysbaycbflopdmzwfhhnc.supabase.co'},
  'credential-bearing test URL':{NEXT_PUBLIC_SUPABASE_URL:'https://not-a-secret@ysbaycbflopdmzwfhhnc.supabase.co'},
  'nonstandard port':{NEXT_PUBLIC_SUPABASE_URL:'https://ysbaycbflopdmzwfhhnc.supabase.co:444'},
  'missing URL':{NEXT_PUBLIC_SUPABASE_URL:undefined},
  'malformed URL':{NEXT_PUBLIC_SUPABASE_URL:'invalid'},
}))test(`T105: rejects ${name}`,()=>{
  assert.throws(()=>assertIyzicoStage12Enabled({...env,...overrides},runtime),
    error=>error instanceof IyzicoStage12Error&&error.code==='iyzico_stage12_disabled');
});
for(const [name,overrides]of Object.entries({disabled:{enabled:false},live:{environment:'production'},
  fake:{provider:'fake'},'wrong gate':{gateMode:'live'}}))
  test(`T105: new target still rejects database runtime ${name}`,()=>{
    assert.throws(()=>assertIyzicoStage12Enabled(env,{...runtime,...overrides}),IyzicoStage12Error);
  });
test('T105: fake finance remains forbidden on isolated test project even with explicit true flag',()=>{
  const fake={...env,STAGE12_FAKE_FINANCE_ENABLED:'true'};
  assert.throws(()=>assertSandboxEnabled(fake),
    error=>error instanceof FinanceInputError&&error.code==='sandbox_project_mismatch');
  assert.throws(()=>isSandboxPendingRequestMode(fake),FinanceInputError);
});
test('T105: fake finance is not activated by enabling iyzico',()=>{
  assert.equal(isSandboxPendingRequestMode(env),false);
  assert.equal(isSandboxPendingRequestMode({...env,STAGE12_FAKE_FINANCE_ENABLED:'false'}),false);
});
test('T105: legacy fake gate retains explicit flag and Production guards',()=>{
  const fake={...env,NEXT_PUBLIC_SUPABASE_URL:'https://ygrvtndujbmeatexjdej.supabase.co',
    STAGE12_FAKE_FINANCE_ENABLED:'true'};
  assert.doesNotThrow(()=>assertSandboxEnabled(fake));
  assert.throws(()=>assertSandboxEnabled({...fake,VERCEL_ENV:'production'}),FinanceInputError);
  assert.throws(()=>assertSandboxEnabled({...fake,STAGE12_FAKE_FINANCE_ENABLED:'false'}),FinanceInputError);
});
test('T105: disabled or absent iyzico flag never activates pending request mode',()=>{
  assert.equal(isIyzicoSandboxPendingRequestMode({...env,STAGE12_IYZICO_SANDBOX_ENABLED:'false'}),false);
  assert.equal(isIyzicoSandboxPendingRequestMode({...env,STAGE12_IYZICO_SANDBOX_ENABLED:undefined}),false);
});
