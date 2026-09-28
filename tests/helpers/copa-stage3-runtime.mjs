import {readFileSync} from 'node:fs';
import {createSupabaseBoilerRepository} from '../../src/lib/boiler-supabase.ts';
import {normalizePartText} from '../../src/lib/parts-catalog.ts';

export const copaData=()=>JSON.parse(readFileSync(new URL('../fixtures/copa-stage3.json',import.meta.url),'utf8'));
export const identityFor=message=>{
  const data=copaData(), text=` ${normalizePartText(message)} `;
  const alias=[...data.aliases].sort((a,b)=>b.normalized_alias.length-a.normalized_alias.length)
    .find(a=>text.includes(` ${a.normalized_alias} `));
  return {brand:/\bcopa\b/i.test(message)?'COPA':'',model:alias?.normalized_alias??'',
    errorCode:message.match(/\b[EF][. ]?\d{2}\b/i)?.[0]??''};
};
export const fakeCopaAI=message=>({
  async extractIdentity(){return identityFor(message);},
  async classifyAnswer(_q,answer){return /bilmiyorum/i.test(answer)?'unknown':/hay[ıi]r/i.test(answer)?'no':'yes';},
  async extractObservedAnswers(){return [];},
  async chooseQuestion({questions}){return [...questions].sort((a,b)=>b.priority-a.priority)[0]?.id??null;},
});

// A REST-shaped in-memory fixture exercises the real Supabase repository.
// Reject every unhandled host so smoke tests cannot call a live service.
export async function withCopaRepository(run, {data=copaData(),mockAI=false,aiIdentity=identityFor}={}){
  const original=globalThis.fetch, calls=[];
  let sequence=0;
  const tables={boiler_model_families:data.families,boiler_official_models:data.models,
    boiler_model_aliases:data.aliases,official_error_codes_raw:data.raw,
    boiler_fault_candidates:data.candidates,boiler_diagnostic_questions:data.questions,
    boiler_question_effects:data.effects,boiler_repair_pricing:[]};
  globalThis.fetch=async(input,init)=>{
    const request=input instanceof Request?input:new Request(input,init);
    const url=new URL(request.url);
    calls.push({host:url.hostname,path:url.pathname,method:request.method});
    if(mockAI&&url.hostname==='api.openai.com'){
      const body=await request.json();
      const schema=body.response_format?.json_schema?.name;
      let result;
      if(body.response_format?.type==='json_object'){
        result=aiIdentity(body.messages.filter(m=>m.role==='user').map(m=>m.content).join(' '));
      }else if(schema==='boiler_question_choice'){
        const context=JSON.parse(body.messages.at(-1).content);
        result={questionId:[...context.questions].sort((a,b)=>b.priority-a.priority)[0].id};
      }else if(schema==='boiler_observations') result={answers:[]};
      else if(schema==='boiler_answer') result={answerKey:'unknown'};
      else throw Error('Unhandled fake AI operation '+schema);
      return Response.json({id:'offline-completion',object:'chat.completion',choices:[{index:0,
        message:{role:'assistant',content:JSON.stringify(result)},finish_reason:'stop'}]});
    }
    if(url.hostname!=='copa-fixture.supabase.co')throw Error('Live network forbidden in COPA fixture: '+url.hostname);
    const table=url.pathname.split('/').at(-1);
    let rows=structuredClone(tables[table]??[]);
    if(request.method==='GET'){
      for(const [field,filter] of url.searchParams){
        if(filter.startsWith('eq.'))rows=rows.filter(r=>String(r[field])===filter.slice(3));
        if(filter.startsWith('in.(')){
          const permitted=filter.slice(4,-1).split(',').map(v=>v.replace(/^"|"$/g,''));
          rows=rows.filter(r=>permitted.includes(String(r[field])));
        }
      }
    }else if(request.method==='POST'){
      const body=await request.json();
      rows=(Array.isArray(body)?body:[body]).map(r=>({id:'fixture-'+(++sequence),...r}));
    }else rows=[];
    const single=request.headers.get('accept')?.includes('vnd.pgrst.object+json');
    return Response.json(single?rows[0]??null:rows);
  };
  try{return await run(createSupabaseBoilerRepository('https://copa-fixture.supabase.co','offline-service-key'),calls,data);}
  finally{globalThis.fetch=original;}
}
