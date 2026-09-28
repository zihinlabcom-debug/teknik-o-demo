// Pure text checks shared by closed diagnosis and archived manufacturer research.
// Keep this module independent of document downloads and PDF parser dependencies.
export function sourceContains(text: string, quote: string) {
  const normalize = (value: string) => value.normalize('NFKC').replace(/-\s*\r?\n\s*/g,'').replace(/\u00ad/g,'')
    .toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  return quote.trim().length > 0 && normalize(text).includes(normalize(quote));
}

export function containsErrorCode(text: string, code: string) {
  const chars = code.toUpperCase().replace(/[.\s-]/g, '').split('');
  if (!chars.length || chars.some(c => !/[A-Z0-9]/.test(c))) return false;
  return new RegExp('(?:^|[^A-Z0-9])' + chars.join('[.\\s-]*') + '(?=$|[^A-Z0-9])', 'i').test(text);
}

// Rank fault contexts before truncation; acceptance still requires record validation.
export function codeExcerpt(text: string, code: string) {
  const chars=code.toUpperCase().replace(/[.\s-]/g,'').split('');
  if(!chars.length || chars.some(c=>!/[A-Z0-9]/.test(c))) return '';
  const pattern=new RegExp('(?:^|[^A-Z0-9])'+chars.join('[.\\s-]*')+'(?=$|[^A-Z0-9])','gi');
  const fault=/(?:ar[ıi]za|hata|error|fault|anomal|guast|codici|blocco|störung|fehler|cause|neden)/gi;
  const ranked=[...text.matchAll(pattern)].map(match=>{
    const index=match.index;
    const context=text.slice(Math.max(0,index-1800),index+1200);
    const score=(context.match(fault)?.length??0)*10;
    return {index,score};
  }).sort((a,b)=>b.score-a.score || a.index-b.index);
  const ranges:Array<[number,number]>=[[0,Math.min(6000,text.length)]];
  let budget=38000;
  for(const {index} of ranked) {
    if(ranges.some(([a,b])=>index>=a && index<b)) continue;
    const start=Math.max(0,index-1800),end=Math.min(text.length,index+10000,start+budget);
    if(end<=index || budget<1500) break;
    ranges.push([start,end]); budget-=end-start;
  }
  return ranges.map(([start,end])=>text.slice(start,end)).join('\n[...document excerpt...]\n');
}
