import {readFileSync,existsSync} from 'node:fs';
import {withCopaRepository} from './copa-stage3-runtime.mjs';
export function generalData(){
 const final=new URL('../../test-results/stage3-general/knowledge-after.json',import.meta.url);
 const p=JSON.parse(readFileSync(existsSync(final)?final:new URL('../../test-results/stage3-general/knowledge-candidates-after.json',import.meta.url),'utf8'));
 return {families:p.boiler_model_families,models:p.boiler_official_models,aliases:p.boiler_model_aliases,
   raw:p.official_error_codes_raw,candidates:p.boiler_fault_candidates,
   questions:p.boiler_diagnostic_questions,effects:p.boiler_question_effects};
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
