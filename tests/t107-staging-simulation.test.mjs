import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){if(s==='server-only')return {url:'data:text/javascript,export%20{}',shortCircuit:true};return next(s,c);}});
const {assertSandboxEnabled}=await import('../apps/customer/src/lib/finance/sandbox-contract.ts');
const {assertIyzicoStage12Environment}=await import('../apps/customer/src/lib/finance/iyzico/iyzico-stage12-contract.ts');
const {parseIyzicoSandboxConfig}=await import('../apps/customer/src/lib/finance/iyzico/iyzico-config-contract.ts');
const {IyzicoHttpTransport,IYZICO_ENDPOINTS}=await import('../apps/customer/src/lib/finance/iyzico/iyzico-transport.ts');
const env={APP_ENV:'staging',VERCEL_ENV:'preview',NODE_ENV:'production',
 NEXT_PUBLIC_SUPABASE_URL:'https://ysbaycbflopdmzwfhhnc.supabase.co',
 STAGE12_FAKE_FINANCE_ENABLED:'true',T100_SIMULATION_ONLY:'true',
 STAGE12_IYZICO_SANDBOX_ENABLED:'false',T100_IYZICO_EXECUTION_ENABLED:'false'};
test('isolated TEST simulation requires explicit mutually exclusive flags',()=>assert.doesNotThrow(()=>assertSandboxEnabled(env)));
for(const [name,override] of Object.entries({production:{VERCEL_ENV:'production'},app:{APP_ENV:'production'},
 disabled:{STAGE12_FAKE_FINANCE_ENABLED:'false'},implicit:{T100_SIMULATION_ONLY:undefined},
 provider:{STAGE12_IYZICO_SANDBOX_ENABLED:'true'},execution:{T100_IYZICO_EXECUTION_ENABLED:'true'},
 missingProviderFlag:{STAGE12_IYZICO_SANDBOX_ENABLED:undefined},
 legacy:{NEXT_PUBLIC_SUPABASE_URL:'https://ygrvtndujbmeatexjdej.supabase.co'},
 unknown:{NEXT_PUBLIC_SUPABASE_URL:'https://unknown.supabase.co'},
 live:{NEXT_PUBLIC_SUPABASE_URL:'https://dvrjwsbfircyngjggdxx.supabase.co'},
 insecure:{NEXT_PUBLIC_SUPABASE_URL:'http://ysbaycbflopdmzwfhhnc.supabase.co'},
 credentials:{NEXT_PUBLIC_SUPABASE_URL:'https://user@ysbaycbflopdmzwfhhnc.supabase.co'},
 path:{NEXT_PUBLIC_SUPABASE_URL:'https://ysbaycbflopdmzwfhhnc.supabase.co/other'}}))
 test(`simulation rejects ${name}`,()=>assert.throws(()=>assertSandboxEnabled({...env,...override})));
test('simulation blocks provider environment and credential loading',()=>{
 assert.throws(()=>assertIyzicoStage12Environment({...env,STAGE12_IYZICO_SANDBOX_ENABLED:'true'}),e=>e.code==='iyzico_simulation_only');
 assert.throws(()=>parseIyzicoSandboxConfig(env),e=>e.code==='iyzico_simulation_only');
});
test('every provider HTTP operation is blocked before signing or fetching',async()=>{
 const config=parseIyzicoSandboxConfig({IYZICO_SANDBOX_API_KEY:'sandbox-unit-test-key',IYZICO_SANDBOX_SECRET_KEY:'sandbox-unit-test-secret'});
 let calls=0;const transport=new IyzicoHttpTransport(config,async()=>{calls++;throw Error('must_not_fetch');},()=>{calls++;throw Error('must_not_sign');});
 const before=process.env.T100_SIMULATION_ONLY;
 try{process.env.T100_SIMULATION_ONLY='true';for(const path of Object.values(IYZICO_ENDPOINTS))
  await assert.rejects(transport.post(path,{}),e=>e.code==='iyzico_simulation_only');assert.equal(calls,0);
 }finally{if(before===undefined)delete process.env.T100_SIMULATION_ONLY;else process.env.T100_SIMULATION_ONLY=before;}
});
