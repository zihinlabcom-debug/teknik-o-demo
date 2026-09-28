import { get } from 'node:https';
import type { IncomingMessage } from 'node:http';
export { sourceContains, containsErrorCode, codeExcerpt } from './manufacturer-document-text';

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
      // Legacy research loads the server PDF engine only for an actual PDF.
      const { PDFParse } = await import('pdf-parse');
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
