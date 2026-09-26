import test from 'node:test';
import assert from 'node:assert/strict';
import {createTechnicalResearchService} from '../src/lib/technical-research.ts';
import {InMemoryVerifiedKnowledgeRepository,toVerifiedKnowledge,verifiedKnowledgeResult} from '../src/lib/verified-knowledge.ts';
import {isSourceFaithfulLabel} from '../src/lib/manufacturer-label.ts';
import {assessRecord} from '../src/lib/manufacturer-research-engine.ts';
import {extractErrorRecords} from '../src/lib/error-record.ts';
import {extractModelScopes} from '../src/lib/model-scope.ts';
import {toResearchContext} from '../src/lib/research-context.ts';

const identity={brand:'Vaillant',model:'MODEL X',code:'F.28'};
function verified({model=identity.model,cover=model,label='electrodes / cables',descriptionVerified=true}={}){
 const text=`${cover}\nFault codes\nF.28 | Error code flashing\nElectrodes and cables should be checked\nF.29 | Other fault`;
 const scopes=extractModelScopes(text,model),records=extractErrorRecords(text,'F28');
 return assessRecord({...identity,model},{url:'https://www.vaillant.com.tr/manual.pdf',text},scopes,records,
 {scopeId:scopes[0].id,recordId:records[0].id,candidates:[{name:label,part:'',startSpan:'s0',endSpan:'s0'}],questionIds:['gasSupply']},
 {modelVerified:true,errorCodeVerified:true,descriptionVerified,reason:'fixture',candidates:[{index:0,supported:true,reason:'Even an overconfident reviewer cannot bypass the literal-label guard'}]});
}
test('Bosch regression: check wording cannot become an invented failure/subtype',()=>{
 const evidence='electrodes and cables should be checked';
 assert.equal(isSourceFaithfulLabel('ignition electrode faulty or disconnected',evidence),false);
 assert.equal(isSourceFaithfulLabel('electrodes / cables',evidence),true);
 assert.notEqual(verified({label:'ignition electrode faulty or disconnected'}).status,'verified');
 assert.equal(verified().status,'verified');
});
test('known verified information bypasses live research, including after cache clear and expiry',async()=>{
 const repository=new InMemoryVerifiedKnowledgeRepository();await repository.saveVerified(toVerifiedKnowledge(identity,verified()));
 let calls=0,clock=0;const lookup=createTechnicalResearchService(async()=>{calls++;throw Error('offline');},()=>clock,repository);
 assert.equal((await lookup(identity)).origin,'verified_knowledge');
 lookup.clearCache();clock=10**12;
 assert.equal((await lookup(identity)).status,'verified');assert.equal(calls,0);
});
test('model names exposed for typo matching come only from validated manufacturer records',async()=>{
 const repository=new InMemoryVerifiedKnowledgeRepository();
 assert.deepEqual(await repository.listVerifiedModels(identity.brand,identity.code),[]);
 await repository.saveVerified(toVerifiedKnowledge(identity,verified()));
 assert.ok((await repository.listVerifiedModels(identity.brand,identity.code)).some(model=>model.toLowerCase()==='model x'));
 assert.deepEqual(await repository.listVerifiedModels('Bosch',identity.code),[]);
 assert.deepEqual(await repository.listVerifiedModels(identity.brand,'F.29'),[]);
});
test('unknown information researches once, saves, and a new service works offline with the same repository',async()=>{
 const repository=new InMemoryVerifiedKnowledgeRepository();let calls=0;
 const lookup=createTechnicalResearchService(async()=>{calls++;return verified({descriptionVerified:false});},Date.now,repository);
 const first=await lookup(identity);assert.equal(first.origin,'live_research');assert.equal(first.status,'verified');
 assert.ok(await repository.findVerified(identity));assert.equal(calls,1);
 const offline=createTechnicalResearchService(async()=>{throw Error('No internet');},Date.now,repository);
 const second=await offline({...identity,brand:'VAILLANT',code:'F28'});
 assert.equal(second.origin,'verified_knowledge');assert.equal(second.verification.descriptionVerified,false);
 assert.deepEqual(second.knowledge.causes,first.knowledge.causes);
});
test('a negative cache and a racing failed research never downgrade verified information',async()=>{
 for(const status of ['not_found','unavailable']){
  const repository=new InMemoryVerifiedKnowledgeRepository();let release;
  const lookup=createTechnicalResearchService(()=>new Promise(resolve=>{release=()=>resolve({status,message:'failure'});}),Date.now,repository);
  const pending=lookup(identity);while(!release)await new Promise(resolve=>setImmediate(resolve));
  await repository.saveVerified(toVerifiedKnowledge(identity,verified()));release();
  assert.equal((await pending).status,'verified');assert.equal((await lookup(identity)).origin,'verified_knowledge');
 }
 const repository=new InMemoryVerifiedKnowledgeRepository();const lookup=createTechnicalResearchService(async()=>({status:'not_found',message:'none'}),Date.now,repository);
 await lookup(identity);await repository.saveVerified(toVerifiedKnowledge(identity,verified()));
 assert.equal((await lookup(identity)).status,'verified');
});
test('exact identities never match a sibling or another manufacturer/code',async()=>{
 const repository=new InMemoryVerifiedKnowledgeRepository();await repository.saveVerified(toVerifiedKnowledge(identity,verified()));
 for(const changes of [{model:'MODEL X PLUS'},{brand:'Bosch'},{code:'F29'}])assert.equal(await repository.findVerified({...identity,...changes}),null);
});
test('family lookup is limited to its recorded family query and explicitly covered variants',async()=>{
 const repository=new InMemoryVerifiedKnowledgeRepository();await repository.saveVerified(toVerifiedKnowledge(identity,verified({cover:'MODEL X 24 PLUS'})));
 assert.equal((await repository.findVerified(identity)).modelScope,'family');
 assert.ok(await repository.findVerified({...identity,model:'MODEL X 24 PLUS'}));
 const childIdentity={...identity,model:'MODEL X 24 PLUS'};
 const childRecord=await repository.findVerified(childIdentity);
 assert.ok(toVerifiedKnowledge(childIdentity,verifiedKnowledgeResult(childRecord)),'covered variant session must retain its family evidence');
 for(const model of ['MODEL X 28','MODEL X 24','MODEL','MODEL XY'])assert.equal(await repository.findVerified({...identity,model}),null);
 const widened=toVerifiedKnowledge(identity,verified({cover:'MODEL X 24 PLUS'}));
 widened.coveredModels.push('MODEL X 28');widened.knowledge.evidence.coveredModels.push('MODEL X 28');
 await assert.rejects(repository.saveVerified(widened));
});
test('saved source revision, original code, record, timestamp and description metadata survive roundtrip',async()=>{
 const repository=new InMemoryVerifiedKnowledgeRepository(),r=verified();r.knowledge.source.revision='rev-test';
 const record=toVerifiedKnowledge(identity,r);await repository.saveVerified(record);
 const restored=await repository.findVerified(identity);
 assert.equal(restored.originalErrorCode,'F.28');assert.equal(restored.knowledge.source.revision,'rev-test');
 assert.equal(restored.verifiedAt,r.knowledge.source.reviewedAt);assert.equal(restored.documentIdentity,r.knowledge.evidence.documentHash);
 assert.deepEqual(restored.knowledge.evidence.record,r.knowledge.evidence.record);
});
test('repository rejects missing, invented, outside-record and overspecified evidence',async()=>{
 const repository=new InMemoryVerifiedKnowledgeRepository();const valid=toVerifiedKnowledge(identity,verified());assert.ok(valid);
 for(const mutate of [r=>delete r.knowledge.evidence,r=>r.knowledge.evidence.candidates[0].basis='invented',
  r=>r.knowledge.evidence.candidates[0].start=999999,r=>r.knowledge.causes[0]='ignition electrode faulty',
  r=>r.knowledge.source.url='https://seller.example/manual.pdf',r=>r.manufacturer='bosch']){
  const invalid=structuredClone(valid);mutate(invalid);await assert.rejects(repository.saveVerified(invalid));
 }
 assert.equal(await repository.findVerified(identity),null);
});
test('repository owns its data and existing evidence is not replaced by a weaker write',async()=>{
 const repository=new InMemoryVerifiedKnowledgeRepository();const record=toVerifiedKnowledge(identity,verified());
 await repository.saveVerified(record);record.knowledge.causes=[];
 const found=await repository.findVerified(identity);found.knowledge.causes=[];
 assert.equal((await repository.findVerified(identity)).knowledge.causes.length,1);
});
test('diagnosis context keeps source labels/evidence separate from customer evidence and description metadata',()=>{
 const r=verified({descriptionVerified:false}),context=toResearchContext(identity,r);
 assert.equal(context.device.modelScope,'exact');assert.equal(context.fault.descriptionVerified,false);
 assert.equal(context.fault.meaning,null);assert.equal(context.researchStatus,'verified');
 assert.deepEqual(context.manufacturerKnowledge.causes.map(c=>c.label),r.knowledge.causes);
 assert.equal(context.manufacturerKnowledge.causes[0].evidence.text,r.knowledge.evidence.candidates[0].basis);
});
