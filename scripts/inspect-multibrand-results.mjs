// Post-test document inspection only; never calls the research model or changes results.
import {readFile,writeFile} from 'node:fs/promises';
import {readManufacturerDocument,sourceContains,codeExcerpt} from '../src/lib/manufacturer-document.ts';
import {normalizePartText} from '../src/lib/parts-catalog.ts';
const dir='test-results/multibrand-generalization';
const run=JSON.parse(await readFile(dir+'/results.json','utf8'));
const output=[];
for(const brand of ['Baymak','Immergas','Buderus']) {
  const row=run.results.find(r=>r.identity.brand===brand);
  const domains=run.approvedDomains[normalizePartText(brand)];
  const doc=await readManufacturerDocument(row.sourceUrl,url=>{
    const u=new URL(url);return u.protocol==='https:'&&domains.some(d=>u.hostname===d||u.hostname.endsWith('.'+d));
  });
  const patterns=brand==='Immergas'?[/27\s+Circolazione[\s\S]{0,1800}/gi,/Circolazione insufficiente[\s\S]{0,500}/gi]:
    brand==='Baymak'?[/E01[\s\S]{0,900}/gi,/DUOTEC[\s\S]{0,120}/gi]:[/6\s*A/gi,/ar[ıi]za[\s\S]{0,220}/gi];
  const hits=patterns.flatMap(p=>[...doc.text.matchAll(p)].slice(0,12).map(m=>({offset:m.index,text:m[0]})));
  const item={brand,url:doc.url,documentLength:doc.text.length,
    excerptLength:codeExcerpt(doc.text,row.identity.code).length,
    error27CirculationIncludedInModelInput:brand==='Immergas'?/27\s+Circolazione/.test(codeExcerpt(doc.text,'27')):undefined,hits};
  output.push(item);console.log(JSON.stringify(item));
}
const warm=await readFile(dir+'/warmhaus-document-excerpt.txt','utf8');
output.push({brand:'Warmhaus',sourceContainsEwa:sourceContains(warm,'Ewa'),
  ordinaryCaseInsensitiveContains:warm.toLocaleLowerCase('tr-TR').includes('ewa'),firstLines:warm.slice(0,120),
  reason:'sourceContains requires quote.trim().length >= 4; Ewa has 3 characters.'});
await writeFile(dir+'/document-inspection.json',JSON.stringify(output,null,2));
