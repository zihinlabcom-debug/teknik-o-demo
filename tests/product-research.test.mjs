import test from 'node:test';
import assert from 'node:assert/strict';
import {extractErrorRecords,normalizeFaultCode} from '../src/lib/error-record.ts';
import {extractModelScopes} from '../src/lib/model-scope.ts';
import {assessRecord,rankSources,canonicalSourceUrl,runManufacturerResearch} from '../src/lib/manufacturer-research-engine.ts';

for(const code of ['F.28','F28','E01','E02','EA','6A','A7','C6','501','5 01','5-01','5.01']) test(`general fault token ${code}`,()=>{
 const text=`Fault codes\n${code} | Fault indication\nCause: inlet closed\nZZ | Next fault\nCause: broken fan`;
 const [r]=extractErrorRecords(text,normalizeFaultCode(code));
 assert.ok(r);assert.equal(r.originalCode,code);assert.ok(r.causeSpans.some(s=>s.text.includes('inlet closed')));
 assert.ok(!r.text.includes('broken fan'));
});
test('code tokens do not admit page/figure/section numbers',()=>{
 for(const row of ['Page 27','Figure 27','27 | Part number','27. Installation dimensions'])
  assert.deepEqual(extractErrorRecords('Fault codes\n'+row,'27'),[]);
});
function assessment({reviewChanges={},candidateChanges={},model='MODEL X',cover='MODEL X 24 PLUS',code='6A'}={}) {
 const identity={brand:'Example',model,code};
 const text=cover+'\nFault codes\n6A | code flashing on screen\nCause: inlet closed\nA7 | Different fault\nCause: broken fan';
 const doc={url:'https://manufacturer.example/manual.pdf',text};
 const records=extractErrorRecords(text,'6A'),scopes=extractModelScopes(text,model);
 const selection={scopeId:scopes[0]?.id??'',recordId:records[0]?.id??'',candidates:[{name:'inlet closed',part:'',startSpan:'s0',endSpan:'s0',...candidateChanges}],questionIds:[]};
 const review={modelVerified:true,errorCodeVerified:true,descriptionVerified:false,reason:'Genuine record, generic display symptom',candidates:[{index:0,supported:true,reason:'Explicit same-record cause'}],...reviewChanges};
 return assessRecord(identity,doc,scopes,records,selection,review);
}
test('family cause is usable without a verified verbal description; metadata stays false',()=>{
 const result=assessment();assert.equal(result.status,'verified');
 assert.equal(result.verification.modelScope,'family');assert.equal(result.verification.descriptionVerified,false);
 assert.equal(result.knowledge.evidence.descriptionVerified,false);assert.equal(result.knowledge.meaning,'');
 assert.equal(result.knowledge.evidence.descriptionEvidence,'code flashing on screen');
 assert.equal(result.verification.manufacturerCandidateCount,1);
});
test('an explicit cause-only fault entry does not require an invented description',()=>{
 const text='MODEL X\nFault codes\n6A\nCause: inlet closed\nA7 | Other fault';
 const records=extractErrorRecords(text,'6A'),scopes=extractModelScopes(text,'MODEL X');
 assert.equal(records.length,1);assert.equal(records[0].description.text,'');
 const result=assessRecord({brand:'Example',model:'MODEL X',code:'6A'},{url:'https://x/manual.pdf',text},scopes,records,
 {scopeId:scopes[0].id,recordId:records[0].id,candidates:[{name:'inlet closed',part:'',startSpan:'s0',endSpan:'s0'}],questionIds:[]},
 {modelVerified:true,errorCodeVerified:true,descriptionVerified:false,reason:'Cause only entry',candidates:[{index:0,supported:true,reason:'Explicit cause'}]});
 assert.equal(result.status,'verified');assert.equal(result.knowledge.meaning,'');
});
test('family acceptance never converts a sibling variant into an exact match',()=>{
 assert.equal(assessment({model:'MODEL X 28'}).verification.manufacturerCandidateCount,0);
 assert.equal(assessment({model:'MODEL X 24 PLUS'}).verification.modelScope,'exact');
});
test('record code must match query even if semantic reviewer wrongly says yes',()=>{
 assert.notEqual(assessment({code:'A7'}).status,'verified');
});
test('unwritten cause and another record evidence never become manufacturer verified',()=>{
 assert.notEqual(assessment({reviewChanges:{candidates:[{index:0,supported:false,reason:'PCB is not in source'}]},candidateChanges:{name:'Kart arızası',part:'kart'}}).status,'verified');
 assert.notEqual(assessment({candidateChanges:{startSpan:'r-other-s0',endSpan:'r-other-s0'}}).status,'verified');
 assert.notEqual(assessment({reviewChanges:{errorCodeVerified:false}}).status,'verified');
});
test('TR then EN takes precedence over other languages and manual type',()=>{
 const sources=[{url:'https://x/it/installazione.pdf',title:'Italian installation manual'},
 {url:'https://x/en/service.pdf',title:'English service manual'},
 {url:'https://x/tr/user.pdf',title:'Türkçe kullanıcı kılavuzu'}];
 assert.deepEqual(rankSources(sources).map(s=>s.url),[sources[2].url,sources[1].url,sources[0].url]);
 // Explicit document language wins over the manufacturer's country hostname.
 const az={url:'https://x.com.tr/installation-manual-az.pdf',title:'Azerbaijani installation manual'};
 assert.equal(rankSources([az,sources[1]])[0].url,sources[1].url);
});
test('HTTP(S) fragment canonicalization preserves potentially meaningful query parameters',()=>{
 assert.equal(canonicalSourceUrl('https://EXAMPLE.com:443/manual.pdf#page=27'),'https://example.com/manual.pdf');
 assert.equal(canonicalSourceUrl('https://example.com/manual?id=1#top'),'https://example.com/manual?id=1');
 assert.equal(canonicalSourceUrl('javascript:alert(1)'),null);
});
test('navigation fragments are fetched and analyzed only once across discovery rounds',async()=>{
 const reads=[],calls=[];
 const client={responses:{create:async()=>({status:'completed',output:[],output_text:JSON.stringify({sources:['#top','#part','#other'].map(hash=>({url:'https://x/manual.pdf'+hash,title:'English user manual'}))})})},
 chat:{completions:{create:async request=>{
  calls.push(request);const input=JSON.parse(request.messages[1].content);
  const output=request.response_format.json_schema.name==='manufacturer_record_selection'
   ?{scopeId:input.scopes[0].id,recordId:'',candidates:[],questionIds:[]}
   :{modelVerified:true,errorCodeVerified:false,descriptionVerified:false,reason:'No record',candidates:[]};
  return {choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]};
 }}}};
 await runManufacturerResearch({brand:'Example',model:'MODEL X',code:'6A'},['x'],u=>u.startsWith('https://x/'),undefined,
 {client,readDocument:async url=>{reads.push(url);return {url,text:'MODEL X\nUser manual',links:[{url:'https://x/manual.pdf#again',title:'manual'}]};}});
 assert.deepEqual(reads,['https://x/manual.pdf']);assert.equal(calls.length,2);
});
for(const englishHasCause of [true,false])test(`foreign language is deferred until TR/EN alternatives are exhausted: ${englishHasCause}`,async()=>{
 const reads=[];let searches=0;
 const client={responses:{create:async()=>({status:'completed',output:[],output_text:JSON.stringify({sources:++searches===1
  ?[{url:'https://x/it/manual.pdf',title:'Italian installation manual'},{url:'https://x/tr/manual.pdf',title:'Turkish user manual'}]
  :[{url:'https://x/en/manual.pdf',title:'English installation manual'}]})})},
 chat:{completions:{create:async request=>{
  const input=JSON.parse(request.messages[1].content);
  const output=request.response_format.json_schema.name==='manufacturer_record_selection'
   ?{scopeId:input.scopes[0].id,recordId:input.records[0]?.id??'',candidates:input.records.length?[{name:'inlet closed',part:'',startSpan:'s0',endSpan:'s0'}]:[],questionIds:[]}
   :{modelVerified:true,errorCodeVerified:!!input.record,descriptionVerified:!!input.record,reason:'fixture',candidates:input.candidates.map((c,index)=>({index,supported:true,reason:'explicit cause'}))};
  return {choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]};
 }}}};
 const result=await runManufacturerResearch({brand:'Example',model:'MODEL X',code:'6A'},['x'],u=>u.startsWith('https://x/'),undefined,
 {client,readDocument:async url=>{reads.push(url);return {url,text:'MODEL X\n'+((url.includes('/en/')&&englishHasCause)||url.includes('/it/')?'Fault codes\n6A | Fault\nCause: inlet closed':'User manual')};}});
 assert.equal(result.status,'verified');
 assert.deepEqual(reads,englishHasCause?['https://x/tr/manual.pdf','https://x/en/manual.pdf']:['https://x/tr/manual.pdf','https://x/en/manual.pdf','https://x/it/manual.pdf']);
});
