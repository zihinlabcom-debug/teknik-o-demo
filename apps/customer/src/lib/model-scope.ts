export interface ModelScope {id:string;kind:'exact'|'family';coveredModels:string[];start:number;end:number;text:string}
function norm(s:string){return s.normalize('NFKC').toUpperCase().replace(/İ/g,'I').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();}
export function extractModelScopes(text:string,model:string,brand?:string):ModelScope[] {
 const wanted=norm(model);if(!wanted)return [];
 const lines=[...text.matchAll(/[^\r\n]+/g)];const choices:ModelScope[]=[];
 for(let i=0;i<lines.length;i++) {
  let raw=lines[i][0];
  if(brand&&norm(raw).startsWith(norm(brand)+' '))raw=raw.slice(brand.length).trim();
  const value=norm(raw);
  const next=lines[i+1]?.[0]?.trim()??'';
  const numericVariants=/^\d{1,3}(?:\s*[-/,]\s*\d{1,3})*$/.test(next)?next.split(/\s*[-/,]\s*/):null;
  // A cover can put a generic model heading above an explicit variant list.
  // Preserve the whole evidence and limit applicability to the listed variants.
  if(numericVariants&&(value===wanted||numericVariants.some(v=>norm(raw+' '+v)===wanted))){
   const end=lines[i+1].index+lines[i+1][0].length;
   choices.push({id:'m'+lines[i].index,kind:'family',coveredModels:numericVariants.map(v=>raw.trim()+' '+v),start:lines[i].index,end,text:text.slice(lines[i].index,end)});
   continue;
  }
  if(value!==wanted&&!value.startsWith(wanted+' ')&&!value.startsWith(wanted+'-'))continue;
  let name=raw.trim().split(/\t|[≤≥|]/)[0].trim();
  const suffix=norm(name).slice(wanted.length).trim();
  // Only model designations, not sentences mentioning the family.
  if(name.length>90 || /[.!?;]/.test(suffix) || suffix.split(' ').length>6 ||
    (suffix && !/\d/.test(suffix) && name.slice(model.length).trim()!==name.slice(model.length).trim().toUpperCase()))continue;
  let end=lines[i].index+lines[i][0].length;
  if(!suffix && /^(?:\d{1,3}\s+[A-Z][A-Z0-9 -]*|[A-Z]{1,5}\s*\d{1,3}(?:\s*[,/]\s*[A-Z]*\d{1,3})*)$/.test(next)) {
   name+=' '+next;end=lines[i+1].index+lines[i+1][0].length;
  }
  choices.push({id:'m'+lines[i].index,kind:norm(name)===wanted?'exact':'family',coveredModels:[name],start:lines[i].index,end,text:text.slice(lines[i].index,end)});
 }
 // A marketing prefix and model identifier may be separated by a drawing ID on a cover.
 const tokens=model.trim().split(/\s+/),last=tokens.at(-1)??'',prefix=tokens.slice(0,-1).join(' ');
 if(prefix&&/\d/.test(last))for(let i=0;i<Math.min(lines.length,40);i++) {
  if(norm(lines[i][0])!==norm(prefix))continue;
  for(let j=i+1;j<=Math.min(i+3,lines.length-1);j++) {
   const variants=lines[j][0].split(/[|,]/).map(v=>v.trim());
   if(variants.length&&variants.every(v=>norm(v)===norm(last)||norm(v).startsWith(norm(last)+'-'))) {
    choices.push({id:'m'+lines[i].index+'-'+lines[j].index,kind:'family',coveredModels:variants.map(v=>prefix+' '+v),start:lines[i].index,end:lines[j].index+lines[j][0].length,text:text.slice(lines[i].index,lines[j].index+lines[j][0].length)});break;
   }
  }
 }
 // Variant evidence takes precedence over a bare family heading elsewhere.
 const firstCover=choices.find(c=>c.start<3000);
 return choices.filter(c=>c.kind==='family'||firstCover?.kind!=='family').slice(0,12);
}
