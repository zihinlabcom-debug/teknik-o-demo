import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,rmdirSync,unlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DYO_READY_COLORS,DYO_WALL_COLORS,DYO_SOURCE_RECORD_COUNT,DYO_METADATA_READY_COUNT,
 DYO_METADATA_PENDING_COUNT,DYO_MISSING_PREVIEW_COUNT,DYO_PREVIEW_WARNING,
 findDyoWallColor,isDyoInteriorColor,searchDyoWallColors} from '../src/lib/painting-color-catalog-dyo.ts';
import {diagnosePainting,decodePaintingState,CHANGE_DYO_COLOR_OPTION,
 DYO_CATALOG_OPTION,MANUAL_COLOR_OPTION,calculatePaintingPrice} from '../src/lib/painting-engine.ts';
const {PaintingColorCatalog}=await import('../src/components/painting-color-catalog.tsx');

async function signed(fn){
 const before=process.env.DIAGNOSIS_STATE_SECRET;process.env.DIAGNOSIS_STATE_SECRET='offline-dyo-catalog-test-secret';
 try{return await fn();}finally{if(before===undefined)delete process.env.DIAGNOSIS_STATE_SECRET;else process.env.DIAGNOSIS_STATE_SECRET=before;}
}
async function brandQuestion(){
 let result=await diagnosePainting('Boya hizmeti istiyorum',[],null);
 for(const answer of ['Komple ev','100 m²','3','Eşyalı','2,5 metre','Yalnız duvarlar',
  'Eski boyalı','Yok','Koyu','Açık','Silikonlu mat'])
  result=await diagnosePainting(answer,[],result.stateToken);
 assert.equal(decodePaintingState(result.stateToken).currentQuestionKey,'brandColor');
 return result;
}

