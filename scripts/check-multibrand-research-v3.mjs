// Measurement only: no production changes, injected answers, manual hints, or retries.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {get} from 'node:https';
import {researchManufacturer} from '../src/lib/technical-research.ts';
import {readManufacturerDocument,sourceContains,containsErrorCode,codeExcerpt} from '../src/lib/manufacturer-document.ts';
import {normalizePartText} from '../src/lib/parts-catalog.ts';
import {lookupDiagnosticKnowledge} from '../src/lib/diagnostic-knowledge.ts';
import {MANUAL_HINTS} from '../src/lib/manufacturer-manuals.ts';

const folder='test-results/multibrand-generalization-v3';
try {await readFile(folder+'/results.json');throw Error('This one-round report already exists; refusing to overwrite or rerun.');} catch(error) {if(error.code!=='ENOENT')throw error;}
await mkdir(folder,{recursive:true});
const source=await readFile('src/lib/manufacturer-registry.ts','utf8');
const domainBlock=source.match(/const DOMAINS:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1];
if(!domainBlock) throw Error('Cannot extract current domain registry');
const domains=Object.fromEntries([...domainBlock.matchAll(/(\w+):\[([^\]]+)\]/g)].map(m=>[m[1],[...m[2].matchAll(/'([^']+)'/g)].map(d=>d[1])]));
const identities=[
  {brand:'Baymak',model:'DUOTEC',code:'E01'},
  {brand:'Ariston',model:'CLAS ONE',code:'501'},
  {brand:'Immergas',model:'VICTRIX TERA',code:'27'},
  {brand:'Demirdöküm',model:'Atromix',code:'F.28'},
  {brand:'Buderus',model:'Logamax plus GB072',code:'6A'},
  {brand:'Warmhaus',model:'Ewa',code:'E02'},
];
async function fingerprints() {
  const files=['package.json','package-lock.json','next.config.ts'];
  async function visit(path) { for(const item of await readdir(path,{withFileTypes:true})) {
    const name=path+'/'+item.name;
    if(item.isDirectory()) await visit(name); else files.push(name);
  }}
  await visit('src');
  return Object.fromEntries(await Promise.all(files.sort().map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
}
const baseline=await fingerprints();
const run={startedAt:new Date().toISOString(),model:process.env.DIAGNOSTIC_RESEARCH_MODEL||'gpt-4.1',
  method:'One uncached researchManufacturer call per identity, sequential; original document reader wrapped only for observation. No URLs or reference answers sent to the model.',
  approvedDomains:domains,productionFingerprintsBefore:baseline,results:[]};
await writeFile(folder+'/results.json',JSON.stringify(run,null,2));

function hostAllowed(url,brand) {
  try {const u=new URL(url);return u.protocol==='https:' && !u.username && !u.password && !u.port &&
    domains[normalizePartText(brand).replace(/ /g,'')].some(d=>u.hostname===d||u.hostname.endsWith('.'+d));}catch{return false;}
}
async function probe(url,brand) {
  const chain=[];
  for(let i=0;i<=3;i++) {
    if(!hostAllowed(url,brand)) return {accessible:null,chain,reason:'Host blocked by current allowlist'};
    try {
      const response=await new Promise((resolve,reject)=>{
        const req=get(url,{maxHeaderSize:65536,signal:AbortSignal.timeout(20000)},res=>{
          const value={url,status:res.statusCode,contentType:res.headers['content-type'],location:res.headers.location};
          res.destroy();resolve(value);
        }); req.on('error',reject);
      });
      chain.push(response);
      if(response.status>=300&&response.status<400&&response.location) {url=new URL(response.location,url).href;continue;}
      return {accessible:response.status===200,chain};
    } catch(error) {return {accessible:false,chain,error:error.message,code:error.code};}
  }
  return {accessible:false,chain,reason:'Redirect limit'};
}

for(const identity of identities) {
  const key=[normalizePartText(identity.brand),normalizePartText(identity.model)].join('|');
  if(!domains[normalizePartText(identity.brand)] || MANUAL_HINTS[key] || lookupDiagnosticKnowledge(identity.brand,identity.model,identity.code)) throw Error('Prepared or unsupported case: '+key);
  const events=[],documents=[];const started=Date.now();let result;
  console.log(JSON.stringify({event:'start',identity}));
  try {
    result=await researchManufacturer(identity,(raw,urls)=>events.push({at:new Date().toISOString(),raw,urls}),{readDocument:async(url,allowed)=>{
      const item={url};documents.push(item);
      try {
        const doc=await readManufacturerDocument(url,allowed);
        Object.assign(item,{finalUrl:doc.url,readable:true,modelTextMatch:sourceContains(doc.text,identity.model),codeTextMatch:containsErrorCode(doc.text,identity.code)});
        const file=normalizePartText(identity.brand)+'-'+documents.length+'-document.txt';
        await writeFile(folder+'/'+file,doc.text);item.documentFile=file;
        return doc;
      } catch(error){item.readable=false;item.error=error.message;throw error;}
    }});
  } catch(error){result={status:'error',message:error.message};}
  const urls=[...new Set(events.filter(e=>e.raw?.stage==='discovery').flatMap(e=>e.raw.sources?.map(s=>s.url)??[]))];
  const probes=[];
  for(const url of [...new Set([...urls,...documents.map(d=>d.finalUrl??d.url)])]) probes.push({url,...await probe(url,identity.brand)});
  const knowledge=result.status==='verified'?result.knowledge:null;
  const decision=events.findLast(e=>e.raw?.stage==='decision' && e.raw.status===result.status);
  const report=decision?.raw;
  const row={identity,researchStatus:result.status,elapsedMs:Date.now()-started,
    sourceUrl:knowledge?.source.url??result.source?.url??decision?.urls[0]??null,
    verification:result.verification??null,
    sourceUrls:urls,modelDocumentVerified:result.verification?.modelVerified===true,
    modelScope:result.verification?.modelScope??'unknown',
    coveredModels:result.verification?.coveredModels??[],
    errorCodeDocumentVerified:result.verification?.errorCodeVerified===true,
    meaning:result.description??knowledge?.meaning??null,candidateCount:knowledge?.causes.length??0,
    poolOnlyVerifiedDocument:Boolean(knowledge?.evidence?.version===3),
    failure:knowledge?null:{status:result.status,message:result.message,stages:events.filter(e=>e.raw?.error||e.raw?.stage==='entailment').map(e=>({urls:e.urls,...e.raw}))},
    probes,documents,events,result};
  run.results.push(row);
  await writeFile(folder+'/results.json',JSON.stringify(run,null,2));
  console.log(JSON.stringify({event:'complete',identity,status:row.researchStatus,candidates:row.candidateCount,url:row.sourceUrl}));
}
run.finishedAt=new Date().toISOString();run.productionFingerprintsAfter=await fingerprints();
run.productionFilesUnchanged=JSON.stringify(baseline)===JSON.stringify(run.productionFingerprintsAfter);
await writeFile(folder+'/results.json',JSON.stringify(run,null,2));
if(!run.productionFilesUnchanged)throw Error('Production files changed during measurement');
console.log(JSON.stringify({event:'summary',verified:run.results.filter(r=>r.researchStatus==='verified').length,total:run.results.length,productionFilesUnchanged:true}));
