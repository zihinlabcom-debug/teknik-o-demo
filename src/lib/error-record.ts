import {sourceContains} from './manufacturer-document';
export interface TextSpan {id:string;start:number;end:number;text:string}
export interface ErrorRecord {
 id:string;normalizedCode:string;originalCode:string;start:number;end:number;text:string;
 description:TextSpan;causeSpans:TextSpan[];context:TextSpan;page:number|null;
 layout:'code-first'|'description-first';
}
export function normalizeFaultCode(code:string){return code.toUpperCase().replace(/[.\s-]/g,'');}
const codeToken=String.raw`(?:[A-Z]{1,2}[. -]?\d{1,3}|\d{1,3}[A-Z]{1,2}|\d(?:[. -]?\d){0,3}|[A-Z]{2})`;
const head=new RegExp('^\\s*('+codeToken+')(?=\\s|[|:]|$)');
const tail=new RegExp('(?:\\t|\\|| {2,})\\s*('+codeToken+')\\s*$');
const contextPattern=/(?:hata\s*kod|arıza|ariza|sorun gider|fault|failure|error|codici|errore|anomali|guasti|descrizione\s+display|неисправност|fehler|störung)/iu;
const excluded=/(?:fig(?:ure|ura)?\.?|şekil|sekil|page|sayfa|parça|part\s*(?:no|number)|dimension|parameter|parametr|rpm|giri)/iu;
export function extractErrorRecords(text:string,code:string):ErrorRecord[] {
 const wanted=normalizeFaultCode(code);if(!/^[A-Z0-9]{1,6}$/.test(wanted))return [];
 const lines=[...text.matchAll(/[^\r\n]+(?:\r?\n|$)|\r?\n/g)].map(m=>({start:m.index,end:m.index+m[0].replace(/\r?\n$/,'').length,text:m[0].replace(/\r?\n$/,'')}));
 function row(line:typeof lines[number]) {
  const first=head.exec(line.text),last=tail.exec(line.text);
  if(first && !/^\s*\d+[.)-]\s*[-)]/.test(line.text))return {code:first[1],offset:first.index+first[0].indexOf(first[1]),end:first[0].length,layout:'code-first' as const};
  if(last)return {code:last[1],offset:last.index+last[0].indexOf(last[1]),end:last.index,layout:'description-first' as const};
  // Space-separated description then code is accepted only as a whole terminal token.
  const plain=new RegExp('^(.+?[a-zA-ZÀ-ž]) +('+codeToken+')\\s*$').exec(line.text);
  if(plain)return {code:plain[2],offset:line.text.lastIndexOf(plain[2]),end:plain[1].length,layout:'description-first' as const};
  return null;
 }
 const results:ErrorRecord[]=[];
 for(let i=0;i<lines.length;i++) {
  const line=lines[i],r=row(line);if(!r||normalizeFaultCode(r.code)!==wanted)continue;
  const contextStart=Math.max(0,line.start-6500),context=text.slice(contextStart,line.end);
  if(!contextPattern.test(context))continue;
  // Reject captions and parameter rows even in manuals that also have a fault section.
  if(excluded.test(line.text)||/\.{3,}/.test(line.text)||/^\s*\d+\s*\(/.test(line.text))continue;
  if(/^\s*\d[\d .-]*\s*$/.test(line.text)&&!/(?:code|codici|descrizione|hata|arıza|ariza)/iu.test(text.slice(Math.max(0,line.start-600),line.start)))continue;
  let endIndex=i+1;
  if(r.layout==='code-first') {
   while(endIndex<lines.length && lines[endIndex].start-line.start<10000) {
    const next=row(lines[endIndex]);
    if(next && normalizeFaultCode(next.code)!==wanted)break;
    if(/^\s*\d+(?:\.\d+)+\s+[A-Z]/.test(lines[endIndex].text))break;
    endIndex++;
   }
  }
  const recordEnd=r.layout==='description-first'?line.end:(lines[endIndex]?.start??text.length);
  let descStart=r.layout==='description-first'?line.start:line.start+r.end;
  let descEnd=r.layout==='description-first'?line.start+r.end:line.end;
  while(descStart<descEnd && /[\s|:]/.test(text[descStart]))descStart++;
  if(r.layout==='code-first' && descStart===descEnd) {
   let j=i+1;while(j<endIndex&&!lines[j].text.trim())j++;
   if(j>=endIndex)continue;descStart=lines[j].start;descEnd=lines[j].end;
  }
  const firstCell=text.slice(descStart,descEnd).search(/\t|\||▶|•|>/);
  if(firstCell>=0)descEnd=descStart+firstCell;
  while(descEnd>descStart&&/\s/.test(text[descEnd-1]))descEnd--;
  // Lower-case continuation lines belong to a wrapped description, up to the first cause/symptom cell.
  if(r.layout==='code-first') {
   let j=lines.findIndex(l=>l.end===descEnd);
   while(j>=0&&j+1<endIndex&&/^[a-zà-žı]/u.test(lines[j+1].text.trim())&&!/^(?:cause|neden|si verifica|check|verific|possib)/iu.test(lines[j+1].text.trim())) {
    descEnd=lines[++j].end;
   }
  }
  // An explicitly labelled cause may be the only cell after the code. Keep it
  // as cause evidence instead of inventing a verbal fault description.
  const causeOnly=r.layout==='code-first'&&/^(?:possible\s+causes?|causes?|olası\s+nedenler|neden(?:ler)?|sebep(?:ler)?)\s*:/iu.test(text.slice(descStart,descEnd).trim());
  if(causeOnly)descEnd=descStart;
  const description=text.slice(descStart,descEnd).trim();
  if(!causeOnly&&(!description || !/[\p{L}]/u.test(description)||excluded.test(description)||description.length>500))continue;
  const start=line.start,end=recordEnd;
  const causeSpans:TextSpan[]=[];
  if(r.layout==='code-first')for(let j=i;j<endIndex;j++) {
   let a=Math.max(lines[j].start,descEnd),b=Math.min(lines[j].end,end);
   while(a<b&&/[\s|]/.test(text[a]))a++;
   while(b>a&&/\s/.test(text[b-1]))b--;
   if(a<b&&!/^-- \d+ of \d+ --$/.test(text.slice(a,b))) {
    let chunk=a,depth=0;
    const add=(end:number)=>{let start=chunk;while(start<end&&/\s/.test(text[start]))start++;while(end>start&&/\s/.test(text[end-1]))end--;if(end>start)causeSpans.push({id:'s'+causeSpans.length,start,end,text:text.slice(start,end)});};
    for(let k=a;k<b;k++){if(text[k]==='(')depth++;if(text[k]===')')depth=Math.max(0,depth-1);if(!depth&&/[,;▶]/.test(text[k])){add(k);chunk=k+1;}}
    add(b);
   }
  }
  const pageMarkers=[...text.slice(0,start).matchAll(/-- (\d+) of \d+ --/g)];
  results.push({id:'r'+start,normalizedCode:wanted,originalCode:r.code,start,end,text:text.slice(start,end),
   description:{id:'description',start:descStart,end:descEnd,text:text.slice(descStart,descEnd)},causeSpans,
   context:{id:'context',start:contextStart,end:start,text:text.slice(contextStart,start)},page:pageMarkers.length?Number(pageMarkers.at(-1)![1])+1:1,layout:r.layout});
 }
 return results;
}
export function recordEvidence(record:ErrorRecord,quote:string) {
 return Boolean(quote.trim())&&!sourceContains(record.description.text,quote)&&record.causeSpans.length>0&&
  sourceContains(record.text.slice(record.causeSpans[0].start-record.start),quote);
}
