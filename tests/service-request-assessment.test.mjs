import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {diagnosePainting} from '../src/lib/painting-engine.ts';
import {decodeConversationState} from '../src/lib/service-conversation.ts';
import {encodeBoilerState} from '../src/lib/boiler-diagnosis.ts';
import {serviceRequestAssessment} from '../src/lib/service-request-assessment.ts';
import {assessmentDetailRows} from '../src/lib/service-request-assessment-display.ts';

const old=process.env.DIAGNOSIS_STATE_SECRET;
process.env.DIAGNOSIS_STATE_SECRET='assessment-snapshot-offline-secret';
const signed=state=>{
 const body=Buffer.from(JSON.stringify({state,expires:Date.now()+60000})).toString('base64url');
 const mac=createHmac('sha256',process.env.DIAGNOSIS_STATE_SECRET).update('service-v1:'+body).digest('base64url');
 return `service.${body}.${mac}`;
};
const conversation=(category,overrides={})=>({
 version:1,customerId:'customer-1',category,boilerStateToken:null,paintingStateToken:null,
 paintingServiceType:null,cleaningState:null,categoryState:null,answeredQuestionKeys:[],
 pendingQuestionKey:null,lastTurnId:null,lastResponse:{assessmentComplete:true,resultState:'priced'},
 pendingCategoryHistory:[{role:'user',content:'raw chat should never be stored'}],...overrides,
});
const verified=state=>decodeConversationState(signed(state));
test.after(()=>{if(old===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=old;});

test('painting snapshot copies every signed customer selection, DYO identity and wall calculation, never raw history',async()=>{
 let result=await diagnosePainting('Boya hizmeti istiyorum',[],null);
 for(const answer of ['Komple ev','100 m²','3','Eşyalı','Standart — 2,50 m','Duvarlar ve tavan',
  'Eski boyalı','Geniş alan macun düzeltmesi var','10 m²','Koyu','Açık',
  'Silikonlu mat','DYO renk kataloğundan seç','DYO renk kodu: 6269'])
  result=await diagnosePainting(answer,[],result.stateToken);
 assert.equal(result.resultState,'priced');
 const state=verified(conversation('painting',{paintingServiceType:'wall_painting',
  paintingStateToken:result.stateToken,lastResponse:result}));
 const snapshot=serviceRequestAssessment(state);
 assert.equal(snapshot.schemaVersion,1);
 assert.equal(snapshot.selections.scopeType,'complete_home');
 assert.equal(snapshot.selections.netAreaM2,100);
 assert.equal(snapshot.selections.paintedRoomCount,3);
 assert.equal(snapshot.selections.furnished,true);
 assert.equal(snapshot.selections.ceilingHeightM,2.5);
 assert.equal(snapshot.selections.ceilingHeightMode,'standard');
 assert.equal(snapshot.selections.paintWalls,true);
 assert.equal(snapshot.selections.paintCeiling,true);
 assert.equal(snapshot.selections.surfaceType,'old_painted');
 assert.equal(snapshot.selections.repairStatus,'wide_putty');
 assert.equal(snapshot.selections.extraPuttyM2,10);
 assert.equal(snapshot.selections.oldColorTone,'dark');
 assert.equal(snapshot.selections.newColorTone,'light');
 assert.equal(snapshot.selections.paintType,'silicone_matte');
 assert.equal(snapshot.selections.paintBrand,'DYO');
 assert.equal(snapshot.selections.colorCode,'6269');
 assert.equal(snapshot.selections.colorName,'DENİZ ATI');
 assert.equal(snapshot.selections.colorSelectionSource,'dyo_catalog');
 assert.equal(snapshot.colorPreviewHex,'#DAE5E4');
 assert.equal(snapshot.calculation.wallAreaM2,300);
 assert.equal(snapshot.calculation.ceilingAreaM2,100);
 const serialized=JSON.stringify(snapshot);
 for(const hidden of ['service.','painting.','raw chat','pendingCategoryHistory','answeredQuestionKeys','currentQuestionKey'])
  assert.ok(!serialized.includes(hidden),hidden);
 const rows=assessmentDetailRows(snapshot);
 assert.ok(rows.some(row=>row.label==='Renk kodu'&&row.value==='6269'));
 assert.ok(rows.some(row=>row.label==='Hesaplanan duvar alanı'&&row.value==='300 m²'));
});

test('manual review stores all selections without inventing a price',async()=>{
 let result=await diagnosePainting('Boya hizmeti istiyorum',[],null);
 for(const answer of ['Komple ev','100 m²','3','Boş','2,5 metre','Yalnız duvarlar',
  'Eski boyalı','Ciddi sıva / derin hasar var'])
  result=await diagnosePainting(answer,[],result.stateToken);
 const snapshot=serviceRequestAssessment(verified(conversation('painting',{
  paintingServiceType:'wall_painting',paintingStateToken:result.stateToken,lastResponse:result})));
 assert.equal(snapshot.selections.repairStatus,'serious_plaster_damage');
 assert.equal(snapshot.selections.furnished,false);
 assert.equal(snapshot.calculation,null);
});

test('cleaning, upholstery and carpet snapshots retain every customer-selected domain field',()=>{
 const home={areaM2:100,rooms:3,bathrooms:2,balconies:1,extras:['oven','windows','pet'],
  closetRooms:0,materialsAvailable:false,equipmentAvailable:true,duration:'two_days'};
 const h=serviceRequestAssessment(verified(conversation('cleaning',{cleaningState:{serviceType:'home_cleaning',
  home:{step:'done',fields:home,answered:10},apartment:null,upholstery:null,carpet:null}})));
 assert.deepEqual(h.selections,home);
 const apartment={floors:5,apartments:10,glass:'full',glassCount:0,elevator:true,materialsAvailable:false};
 const a=serviceRequestAssessment(verified(conversation('cleaning',{cleaningState:{serviceType:'apartment_cleaning',
  home:null,apartment:{step:'done',fields:apartment,answered:5},upholstery:null,carpet:null}})));
 assert.deepEqual(a.selections,{floors:5,apartments:10,glass:'full',elevator:true,materialsAvailable:false});
 const upholstery=serviceRequestAssessment(verified(conversation('sofa_cleaning',{cleaningState:{serviceType:'upholstery_cleaning',
  home:null,apartment:null,upholstery:{step:'done',items:[{key:'sofa_3',quantity:2}],answered:1},carpet:null}})));
 assert.deepEqual(upholstery.selections.items,[{key:'sofa_3',quantity:2}]);
 const carpet=serviceRequestAssessment(verified(conversation('carpet_cleaning',{cleaningState:{serviceType:'carpet_cleaning',
  home:null,apartment:null,upholstery:null,carpet:{step:'done',items:[{key:'acrylic',areasM2:[2.5,3]},
    {key:'blanket',quantity:1}],answered:1}}})));
 assert.deepEqual(carpet.selections.items,[{key:'acrylic',areasM2:[2.5,3]},{key:'blanket',quantity:1}]);
 for(const snapshot of [h,a,upholstery,carpet]){
  assert.ok(!JSON.stringify(snapshot).includes('"step"'));
  assert.ok(!JSON.stringify(snapshot).includes('"answered"'));
  assert.ok(assessmentDetailRows(snapshot).length>0);
 }
});

test('boiler snapshot records structured answers and identity without transient candidates or AI reasoning',()=>{
 const boilerState={version:1,sessionId:'abc',brand:'Vaillant',model:'ecoTEC intro',errorCode:'F.28',
  familyId:'family',officialModelId:null,answers:[{questionId:'q1',answerKey:'yes',
    evidenceGroup:'other_gas_appliance',askedAt:'2026-01-01'}],askedQuestionIds:['q1'],
  totalAskedQuestions:1,pendingQuestionId:null};
 const token=encodeBoilerState(boilerState);
 const snapshot=serviceRequestAssessment(verified(conversation('boiler',{boilerStateToken:token,
  lastResponse:{assessmentComplete:true,resultState:'uncertain_price',isReadyForPrice:false,
    candidateProbabilities:[{name:'unverified',probability:99}],aiText:'chain of thought'}})));
 assert.equal(snapshot.device.brand,'Vaillant');
 assert.deepEqual(snapshot.customerAnswers,[{questionId:'q1',answerKey:'yes',evidenceGroup:'other_gas_appliance'}]);
 assert.equal(snapshot.outcome.verifiedPart,null);
 for(const hidden of ['unverified','chain of thought','askedAt','sessionId','boiler.'])
  assert.ok(!JSON.stringify(snapshot).includes(hidden),hidden);
});

test('migration stores snapshot atomically, keeps legacy NULL and idempotent insert, and blocks updates',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261005025943_service_request_assessment_snapshot.sql',import.meta.url),'utf8');
 assert.match(sql,/add column if not exists assessment_snapshot jsonb/);
 assert.match(sql,/assessment_snapshot is null/);
 assert.match(sql,/before update on public\.service_requests/);
 assert.match(sql,/assessment_snapshot is distinct from old\.assessment_snapshot/);
 assert.match(sql,/on conflict \(customer_id,request_key\) where request_key is not null do nothing/);
 assert.match(sql,/p_assessment_snapshot jsonb/);
 assert.match(sql,/request\.created/);
 assert.match(sql,/revoke all on function public\.create_service_request\(uuid,text,uuid,text,text,text,text\)/);
 assert.match(sql,/grant execute on function public\.create_service_request\(uuid,text,uuid,text,text,text,text,jsonb\)\s+to service_role/);
 const route=readFileSync(new URL('../src/app/api/operations/requests/route.ts',import.meta.url),'utf8');
 const server=readFileSync(new URL('../src/lib/operation-server.ts',import.meta.url),'utf8');
 assert.doesNotMatch(route,/body\.(?:assessmentSnapshot|issueTitle|problemDescription)/);
 assert.match(server,/decodeConversationState\(token\)/);
 assert.match(server,/conversation\?\.customerId!==account\.id/);
 assert.match(server,/serviceRequestAssessment\(conversation\)/);
 assert.match(server,/p_assessment_snapshot:assessmentSnapshot/);
 assert.doesNotMatch(server,/input\.assessmentSnapshot/);
});
