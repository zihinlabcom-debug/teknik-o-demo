import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {decodeBoilerState,diagnoseBoiler} from '../src/lib/boiler-diagnosis.ts';
import {withCopaRepository} from './helpers/copa-stage3-runtime.mjs';
import {generalData,generalAI,signedGeneral} from './helpers/stage3-general-runtime.mjs';

// Compile only the real display component, using the project's TS dependency.
const componentUrl=new URL('../src/components/diagnostic-outcome.tsx',import.meta.url).href;
const componentHook=registerHooks({load(url,context,next){
 if(url!==componentUrl)return next(url,context);
 return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
 }).outputText};
}});
const {DiagnosticOutcome}=await import(componentUrl);componentHook.deregister();

test('encoded candidate names become Unicode before consensus, assessment and API serialization',()=>signedGeneral(async()=>{
 const data=generalData(),family=data.families.find(f=>f.family_name==='nitromiX');
 const expected=['Eşanjör/ısı bloğu sorunu','Kablolama/soket/bağlantı sorunu','Termik kapatma düzeneği sorunu'];
 const variants=['&#x75;','&#117;','u'];let sequence=0;
 for(const c of data.candidates.filter(c=>c.family_id===family.id&&c.error_code?.replace('.','')==='F76')){
  c.candidate_name=c.candidate_name.replace(/u$/,variants[sequence++%variants.length]);
 }
 await withCopaRepository(async repo=>{
  const rows=await repo.getCandidates(family.id);
  assert.ok(rows.filter(c=>c.error_code?.replace('.','')==='F76').every(c=>expected.includes(c.candidate_name)));
  const result=await diagnoseBoiler('Demirdöküm nitromiX F76',[],null,repo,generalAI({brand:'Demirdokum',model:'nitromix',errorCode:'F76'}));
  assert.equal(decodeBoilerState(result.stateToken).officialModelId,null);
  assert.deepEqual(result.candidateProbabilities.map(c=>c.name).sort(),expected.sort());
  assert.ok(result.groupProbabilities.every(g=>g.candidateNames.every(n=>expected.includes(n))));
  assert.doesNotMatch(JSON.stringify(result.candidateProbabilities),/&#(?:x[0-9a-f]+|\d+);/i);
  const html=renderToStaticMarkup(createElement(DiagnosticOutcome,{candidates:result.candidateProbabilities}));
  for(const name of expected)assert.ok(html.includes(name));
  assert.doesNotMatch(html,/&#x75;|&amp;#x75;/i);
 },{data});
}));

test('plain Unicode stays unchanged and named/numeric entities are decoded as text, never HTML',async()=>{
 const data=generalData(),family=data.families.find(f=>f.family_name==='nitromiX');
 const rows=data.candidates.filter(c=>c.family_id===family.id);
 const names=['sorunu','Çalışma / bağlantı sorunu','Elektrik &amp; kontrol &quot;A&quot;','&#x1F527; sensör','&lt;img src=x onerror=alert(1)&gt;'];
 rows.slice(0,names.length).forEach((c,i)=>{c.candidate_name=names[i];});
 await withCopaRepository(async repo=>{
  const normalized=await repo.getCandidates(family.id);
  const expected=['sorunu','Çalışma / bağlantı sorunu','Elektrik & kontrol "A"','🔧 sensör','<img src=x onerror=alert(1)>'];
  assert.deepEqual(normalized.slice(0,names.length).map(c=>c.candidate_name),expected);
  assert.deepEqual(rows.slice(0,names.length).map(c=>c.candidate_name),names,'normalization must not write or mutate source records');
  const html=renderToStaticMarkup(createElement('span',null,normalized[4].candidate_name));
  assert.doesNotMatch(html,/<img\b/);assert.match(html,/&lt;img/);
 },{data});
});
