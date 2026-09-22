import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResearchJson, parseManualDiscovery } from '../src/lib/research-json.ts';
import { researchManufacturer } from '../src/lib/technical-research.ts';

const identity={brand:'Vaillant',model:'ecoTEC intro',code:'F.28'};
const url='https://www.vaillant.com.tr/downloads/example.pdf';
const discovery={url,title:'ecoTEC intro'};
const report={status:'verified',...identity,modelMatch:true,codeMatch:true,officialManufacturer:true,
  meaning:'Ateşleme başarısız',title:'ecoTEC intro',revision:'test',page:31,
  modelScope:'exact',coveredModels:['ecoTEC intro'],descriptionEvidence:'Ateşleme başarısız',errorRecord:'F.28 Ateşleme başarısız\nGaz vanası kapalı',modelEvidence:'ecoTEC intro',codeEvidence:'F.28 Ateşleme başarısız',
  candidates:[{name:'Gaz beslemesi',basis:'Gaz vanası kapalı',part:''}],questionIds:['gasSupply','ignitionSound']};
const document={url,text:'ecoTEC intro\nF.28 Ateşleme başarısız\nGaz vanası kapalı'};

function fixture(discoveryText, verificationText=JSON.stringify(report), options={}) {
  let reads=0,verifications=0;
  const client={responses:{create:async request=>{
    assert.equal(request.text.format.type,'json_schema');
    assert.equal(request.text.format.strict,true);
    return {status:options.status??'completed',output:options.output??[],output_text:discoveryText};
  }},chat:{completions:{create:async request=>{
    if(request.response_format.json_schema.name==='manufacturer_evidence_review') return {choices:[{finish_reason:'stop',message:{content:JSON.stringify(options.review??{modelScopeSupported:true,faultRecordSupported:true,reason:'fixture',candidates:[{index:0,supported:true,reason:'explicit cause'}]})}}]};
    verifications++;
    return {choices:[{finish_reason:options.finishReason??'stop',message:{content:verificationText,refusal:options.refusal}}]};
  }}}};
  return {dependencies:{client,readDocument:async()=>{reads++;return options.document??document;}},
    counts:()=>({reads,verifications})};
}

test('regression: Here is the JSON and Markdown fences do not throw or alter the object',()=>{
  const json=JSON.stringify(discovery);
  for(const content of [json,`\uFEFF${json}`,`\x60\x60\x60json\n${json}\n\x60\x60\x60`,
    `Here is the JSON:\n\x60\x60\x60json\n${json}\n\x60\x60\x60\nThis is the official manual.`,
    `Here is the result: ${json}\nEnd.`]) assert.deepEqual(parseManualDiscovery(content),discovery);
  const escaped={url,title:'A "quote" and {braces} \\ path',nested:{list:[1,{a:'}'}]}};
  assert.deepEqual(parseResearchJson(`Here is the JSON: ${JSON.stringify(escaped)}`),escaped);
});

test('malformed, ambiguous, wrong-schema and truncated outputs are not repaired or accepted',()=>{
  const json=JSON.stringify(discovery);
  for(const content of ['',null,'Here is the manual, no JSON.',`Here is ${json.slice(0,-1)}`,
    `Here is ${json} ${json}`,`Here is [${json}]`,'null','42','{"url":undefined}',
    '{"url":7,"title":"Manual"}','{"url":"https://example.com"}',
    '{"url":"","title":"","status":"verified"}']) assert.equal(parseManualDiscovery(content),null);
});

test('wrapped discovery and verification require a downloaded matching manufacturer document',async()=>{
  const f=fixture(`Here is the JSON:\n\x60\x60\x60json\n${JSON.stringify(discovery)}\n\x60\x60\x60`,
    `Here is the report: ${JSON.stringify(report)}`);
  const result=await researchManufacturer(identity,undefined,f.dependencies);
  assert.equal(result.status,'verified');
  assert.deepEqual(f.counts(),{reads:1,verifications:1});
  assert.deepEqual(result.knowledge.causes,['Gaz beslemesi']);
});

test('invalid discovery never falls back to a manual hint or reaches document verification',async()=>{
  for(const content of ['Here is the answer','{"url":','{"url":true,"title":"manual"}']) {
    const f=fixture(content);
    assert.equal((await researchManufacturer(identity,undefined,f.dependencies)).status,'unavailable');
    assert.deepEqual(f.counts(),{reads:0,verifications:0});
  }
});

