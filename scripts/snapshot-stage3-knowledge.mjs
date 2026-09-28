// Read-only technical catalog export. No customer/session tables or DB writes.
import {createClient} from '@supabase/supabase-js';
import {mkdirSync,writeFileSync} from 'node:fs';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Missing local Supabase catalog credentials');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const names=['official_error_codes_raw','boiler_model_families','boiler_official_models',
 'boiler_model_aliases','boiler_fault_candidates','boiler_diagnostic_questions','boiler_question_effects'];
const tables=Object.fromEntries(await Promise.all(names.map(async name=>{
 const rows=[];let count;
 for(let start=0;;start+=500){
  const response=await db.from(name).select('*',start===0?{count:'exact'}:{}).order('id').range(start,start+499);
  if(response.error)throw Error(`Technical catalog ${name}: ${response.error.message}`);
  if(start===0)count=response.count;
  rows.push(...response.data);
  if(rows.length===count)break;
  if(!response.data.length||rows.length>count)throw Error(`Incomplete catalog ${name}`);
 }
 return [name,rows];
})));
const folder=new URL('../test-results/stage3-general/',import.meta.url);mkdirSync(folder,{recursive:true});
const report={capturedAt:new Date().toISOString(),mode:'read-only live Supabase technical catalog',tables};
writeFileSync(new URL('database-before.json',folder),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({mode:report.mode,counts:Object.fromEntries(Object.entries(tables).map(([n,r])=>[n,r.length])),
 brands:[...new Set(tables.boiler_model_families.map(r=>r.brand))].sort()},null,2));
