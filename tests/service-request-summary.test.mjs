import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import './register-typescript.mjs';
const {decodeConversationState}=await import('../src/lib/service-conversation.ts');
const {serviceRequestSummary}=await import('../src/lib/service-request-summary.ts');

const key='stage2-summary-offline-secret';
function signedState(category,final,extra={}){
  const saved=process.env.DIAGNOSIS_STATE_SECRET;
  process.env.DIAGNOSIS_STATE_SECRET=key;
  try{
    const state={version:1,customerId:'customer-a',category,boilerStateToken:null,
      categoryState:null,answeredQuestionKeys:[],pendingQuestionKey:null,lastTurnId:null,lastResponse:final,...extra};
    const body=Buffer.from(JSON.stringify({state,expires:Date.now()+60_000})).toString('base64url');
    const mac=createHmac('sha256',key).update('service-v1:'+body).digest('base64url');
    return decodeConversationState(`service.${body}.${mac}`);
  }finally{
    if(saved===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;
    else process.env.DIAGNOSIS_STATE_SECRET=saved;
  }
}

test('priced painting request describes signed calculated scope, not a generic or client title',()=>{
  const state=signedState('painting',{resultState:'priced',assessmentComplete:true,
    paintingQuote:{wallAreaM2:120,ceilingAreaM2:40},faultTitle:null},
    {paintingServiceType:'wall_painting',clientTitle:'İstemcinin başlığı',clientDescription:'Serbest metin'});
  const summary=serviceRequestSummary(state);
  assert.equal(summary.issueTitle,'Duvar Boyama');
  assert.match(summary.problemDescription,/120 m² hesaplanan duvar alanı/);
  assert.match(summary.problemDescription,/40 m² tavan alanı/);
  assert.doesNotMatch(JSON.stringify(summary),/Hizmet talebi|İstemcinin|Serbest metin/);
});

test('painting manual review states the known scope without inventing a price',()=>{
  const summary=serviceRequestSummary(signedState('painting',
    {resultState:'painting_manual_review',assessmentComplete:true,paintingQuote:null},
    {paintingServiceType:'wall_painting'}));
  assert.match(summary.issueTitle,/yerinde inceleme/);
  assert.match(summary.problemDescription,/ciddi sıva veya derin hasar/);
});

test('boiler uses a source-backed part as an assessment, never as a confirmed fault',()=>{
  const backed=serviceRequestSummary(signedState('boiler',{assessmentComplete:true,isReadyForPrice:true,
    faultTitle:'Gaz armatürü',priceSource:{title:'Gaz armatürü'},technicalSource:{url:'https://example.com/manual.pdf'}}));
  assert.match(backed.issueTitle,/Gaz armatürü/);
  assert.match(backed.problemDescription,/Kesin arıza yerinde doğrulanmalıdır/);
  const unbacked=serviceRequestSummary(signedState('boiler',{assessmentComplete:true,
    faultTitle:'Gaz armatürü',diagnosticEvidence:[{quote:'Müşterinin özel açıklaması'}]}));
  assert.deepEqual(unbacked,{issueTitle:'Kombi servis talebi',problemDescription:'Kombi servis talebi'});
});

test('cleaning summaries use known signed configuration, not raw conversation history',()=>{
  const home=serviceRequestSummary(signedState('cleaning',{assessmentComplete:true},
    {cleaningState:{serviceType:'home_cleaning',home:{fields:{areaM2:200,rooms:3,bathrooms:2}}},
      pendingCategoryHistory:[{role:'user',content:'Özel müşteri notu'}]}));
  assert.equal(home.issueTitle,'Ev Temizliği');
  assert.match(home.problemDescription,/200 m²; 3 oda; 2 banyo/);
  assert.doesNotMatch(home.problemDescription,/Özel müşteri notu/);
  const sofa=serviceRequestSummary(signedState('sofa_cleaning',{assessmentComplete:true},
    {cleaningState:{serviceType:'upholstery_cleaning',upholstery:{items:[{key:'sofa_3',quantity:2}]}}}));
  assert.match(sofa.problemDescription,/2 adet 3'lü koltuk/);
});

test('request summary respects RPC title and description limits',()=>{
  const items=Array.from({length:500},()=>({key:'acrylic',areasM2:[5]}));
  const summary=serviceRequestSummary(signedState('carpet_cleaning',{assessmentComplete:true},
    {cleaningState:{serviceType:'carpet_cleaning',carpet:{items}}}));
  assert.ok(Array.from(summary.issueTitle).length<=240);
  assert.ok(Array.from(summary.problemDescription).length<=4000);
});
