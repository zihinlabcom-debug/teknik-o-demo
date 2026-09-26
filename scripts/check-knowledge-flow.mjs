// Known regression cases, not blind. No source hints or reference answers are injected.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {researchManufacturer,createTechnicalResearchService} from '../src/lib/technical-research.ts';
import {InMemoryVerifiedKnowledgeRepository} from '../src/lib/verified-knowledge.ts';
import {readManufacturerDocument} from '../src/lib/manufacturer-document.ts';
import {toResearchContext} from '../src/lib/research-context.ts';
const folder='test-results/verified-knowledge-v5';
try{await readFile(folder+'/results.json');throw Error('Existing measurement is preserved; refusing overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(folder,{recursive:true});
async function fingerprints(){
 const files=['package.json','package-lock.json','next.config.ts'];
 async function visit(dir){for(const f of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+f.name;if(f.isDirectory())await visit(path);else files.push(path);}}
 await visit('src');return Object.fromEntries(await Promise.all(files.sort().map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
}
const identities=[{brand:'Vaillant',model:'ecoTEC intro',code:'F.28'},{brand:'Bosch',model:'Condens 2500 W',code:'EA'},
 {brand:'Baymak',model:'DUOTEC',code:'E01'},{brand:'Ariston',model:'CLAS ONE',code:'501'},
 {brand:'Immergas',model:'VICTRIX TERA',code:'27'},{brand:'Demirdöküm',model:'Atromix',code:'F.28'},
 {brand:'Buderus',model:'Logamax plus GB072',code:'6A'},{brand:'Warmhaus',model:'Ewa',code:'E02'}];
const repository=new InMemoryVerifiedKnowledgeRepository();
const run={startedAt:new Date().toISOString(),method:'Known eight-case regression. Empty isolated repository. First lookup uses live official research; second uses a new service with no cache and an offline research stub. No static hints or archived results seeded.',productionFingerprintsBefore:await fingerprints(),results:[]};
for(const identity of identities){
 const events=[],documents=[];let researchCalls=0;
 console.log(JSON.stringify({event:'start',identity}));
 const lookup=createTechnicalResearchService(async query=>{
  researchCalls++;
  return researchManufacturer(query,(raw,urls)=>events.push({raw,urls}),{readDocument:async(url,allowed)=>{
   const row={url};documents.push(row);
   try{
    const doc=await readManufacturerDocument(url,allowed);const file=identity.brand.replace(/[^a-zA-Z]/g,'')+'-'+documents.length+'.txt';
    await writeFile(folder+'/'+file,doc.text);Object.assign(row,{finalUrl:doc.url,accessible:true,file});return doc;
   }catch(e){Object.assign(row,{accessible:false,error:e.message});throw e;}
  }});
 },Date.now,repository);
 let first;try{first=await lookup(identity);}catch(e){first={status:'unavailable',message:e.message};}
 let offlineCalls=0;
 const offline=createTechnicalResearchService(async()=>{offlineCalls++;throw Error('Regression offline stub: internet unavailable');},()=>Date.now()+3*86400000,repository);
 const second=await offline(identity);
 const row={identity,first,context:toResearchContext(identity,first),researchCalls,second,offlineCalls,
  saved:!!await repository.findVerified(identity),documents,events};
 run.results.push(row);await writeFile(folder+'/results.json',JSON.stringify(run,null,2));
 console.log(JSON.stringify({event:'complete',identity,status:first.status,candidates:first.knowledge?.causes.length??0,saved:row.saved,second:second.status,offlineCalls}));
}
run.finishedAt=new Date().toISOString();run.productionFingerprintsAfter=await fingerprints();
run.productionFilesUnchanged=JSON.stringify(run.productionFingerprintsBefore)===JSON.stringify(run.productionFingerprintsAfter);
await writeFile(folder+'/results.json',JSON.stringify(run,null,2));
if(!run.productionFilesUnchanged)throw Error('Production files changed during measurement');
console.log(JSON.stringify({event:'summary',verified:run.results.filter(r=>r.first.status==='verified').length,total:run.results.length,
 offlinePreserved:run.results.filter(r=>r.saved&&r.second.status==='verified'&&r.offlineCalls===0).length}));
