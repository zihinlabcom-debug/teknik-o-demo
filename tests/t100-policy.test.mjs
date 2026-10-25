import test from 'node:test';
import assert from 'node:assert/strict';
import {minorAmount,splitApprovedPrice,cancellationPolicy,reportCompletion,completionDecision,simulateDistribution} from '../src/lib/t100-policy.ts';
const now='2026-10-25T12:00:00.000Z';
const scope={requestId:'r',customerId:'c',jobId:'j',technicianId:'t',jobStatus:'assigned',requestStatus:'created',amountMinor:300000,appointments:[]};
const actor={id:'c',role:'customer'},tech={id:'t',role:'technician'};
const appointment=(startsAt)=>({id:'a',jobId:'j',status:'confirmed',startsAt});
for(const [price,techShare] of [[1,1],[5,4],[80,56],[304175,212923],[500000,350000],[999999999999,699999999999]]){
 test('70/30 integer share '+price,()=>{const p=splitApprovedPrice(price);assert.equal(p.technicianMinor,techShare);assert.equal(p.platformMinor,price-techShare);assert.equal(p.bankTransfer,false);});
}
test('all cent amounts preserve total and positive-half rounding',()=>{for(let n=1;n<100000;n++){const s=splitApprovedPrice(n);assert.equal(s.technicianMinor+s.platformMinor,n);assert.equal(s.technicianMinor,Math.floor((n*70+50)/100));}});
for(const invalid of [-1,0,NaN,Infinity,1.2,Number.MAX_SAFE_INTEGER])test('invalid share '+invalid,()=>assert.throws(()=>splitApprovedPrice(invalid)));
for(const [s,minor] of [['0',0],['80.01',8001],['3041.75',304175]])test('decimal amount '+s,()=>assert.equal(minorAmount(s),minor));
for(const s of ['1e3','1.001','-1',' 1','1,00'])test('invalid decimal '+s,()=>assert.throws(()=>minorAmount(s)));
test('no appointment free cancellation',()=>assert.equal(cancellationPolicy(scope,actor,now).feeMinor,0));
for(const amount of [8000,50000,300000])test('fee capped at service price '+amount,()=>assert.equal(cancellationPolicy({...scope,amountMinor:amount,appointments:[appointment('2026-10-25T12:00:01Z')]},actor,now).feeMinor,Math.min(10000,amount)));
test('in_progress does not change future appointment fee',()=>assert.equal(cancellationPolicy({...scope,jobStatus:'in_progress',appointments:[appointment('2026-10-25T12:00:01Z')]},actor,now).feeMinor,10000));
for(const start of [now,'2026-10-25T11:59:59Z'])test('at or after start review '+start,()=>{const s={...scope,appointments:[appointment(start)]};assert.equal(cancellationPolicy(s,actor,now).action,'review');assert.equal(cancellationPolicy(s,tech,now).points,10);});
test('technician before appointment five points',()=>assert.equal(cancellationPolicy(scope,tech,now).points,5));
test('old and cancelled appointments ignored',()=>assert.equal(cancellationPolicy({...scope,appointments:[{...appointment(now),jobId:'old'},{...appointment(now),status:'cancelled'}]},actor,now).feeMinor,0));
test('ambiguous active appointments fail closed',()=>assert.throws(()=>cancellationPolicy({...scope,appointments:[appointment(now),appointment(now)]},actor,now)));
for(const status of ['completed','cancelled'])test('terminal job '+status,()=>assert.equal(cancellationPolicy({...scope,jobStatus:status,requestStatus:status},actor,now).action,'closed'));
for(const a of [{id:'other',role:'customer'},{id:'oldtech',role:'technician'},{id:'admin',role:'admin'}])test('wrong owner '+a.id,()=>assert.throws(()=>cancellationPolicy(scope,a,now)));
test('report retry preserves original deadline',()=>{const s=reportCompletion(null,'j','t',now);assert.strictEqual(reportCompletion(s,'j','t','2026-10-26T00:00:00Z'),s);assert.equal(s.deadline,'2026-10-25T13:00:00.000Z');});
test('no survives form navigation and timeout',()=>{const s=completionDecision(reportCompletion(null,'j','t',now),'no',now);assert.throws(()=>completionDecision(s,'timeout','2026-10-25T13:01:00Z'));assert.throws(()=>completionDecision(s,'yes',now));assert.equal(completionDecision(s,'admin_refund',now).source,'admin_refund');});
test('timeout not before deadline',()=>assert.throws(()=>completionDecision(reportCompletion(null,'j','t',now),'timeout',now)));
test('yes and timeout separate causes',()=>{const s=reportCompletion(null,'j','t',now);assert.equal(completionDecision(s,'yes',now).source,'customer_yes');assert.equal(completionDecision(s,'timeout',s.deadline).source,'timeout');});
test('resolution mutually exclusive',()=>{const s=completionDecision(reportCompletion(null,'j','t',now),'yes',now);assert.throws(()=>completionDecision(s,'admin_refund',now));assert.throws(()=>completionDecision(s,'no',now));});
test('unverified provider creates no distribution',()=>{for(const providerOutcome of ['declined','unknown'])assert.throws(()=>simulateDistribution({amountMinor:500000,purpose:'service',providerOutcome,coreApplied:false}));assert.throws(()=>simulateDistribution({amountMinor:500000,purpose:'service',providerOutcome:'succeeded',coreApplied:false}));});
test('verified service distribution simulation',()=>assert.deepEqual(simulateDistribution({amountMinor:500000,purpose:'service',providerOutcome:'succeeded',coreApplied:true}),{amountMinor:500000,technicianMinor:350000,platformMinor:150000,mode:'simulation',bankTransfer:false}));
test('cancellation fee exclusively platform',()=>{const p=simulateDistribution({amountMinor:8000,purpose:'cancellation_fee',providerOutcome:'succeeded',coreApplied:true});assert.equal(p.technicianMinor,0);assert.equal(p.platformMinor,8000);});
test('full refund creates no entitlement',()=>{const p=simulateDistribution({amountMinor:500000,purpose:'refund',providerOutcome:'succeeded',coreApplied:true});assert.equal(p.technicianMinor,0);assert.equal(p.platformMinor,0);});

for(const answer of ['yes','no'])test('late '+answer+' is timeout, not explicit customer approval or a new review',()=>{const initial=reportCompletion(null,'j','t',now);const result=completionDecision(initial,answer,initial.deadline);assert.equal(result.source,'timeout');assert.equal(result.response,'pending');});

test('cancelled old assignment does not close customer cancellation while request is redistributing',()=>assert.equal(cancellationPolicy({...scope,jobStatus:'cancelled',appointments:[appointment(now)]},actor,now).feeMinor,0));