test('a failed discovery URL continues to the next independently discovered source',async()=>{
  const f=fixture(JSON.stringify({sources:[discovery,{url:'https://www.vaillant.com.tr/second.pdf',title:'second'}]}));
  let attempts=0;
  f.dependencies.readDocument=async(location,allowed)=>{
    attempts++;
    assert.equal(allowed(location),true);
    if(attempts===1) throw Error('404');
    return {...document,url:location};
  };
  assert.equal((await researchManufacturer(identity,undefined,f.dependencies)).status,'verified');
  assert.equal(attempts,2);
  f.dependencies.readDocument=async()=>{throw Error('404');};
  assert.notEqual((await researchManufacturer(identity,undefined,f.dependencies)).status,'verified');
});

test('a parseable report with invalid field types or extra fields does not become verified',async()=>{
  for(const changes of [{title:null},{page:'31'},{questionIds:['gasSupply','invented']},{modelMatch:'true'},
    {extra:'unexpected'},{candidates:[{name:'Gaz beslemesi',basis:'Gaz vanası kapalı',part:12}]}]) {
    const f=fixture(JSON.stringify(discovery),JSON.stringify({...report,...changes}));
    assert.notEqual((await researchManufacturer(identity,undefined,f.dependencies)).status,'verified');
  }
});

test('refusals, incomplete generations, invalid reports and unsupported quotes cannot verify a pool',async()=>{
  const json=JSON.stringify(discovery);
  for(const options of [{status:'incomplete'},{output:[{type:'message',content:[{type:'refusal',refusal:'No'}]}]}]) {
    const f=fixture(json,undefined,options);
    assert.equal((await researchManufacturer(identity,undefined,f.dependencies)).status,'unavailable');
    assert.equal(f.counts().reads,0);
  }
  for(const [text,options] of [['Here is invalid JSON',{}],[JSON.stringify(report),{finishReason:'length'}],
    [JSON.stringify(report),{refusal:'No'}],[JSON.stringify({...report,candidates:[null]}),{}],
    [JSON.stringify({...report,candidates:[{name:'Kart',basis:'Uydurulmuş neden',part:'kart'}]}),{}],
    [JSON.stringify(report),{document:{url,text:'Another model F.28'}}]]) {
    const f=fixture(json,text,options);
    assert.notEqual((await researchManufacturer(identity,undefined,f.dependencies)).status,'verified');
  }
});

test('a reachable first PDF without the code does not end discovery',async()=>{
  const f=fixture(JSON.stringify({sources:[discovery,{url:'https://www.vaillant.com.tr/next.pdf',title:'service'}]}));
  let reads=0;
  f.dependencies.readDocument=async location=>++reads===1?{url:location,text:'ecoTEC intro\nUser manual without a fault table'}:{...document,url:location};
  assert.equal((await researchManufacturer(identity,undefined,f.dependencies)).status,'verified');
  assert.equal(reads,2);
});
test('description-only records produce no verified manufacturer pool',async()=>{
  const raw={...report,candidates:[]};
  const f=fixture(JSON.stringify(discovery),JSON.stringify(raw),{review:{modelScopeSupported:true,faultRecordSupported:true,reason:'description only',candidates:[]}});
  const result=await researchManufacturer(identity,undefined,f.dependencies);
  assert.equal(result.status,'description_only');
  assert.equal(result.knowledge,undefined);
});
test('a literal quote does not bypass candidate entailment or numeric fault-context checks',async()=>{
  for(const review of [
    {modelScopeSupported:true,faultRecordSupported:true,reason:'unsupported inference',candidates:[{index:0,supported:false,reason:'a closed valve does not imply PCB failure'}]},
    {modelScopeSupported:true,faultRecordSupported:false,reason:'figure number, not a fault record',candidates:[{index:0,supported:true,reason:'literal'}]},
    {modelScopeSupported:false,faultRecordSupported:true,reason:'variant not covered',candidates:[{index:0,supported:true,reason:'literal'}]},
    {modelScopeSupported:true,faultRecordSupported:true,reason:'missing candidate decision',candidates:[]},
  ]) {
    const f=fixture(JSON.stringify(discovery),JSON.stringify(report),{review});
    assert.notEqual((await researchManufacturer(identity,undefined,f.dependencies)).status,'verified');
  }
});
