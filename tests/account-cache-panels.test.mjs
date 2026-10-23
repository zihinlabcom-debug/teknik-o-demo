import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {decodeHTML} from 'entities';
import {startFixture,fixtureHeaders} from './helpers/customer-account-cache-fixture.mjs';

for(const role of ['technician','admin']){
  test(`${role} account verification: real Next SSR and API isolation`,{timeout:240000},async t=>{
    const output=path.resolve('output',`t88-${role}-account-cache-${Date.now()}-${process.pid}`);fs.mkdirSync(output,{recursive:true});
    const fixture=await startFixture(output,role);t.after(()=>fixture.stop());let sequence=0;const evidence=[];
    async function read({mode='current',scenario='ok',actor='A',session='A',api=false}={}){
      const tag=`${role}-${++sequence}`;
      const response=await fetch(fixture.origin+(api?'/api/check':'/'),{headers:fixtureHeaders({role,tag,scenario,actor,mode,session}),signal:AbortSignal.timeout(30000)});
      assert.equal(response.status,200);const html=await response.text();
      const data=api?JSON.parse(html):JSON.parse(decodeHTML(html.match(/<pre id="result">([^]*?)<\/pre>/)?.[1]||'null'));
      assert.ok(data,'Real rendered fixture result is required');
      evidence.push({tag,mode,scenario,actor,session,kind:api?'route-handler':'server-render',...data});
      fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(evidence,null,2));return {data,html};
    }
    const commonDenied=['anonymous','auth-error','throw-auth','missing-row','db-error','invalid-role','inactive','invalid-test-flag','unconfirmed','missing-email'];
    const denied=role==='admin'?[...commonDenied,'missing-marker','inbound-marker-only','tampered-marker','expired-marker','future-marker','wrong-uid-marker','wrong-session-marker','missing-session','session-error','not-app-admin','admin-rpc-error','admin-rpc-throw','nonboolean-admin']:[...commonDenied,'not-ready','nonboolean-ready','ready-error','throw-ready'];
    await t.test('approved baseline and optimized authorization outcomes agree',async()=>{
      for(const scenario of ['ok','wrong-role',...denied]){
        const old=await read({mode:'baseline',scenario}),current=await read({scenario});
        assert.deepEqual(current.data.accounts,old.data.accounts,scenario);assert.equal(current.data.guardStatus,old.data.guardStatus,scenario);
      }
    });
    await t.test('layout, parallel, sequential and role checks share one render verification',async()=>{
      const old=await read({mode:'baseline'}),current=await read();
      assert.equal(old.data.counts.getUser,5);assert.equal(old.data.counts.users,5);assert.equal(current.data.counts.getUser,1);assert.equal(current.data.counts.users,1);
      assert.equal(current.data.guardStatus,200);assert.ok(current.data.accounts.every(a=>a.role===role));
      if(role==='admin'){
        assert.equal(old.data.counts.getSession,5);assert.equal(old.data.counts.isAppAdmin,5);
        assert.equal(current.data.counts.getSession,1);assert.equal(current.data.counts.isAppAdmin,1);assert.equal(current.data.counts.ready,0);
        assert.equal(current.data.counts.markerForwarded,true);assert.equal(current.data.counts.markerHeaderConsistent,true);assert.equal(current.data.counts.cookieHttpOnly,true);
      }else{assert.equal(old.data.counts.ready,5);assert.equal(current.data.counts.ready,1);}
    });
    await t.test('eight concurrent A/B HTTP requests retain actor and query ownership isolation',async()=>{
      const rows=await Promise.all(Array.from({length:8},(_,i)=>read({actor:i%2?'B':'A'})));
      for(let i=0;i<rows.length;i++){
        const id=i%2?'20000000-0000-4000-8000-000000000002':'10000000-0000-4000-8000-000000000001';
        assert.ok(rows[i].html.includes(`<div id="layout-account">${id}</div>`));assert.ok(rows[i].data.accounts.every(a=>a.id===id));
        assert.equal(rows[i].data.counts.getUser,1);assert.deepEqual(rows[i].data.counts.filters,[{column:'id',value:id}]);
        if(role==='admin')assert.equal(rows[i].data.counts.isAppAdmin,1);
      }
    });
    for(const scenario of denied)await t.test(`${scenario}: fails closed after prior successful render`,async()=>{
      const {data}=await read({scenario});assert.deepEqual(data.accounts,[null,null,null]);assert.equal(data.guardStatus,401);assert.equal(data.counts.getUser,1);
      if(role==='admin'&&['not-app-admin','admin-rpc-error','admin-rpc-throw','nonboolean-admin'].includes(scenario))assert.equal(data.counts.isAppAdmin,1);
      if(scenario==='inbound-marker-only'){assert.equal(data.counts.markerForwarded,false);assert.equal(data.counts.isAppAdmin,0);}
    });
    await t.test('wrong role is 403 and subsequent valid request revalidates',async()=>{
      const wrong=await read({scenario:'wrong-role'});assert.equal(wrong.data.guardStatus,403);assert.ok(wrong.data.accounts.every(a=>a.role==='customer'));
      const recovered=await read();assert.equal(recovered.data.guardStatus,200);assert.equal(recovered.data.counts.getUser,1);
    });
    await t.test('session changes and user switches do not reuse a previous HTTP result',async()=>{
      for(const input of [{session:'A'},{session:'B'},{actor:'B',session:'B'},{session:'A'}]){
        const {data}=await read(input);assert.equal(data.guardStatus,200);assert.equal(data.counts.getUser,1);
        assert.ok(data.accounts.every(a=>a.id===(input.actor==='B'?'20000000-0000-4000-8000-000000000002':'10000000-0000-4000-8000-000000000001')));
        if(role==='admin')assert.equal(data.counts.getSession,1);
      }
    });
    await t.test('Route Handler performs fresh authorization after in-request revocation',async()=>{
      for(const mode of ['baseline','current']){
        const {data}=await read({mode,api:true});assert.equal(data.first.role,role);assert.equal(data.second,null);assert.equal(data.counts.getUser,2);assert.equal(data.counts.users,1);
        if(role==='admin')assert.equal(data.counts.isAppAdmin,1);else assert.equal(data.counts.ready,1);
      }
    });
    console.log(JSON.stringify({role,fixtureOutput:output,requests:evidence.length,realNextRsc:true,externalSupabaseRequests:0,noLiveCredentials:true}));
  });
}
