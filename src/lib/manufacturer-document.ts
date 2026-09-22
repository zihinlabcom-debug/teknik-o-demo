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
        return { url: target, text: result.text };
      } finally { await parser.destroy(); }
    }
    const type = response.headers['content-type'] ?? '';
    if (!/text\/(?:html|plain)/i.test(type)) throw new Error('Unsupported manufacturer document');
    const text = bytes.toString('utf8').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&');
    return { url: target, text };
  }
  throw new Error('Too many manufacturer redirects');
}

export function sourceContains(text: string, quote: string) {
  const normalize = (value: string) => value.normalize('NFKC').replace(/-\s*\r?\n\s*/g,'').replace(/\u00ad/g,'')
    .toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  return quote.trim().length >= 4 && normalize(text).includes(normalize(quote));
}

export function containsErrorCode(text: string, code: string) {
  const chars = code.toUpperCase().replace(/[.\s-]/g, '').split('');
  if (!chars.length || chars.some(c => !/[A-Z0-9]/.test(c))) return false;
  return new RegExp('(?:^|[^A-Z0-9])' + chars.join('[.\\s-]*') + '(?=$|[^A-Z0-9])', 'i').test(text);
}

// Include the cover/model scope and each code occurrence with enough following
// context for multi-page cause tables, without sending an entire large manual.
export function codeExcerpt(text: string, code: string) {
  const chars=code.toUpperCase().replace(/[.\s-]/g,'').split('');
  if(!chars.length || chars.some(c=>!/[A-Z0-9]/.test(c))) return '';
  const pattern=new RegExp('(?:^|[^A-Z0-9])'+chars.join('[.\\s-]*')+'(?=$|[^A-Z0-9])','gi');
  const ranges:Array<[number,number]>=[[0,Math.min(6000,text.length)]];
  for(const match of text.matchAll(pattern)) {
    const start=Math.max(0,match.index-1000),end=Math.min(text.length,match.index+10000);
    const last=ranges.at(-1)!;
    if(start<=last[1]) last[1]=Math.max(last[1],end); else ranges.push([start,end]);
  }
  return ranges.map(([start,end])=>text.slice(start,end)).join('\n[...document excerpt...]\n').slice(0,45000);
}
