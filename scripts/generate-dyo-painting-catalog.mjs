import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const sourcePath=process.argv[2];
if(!sourcePath)throw Error('Usage: node scripts/generate-dyo-painting-catalog.mjs <source.json>');
const outputPath=process.argv[3]??'src/lib/painting-color-catalog-dyo.ts';
const source=readFileSync(sourcePath);
const catalog=JSON.parse(source.toString('utf8'));
if(catalog.metadata?.brand!=='DYO'||!Array.isArray(catalog.colors))throw Error('Unexpected DYO source shape');
if(!Number.isInteger(catalog.metadata.ready_count)||!Number.isInteger(catalog.metadata.pending_count))
 throw Error('Invalid DYO source metadata');

const seen=new Set(),ready=[];
for(const row of catalog.colors){
 if(row.brand!=='DYO'||typeof row.color_code!=='string'||!row.color_code.trim()||seen.has(row.color_code))
  throw Error(`Invalid or duplicate DYO code: ${row.color_code}`);
 seen.add(row.color_code);
 if(row.official_identity?.code!==row.color_code||row.official_identity?.name!==row.color_name)
  throw Error(`Official identity mismatch: ${row.color_code}`);
 if(row.color_name!==null&&typeof row.color_name!=='string')throw Error(`Invalid name: ${row.color_code}`);
 if(typeof row.collections!=='string'||typeof row.usage_areas!=='string')
  throw Error(`Invalid collections or usage areas: ${row.color_code}`);
 if(row.preview_hex===null||row.preview_hex===undefined||row.preview_hex==='')continue;
 if(typeof row.preview_hex!=='string'||!/^#[0-9A-Fa-f]{6}$/.test(row.preview_hex))
  throw Error(`Invalid preview HEX: ${row.color_code}`);
 ready.push({brand:'DYO',colorCode:row.color_code,colorName:row.color_name,
  previewHex:row.preview_hex,collections:row.collections.split('|').map(s=>s.trim()),
  usageAreas:row.usage_areas.split('|').map(s=>s.trim())});
}
if(ready.length!==catalog.metadata.ready_count)
 throw Error(`Ready count mismatch: ${ready.length} != ${catalog.metadata.ready_count}`);
const hash=createHash('sha256').update(source).digest('hex');
const lines=[
 '// Generated from DYO_TeknikO_Uygulama_Renk_Katalogu_v1.json. Do not edit source identities by hand.',
 '// previewHex is a secondary digital preview, NOT an official DYO HEX specification.',
 'export interface DyoColor {',
 '  brand:"DYO";colorCode:string;colorName:string|null;previewHex:string;',
 '  collections:readonly string[];usageAreas:readonly string[];',
 '}',
 `export const DYO_SOURCE_SHA256=${JSON.stringify(hash)};`,
 `export const DYO_SOURCE_RECORD_COUNT=${catalog.colors.length};`,
 `export const DYO_METADATA_READY_COUNT=${catalog.metadata.ready_count};`,
 `export const DYO_METADATA_PENDING_COUNT=${catalog.metadata.pending_count};`,
 `export const DYO_MISSING_PREVIEW_COUNT=${catalog.colors.length-ready.length};`,
 'export const DYO_PREVIEW_WARNING="Ekrandaki renkler önizleme amaçlıdır. Nihai renk seçimi DYO renk koduna göre yapılır.";',
 'export const DYO_READY_COLORS:readonly DyoColor[]=[',
 ...ready.map(color=>`  ${JSON.stringify(color)},`),
 '];',
 'export const isDyoInteriorColor=(color:Pick<DyoColor,"usageAreas">)=>color.usageAreas.includes("İç Cephe");',
 'export const DYO_WALL_COLORS:readonly DyoColor[]=DYO_READY_COLORS.filter(isDyoInteriorColor);',
 'export const findDyoWallColor=(code:string):DyoColor|undefined=>DYO_WALL_COLORS.find(color=>color.colorCode===code);',
 'const searchText=(value:string)=>value.toLocaleLowerCase("tr-TR").normalize("NFD")',
 '  .replace(/[\\u0300-\\u036f]/g,"").replace(/ı/g,"i");',
 'export const searchDyoWallColors=(query:string):readonly DyoColor[]=>{',
 '  const needle=searchText(query.trim());',
 '  return needle?DYO_WALL_COLORS.filter(color=>searchText(`${color.colorCode} ${color.colorName??""}`).includes(needle)):DYO_WALL_COLORS;',
 '};',
 '',
];
writeFileSync(outputPath,lines.join('\n'),'utf8');
console.log(JSON.stringify({source:sourcePath,records:catalog.colors.length,ready:ready.length,
 pending:catalog.metadata.pending_count,interior:ready.filter(color=>color.usageAreas.includes('İç Cephe')).length,
 missingPreview:catalog.colors.length-ready.length,missingName:ready.filter(color=>color.colorName===null).length,
 sha256:hash}));