test('the typed DYO source includes exactly the ready rows and preserves official code/name identities',()=>{
 assert.equal(DYO_SOURCE_RECORD_COUNT,208);assert.equal(DYO_METADATA_READY_COUNT,208);
 assert.equal(DYO_METADATA_PENDING_COUNT,286);assert.equal(DYO_MISSING_PREVIEW_COUNT,0);
 assert.equal(DYO_READY_COLORS.length,208);assert.equal(DYO_WALL_COLORS.length,208);
 assert.equal(new Set(DYO_READY_COLORS.map(color=>color.colorCode)).size,208);
 assert.equal(DYO_READY_COLORS.filter(color=>color.colorName===null).length,132);
 assert.ok(DYO_READY_COLORS.every(color=>color.brand==='DYO'&&/^#[0-9A-Fa-f]{6}$/.test(color.previewHex)));
 assert.ok(DYO_WALL_COLORS.every(isDyoInteriorColor));
 assert.equal(isDyoInteriorColor({usageAreas:['Hobi','Ahşap/Metal']}),false);
 assert.equal(isDyoInteriorColor({usageAreas:['Dış Cephe','İç Cephe']}),true);
 assert.equal(findDyoWallColor('6269').colorName,'DENİZ ATI');
 assert.equal(findDyoWallColor('6269').previewHex,'#DAE5E4');
 assert.equal(findDyoWallColor('0390').colorName,null);
 assert.equal(findDyoWallColor('9999'),undefined);
});

test('the source converter excludes a pending row without preview instead of creating a visual color',()=>{
 const folder=mkdtempSync(join(tmpdir(),'teknik-o-dyo-test-'));
 const source=join(folder,'source.json'),output=join(folder,'colors.ts');
 const row=(code,preview,usage)=>({brand:'DYO',color_code:code,color_name:null,
  collections:'Test',usage_areas:usage,preview_hex:preview,official_identity:{code,name:null}});
 try{
  writeFileSync(source,JSON.stringify({metadata:{brand:'DYO',ready_count:2,pending_count:1},
   colors:[row('1001','#AABBCC','İç Cephe'),row('1002','#DDEEFF','Hobi'),row('1003',null,'İç Cephe')]}));
  execFileSync(process.execPath,[fileURLToPath(new URL('../scripts/generate-dyo-painting-catalog.mjs',import.meta.url)),source,output]);
  const generated=readFileSync(output,'utf8');
  assert.match(generated,/"colorCode":"1001"/);
  assert.match(generated,/"colorCode":"1002"/);
  assert.doesNotMatch(generated,/"colorCode":"1003"/);
  assert.match(generated,/DYO_MISSING_PREVIEW_COUNT=1/);
 }finally{
  if(existsSync(source))unlinkSync(source);if(existsSync(output))unlinkSync(output);rmdirSync(folder);
 }
});

test('search finds code and Turkish color names without turning pending records into swatches',()=>{
 assert.deepEqual(searchDyoWallColors('6269').map(c=>c.colorCode),['6269']);
 assert.deepEqual(searchDyoWallColors('deniz ati').map(c=>c.colorCode),['6269']);
 assert.deepEqual(searchDyoWallColors('Alaçatı').map(c=>c.colorCode),['7252']);
 assert.deepEqual(searchDyoWallColors('7550').map(c=>c.colorCode),['7550']);
 assert.equal(searchDyoWallColors('').length,DYO_WALL_COLORS.length);
 assert.deepEqual(searchDyoWallColors('olmayan renk'),[]);
});

test('the chat catalog renders visible color cards, search and the non-official-preview warning',()=>{
 const html=renderToStaticMarkup(createElement(PaintingColorCatalog,{onSelect:()=>{}}));
 assert.match(html,/DYO renk kataloğu/);assert.match(html,/Renk adı veya kodu ara/);
 assert.ok(html.includes(DYO_PREVIEW_WARNING));
 assert.match(html,/DENİZ ATI/);assert.match(html,/6269/);assert.match(html,/#DAE5E4/i);
 assert.match(html,/DYO 0390/);
 assert.equal((html.match(/<button/g)??[]).length,208);
 assert.doesNotMatch(html,/birebir aynıdır/i);
});

test('brand/color question offers catalog or manual entry; other manual brands still quote',()=>signed(async()=>{
 const original=await brandQuestion();
 assert.equal(original.aiText,'Boya markası ve renk kodu nedir?');
 assert.deepEqual(original.options,[DYO_CATALOG_OPTION,MANUAL_COLOR_OPTION]);
 assert.equal(original.isReadyForPrice,false);
 for(const [input,brand,code] of [
  ['DYO 6269 Deniz Atı','DYO','6269 Deniz Atı'],
  ['Filli Boya Rezene 190','Filli Boya','Rezene 190'],
  ['Marshall 1234','Marshall','1234'],
 ]){
  const manual=await diagnosePainting(MANUAL_COLOR_OPTION,[],original.stateToken);
  assert.equal(manual.resultState,'painting_question');assert.deepEqual(manual.options,[]);
  const priced=await diagnosePainting(input,[],manual.stateToken);
  assert.equal(priced.resultState,'priced',input);
  const fields=decodePaintingState(priced.stateToken).fields;
  assert.equal(fields.paintBrand,brand);assert.equal(fields.colorCode,code);
  assert.equal(fields.colorSelectionSource,'manual');assert.equal(priced.estimatedPrice,'46.011,34 TL');
 }
}));

test('catalog selection validates source code, changes color without confirmation and keeps price mathematics',()=>signed(async()=>{
 const initial=await brandQuestion();
 const catalog=await diagnosePainting(DYO_CATALOG_OPTION,[],initial.stateToken);
 assert.equal(catalog.resultState,'painting_color_catalog');
 assert.equal(catalog.isReadyForPrice,false);assert.equal(catalog.paintingQuote,null);
 assert.equal(decodePaintingState(catalog.stateToken).fields.paintBrand,'DYO');
 assert.equal(decodePaintingState(catalog.stateToken).fields.colorCode,undefined);
 const invalid=await diagnosePainting('DYO renk kodu: 9999',[],catalog.stateToken);
 assert.equal(invalid.resultState,'painting_color_catalog');
 assert.equal(decodePaintingState(invalid.stateToken).fields.colorCode,undefined);
 const selected=await diagnosePainting('DYO renk kodu: 6269',[],invalid.stateToken);
 assert.equal(selected.resultState,'priced');assert.equal(selected.isReadyForPrice,true);
 assert.ok(!selected.options.includes('Bu renkle devam et'));
 const fields=decodePaintingState(selected.stateToken).fields;
 assert.equal(fields.paintBrand,'DYO');assert.equal(fields.colorCode,'6269');
 assert.equal(fields.colorName,'DENİZ ATI');assert.equal(fields.colorSelectionSource,'dyo_catalog');
 const change=await diagnosePainting(CHANGE_DYO_COLOR_OPTION,[],selected.stateToken);
 assert.equal(change.resultState,'painting_color_catalog');
 assert.equal(decodePaintingState(change.stateToken).fields.colorCode,undefined);
 assert.equal(change.answeredSystemQuestions,selected.answeredSystemQuestions);
 const nameless=await diagnosePainting('DYO renk kodu: 0390',[],change.stateToken);
 assert.equal(nameless.resultState,'priced');
 assert.equal(decodePaintingState(nameless.stateToken).fields.colorName,null);
 assert.equal(nameless.answeredSystemQuestions,selected.answeredSystemQuestions);
 const changeAgain=await diagnosePainting(CHANGE_DYO_COLOR_OPTION,[],nameless.stateToken);
 const priced=await diagnosePainting('DYO renk kodu: 6269',[],changeAgain.stateToken);
 assert.equal(priced.resultState,'priced');assert.equal(priced.estimatedPrice,'46.011,34 TL');
 assert.equal(priced.paintingQuote.finalPrice,46011.34);
 const priceFields=decodePaintingState(priced.stateToken).fields;
 assert.equal(calculatePaintingPrice(priceFields).finalPrice,priced.paintingQuote.finalPrice);
 const afterPriceChange=await diagnosePainting(CHANGE_DYO_COLOR_OPTION,[],priced.stateToken);
 assert.equal(afterPriceChange.resultState,'painting_color_catalog');
 assert.equal(afterPriceChange.isReadyForPrice,false);
 assert.equal(afterPriceChange.answeredSystemQuestions,priced.answeredSystemQuestions);
}));

test('a color choice with another missing prerequisite asks that question before pricing',()=>signed(async()=>{
 const initial=await brandQuestion();
 const catalog=await diagnosePainting(DYO_CATALOG_OPTION,[],initial.stateToken);
 const state=decodePaintingState(catalog.stateToken);
 delete state.fields.oldColorTone;
 const body=Buffer.from(JSON.stringify({state,expires:Date.now()+60000})).toString('base64url');
 const mac=createHmac('sha256',process.env.DIAGNOSIS_STATE_SECRET)
  .update('painting-v1:'+body).digest('base64url');
 const incomplete=`painting.${body}.${mac}`;
 const selected=await diagnosePainting('DYO renk kodu: 6269',[],incomplete);
 assert.equal(selected.resultState,'painting_question');
 assert.equal(selected.isReadyForPrice,false);
 assert.equal(selected.paintingQuote,null);
 assert.equal(decodePaintingState(selected.stateToken).fields.colorCode,'6269');
 assert.equal(decodePaintingState(selected.stateToken).currentQuestionKey,'oldColorTone');
 const completed=await diagnosePainting('Koyu',[],selected.stateToken);
 assert.equal(completed.resultState,'priced');
}));
