import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {decodeHTML} from 'entities';
import {startFixture} from './helpers/customer-account-cache-fixture.mjs';

test('customer account verification: real Next SSR request isolation and fail-closed regressions',{timeout:240000},async t=>{
  const output=path.resolve('output',`t88-account-cache-regression-${Date.now()}-${process.pid}`);fs.mkdirSync(output,{recursive:true});
  const fixture=await startFixture(output);t.after(()=>fixture.stop());
  const evidence=[];let sequence=0;
  async function read({mode='current',scenario='ok',actor='A',api=false}={}){
    const tag=`fixture-${++sequence}`;
    const start=performance.now();
    const response=await fetch(fixture.origin+(api?'/api/check':'/'),{headers:{cookie:`fixture-run=${tag}; fixture-mode=${mode}; fixture-case=${scenario}; fixture-user=${actor}`},signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200);
    const html=await response.text();
    const data=api?JSON.parse(html):JSON.parse(decodeHTML(html.match(/<pre id="result">([^]*?)<\/pre>/)?.[1]||'null'));
    assert.ok(data,'Fixture result must exist, not a login shell or error fallback');
    const item={tag,mode,scenario,actor,kind:api?'route-handler':'server-render',fullResponseMs:performance.now()-start,...data};
    evidence.push(item);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(evidence,null,2));
    return {data,html};
  }
  await t.test('authorization outcomes match the approved baseline across allowed and rejected accounts',async()=>{
    for(const scenario of ['ok','inactive','wrong-role','unconfirmed','not-ready','ready-error','admin']){
      const old=await read({mode:'baseline',scenario}),current=await read({scenario});
      assert.deepEqual(current.data.accounts,old.data.accounts,scenario);
      assert.equal(current.data.guardStatus,old.data.guardStatus,scenario);
    }
  });
  await t.test('one RSC render coalesces layout, parallel, sequential and requireRole checks',async()=>{
    const old=await read({mode:'baseline'}),current=await read();
    assert.equal(old.data.counts.getUser,5);assert.equal(old.data.counts.users,5);assert.equal(old.data.counts.ready,5);
    assert.equal(current.data.counts.getUser,1);assert.equal(current.data.counts.users,1);assert.equal(current.data.counts.ready,1);
    assert.deepEqual(current.data.accounts,old.data.accounts);assert.equal(current.data.guardStatus,200);
  });
  await t.test('separate requests and concurrent A/B users get fresh, owner-scoped results',async()=>{
    const rows=await Promise.all(Array.from({length:8},(_,i)=>read({actor:i%2?'B':'A'})));
    for(let i=0;i<rows.length;i++){const id=i%2?'20000000-0000-4000-8000-000000000002':'10000000-0000-4000-8000-000000000001';
      assert.ok(rows[i].html.includes(`<div id="layout-account">${id}</div>`));
      assert.ok(rows[i].data.accounts.every(a=>a.id===id));assert.equal(rows[i].data.counts.getUser,1);assert.equal(rows[i].data.counts.ready,1);
      assert.deepEqual(rows[i].data.counts.filters,[{column:'id',value:id}]);}
  });
  for(const scenario of ['anonymous','auth-error','throw-auth','missing-row','db-error','invalid-role','inactive','invalid-test-flag','unconfirmed','missing-email','not-ready','nonboolean-ready','ready-error','throw-ready','admin']){
    await t.test(`${scenario}: authorization fails closed and is not rescued by an earlier successful request`,async()=>{
      const {data}=await read({scenario});assert.deepEqual(data.accounts,[null,null,null]);assert.equal(data.guardStatus,401);assert.equal(data.counts.getUser,1);
    });
  }
  await t.test('role changes remain forbidden and recovery/new session are reverified',async()=>{
    const wrong=await read({scenario:'wrong-role'});assert.equal(wrong.data.guardStatus,403);assert.ok(wrong.data.accounts.every(a=>a.role==='technician'));
    const recovered=await read();assert.equal(recovered.data.guardStatus,200);assert.equal(recovered.data.counts.getUser,1);
    const switched=await read({actor:'B'});assert.ok(switched.data.accounts.every(a=>a.id==='20000000-0000-4000-8000-000000000002'));
  });
  await t.test('outside RSC a Route Handler revalidates after revocation within the same request',async()=>{
    for(const mode of ['baseline','current']){const {data}=await read({api:true,mode});assert.equal(data.first.role,'customer');assert.equal(data.second,null);assert.equal(data.counts.getUser,2);assert.equal(data.counts.users,1);}
  });
  await t.test('five local response samples per version keep before/after observations without claiming Preview gains',async()=>{
    for(let i=0;i<5;i++)for(const mode of ['baseline','current']){const {data}=await read({mode});assert.equal(data.guardStatus,200);assert.equal(data.counts.getUser,mode==='baseline'?5:1);}
  });
  console.log(JSON.stringify({fixtureOutput:output,requests:evidence.length,realNextRsc:true,externalSupabaseRequests:0,scope:'synthetic users, mocked I/O, real React cache and Next HTTP rendering; not Preview LCP'}));
});
