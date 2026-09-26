import test from 'node:test';
import assert from 'node:assert/strict';
import {extractErrorRecords} from '../src/lib/error-record.ts';
import {extractModelScopes} from '../src/lib/model-scope.ts';
import {assessRecord,rankSources} from '../src/lib/manufacturer-research-engine.ts';
const identity={brand:'Example',model:'MODEL X',code:'501'};
const text='MODEL X\nFault codes\nMancanza fiamma | 5 01\n502 | Other failure';
const document={url:'https://manufacturer.example/manual.pdf',text};
const scopes=extractModelScopes(text,identity.model),records=extractErrorRecords(text,identity.code);
const selection={scopeId:scopes[0].id,recordId:records[0].id,candidates:[],questionIds:['gasSupply']};
const review={modelVerified:true,errorCodeVerified:true,descriptionVerified:true,reason:'same fault row',candidates:[]};
test('description verification is retained without manufacturer causes',()=>{
 const r=assessRecord(identity,document,scopes,records,selection,review);
 assert.equal(r.status,'description_only');
 assert.deepEqual(r.verification,{sourceVerified:true,modelVerified:true,modelScope:'exact',coveredModels:['MODEL X'],errorCodeVerified:true,descriptionVerified:true,manufacturerCausesVerified:false,manufacturerCandidateCount:0});
 assert.equal(r.description,'Mancanza fiamma');
});
test('generic meaning cannot produce a part candidate even if a model claims support',()=>{
 const r=assessRecord(identity,document,scopes,records,{...selection,candidates:[{name:'PCB failure',part:'PCB',startSpan:'description',endSpan:'description'}]},
 {...review,candidates:[{index:0,supported:true,reason:'hallucination'}]});
 assert.equal(r.status,'description_only');assert.equal(r.verification.manufacturerCandidateCount,0);
});
test('candidate references cannot escape their selected record',()=>{
 const doc={...document,text:'MODEL X\nError codes\n501 | No flame\nCause: valve closed\n502 | Overheat\nCause: broken fan'};
 const rs=extractErrorRecords(doc.text,'501');
 const r=assessRecord(identity,doc,scopes,rs,{...selection,recordId:rs[0].id,candidates:[{name:'Fan failure',part:'fan',startSpan:'s900',endSpan:'s901'}]},
 {...review,candidates:[{index:0,supported:true,reason:'wrong row'}]});
 assert.equal(r.verification.manufacturerCandidateCount,0);
});
test('source ranking prioritizes service, user, support and family resources',()=>{
 assert.deepEqual(rankSources([{url:'https://x/family',title:'Model family technical document'}, {url:'https://x/support',title:'Fault code support'},
 {url:'https://x/user.pdf',title:'User manual'},{url:'https://x/service.pdf',title:'Installation service manual'}]).map(s=>s.url),
 ['https://x/service.pdf','https://x/user.pdf','https://x/support','https://x/family']);
});
