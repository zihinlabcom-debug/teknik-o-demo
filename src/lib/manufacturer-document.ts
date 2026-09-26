import { PDFParse } from 'pdf-parse';
import { get } from 'node:https';
import type { IncomingMessage } from 'node:http';

// Fetch only already approved manufacturer hosts, including every redirect.
export async function readManufacturerDocument(url: string, allowed: (url: string) => boolean) {
  let target = url;
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!allowed(target)) throw new Error('Unapproved manufacturer URL');
    const response = await new Promise<IncomingMessage>((resolve,reject)=>{
      const request=get(target,{maxHeaderSize:65536,signal:AbortSignal.timeout(20000)},resolve);
      request.on('error',reject);
    });
    const status=response.statusCode??0;
    if (status >= 300 && status < 400) {
      const location = response.headers.location;
      response.destroy();
      if (!location) throw new Error('Missing redirect location');
      target = new URL(location, target).href;
      continue;
    }
    if (status!==200) { response.destroy(); throw new Error('Manufacturer document unavailable'); }
    const limit = 15 * 1024 * 1024;
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for await (const value of response) {
        size += value.length;
        if (size > limit) throw new Error('Manufacturer document too large');
        chunks.push(value);
      }
    } finally { response.destroy(); }
    const bytes = Buffer.concat(chunks);
    if (bytes.subarray(0, 5).toString() === '%PDF-') {
      const parser = new PDFParse({ data: new Uint8Array(bytes) });
      try {
        const result = await parser.getText();
        return { url: target, text: result.text,links:[] as Array<{url:string;title:string}> };
      } finally { await parser.destroy(); }
    }
    const type = response.headers['content-type'] ?? '';
    if (!/text\/(?:html|plain)/i.test(type)) throw new Error('Unsupported manufacturer document');
    const html=bytes.toString('utf8');
    const links=[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap(m=>{try{return [{url:new URL(m[1].replace(/&amp;/g,'&'),target).href,title:m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}];}catch{return [];}});
    const text = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/(?:tr|p|h[1-6]|li|div|section)>|<br\s*\/?>/gi,'\n').replace(/<\/(?:td|th)>/gi,'\t').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&');
    return { url: target, text,links };
  }
  throw new Error('Too many manufacturer redirects');
}

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
