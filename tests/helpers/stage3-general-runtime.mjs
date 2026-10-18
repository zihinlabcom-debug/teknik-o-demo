import {readFileSync} from 'node:fs';
import {withCopaRepository} from './copa-stage3-runtime.mjs';
export function generalData(){
 const fixture=new URL('../fixtures/free-text-relevance.json',import.meta.url);
 const p=JSON.parse(readFileSync(fixture,'utf8'));
 const copa=JSON.parse(readFileSync(new URL('../fixtures/copa-stage3.json',import.meta.url),'utf8'));
 const merge=(primary,additional)=>{
  const seen=new Set(primary.map(item=>item.id??JSON.stringify(item)));
  return [...primary,...additional.filter(item=>!seen.has(item.id??JSON.stringify(item)))];
 };
 return {families:merge(p.families,copa.families),models:merge(p.models,copa.models),
   aliases:merge(p.aliases,copa.aliases),raw:merge(p.raw,copa.raw),
   candidates:merge(p.candidates,copa.candidates),questions:merge(p.questions,copa.questions),
   effects:merge(p.effects,copa.effects)};
}
export const withGeneralRepository=(run,options={})=>withCopaRepository(run,{...options,data:generalData()});
export const generalAI=identity=>({
 async extractIdentity(){return identity;},async classifyAnswer(){return 'unknown';},
 async extractObservedAnswers(){return [];},async chooseQuestion({questions}){return questions[0]?.id??null;},
});
export async function signedGeneral(run){
 const saved=process.env.DIAGNOSIS_STATE_SECRET;process.env.DIAGNOSIS_STATE_SECRET='general-offline-identity-secret';
 try{return await run();}finally{if(saved===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=saved;}
}
