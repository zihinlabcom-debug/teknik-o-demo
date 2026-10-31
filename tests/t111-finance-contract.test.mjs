import test from 'node:test';import assert from 'node:assert/strict';
import {parseFinanceDecision} from '../src/lib/t111-contract.ts';
const id='11111111-1111-4111-8111-111111111111';
const valid=()=>({decision:'distribute',complaintId:id,reportVersion:id,reason:'Hizmet tamamlanması rapor ve kanıtlarla incelendi.',evidenceIds:[id],idempotencyKey:'t111-unique-key'});
test('finance decision requires explicit current report, complaint, reason and evidence',()=>assert.deepEqual(parseFinanceDecision(valid()),valid()));
for(const [label,patch]of Object.entries({legacy:{complaintId:undefined},reason:{reason:'kısa'},report:{reportVersion:null},staleShape:{reportVersion:'wrong'},evidence:{evidenceIds:[]},duplicate:{evidenceIds:[id,id]},extra:{adminId:id},key:{idempotencyKey:'short'},unknown:{decision:'capture'}}))test('finance input fails closed: '+label,()=>assert.throws(()=>parseFinanceDecision({...valid(),...patch})));
test('uncompleted cancellation review may refund without claiming a completion report',()=>assert.equal(parseFinanceDecision({...valid(),decision:'refund',reportVersion:null}).reportVersion,null));
