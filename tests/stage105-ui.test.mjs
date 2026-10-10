import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(p){const code=ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('module','exports',code)(module,module.exports);return module.exports;}
for(const app of ['customer','technician','admin']){
 test(`${app}: same-tick duplicate action is blocked and rejection releases lock`,async()=>{
  const {beginUiAction,endUiAction}=load(`apps/${app}/src/lib/use-ui-action.ts`);const setter=()=>{};const other=()=>{};
  assert.equal(beginUiAction(setter),true);assert.equal(beginUiAction(setter),false);assert.equal(beginUiAction(other),true);
  try{await Promise.reject(new Error('network'));}catch{}finally{endUiAction(setter);endUiAction(other);}
  assert.equal(beginUiAction(setter),true);endUiAction(setter);
 });
 test(`${app}: UI status and currency are Turkish without dropping unknown event identity`,()=>{
  const {statusLabel,moneyLabel,eventLabel}=load(`apps/${app}/src/lib/ui-labels.ts`);
  assert.equal(statusLabel('technician_unavailable'),'Usta bulunamadı');assert.equal(statusLabel('pending_customer'),'Müşteri kararı bekleniyor');
  assert.match(moneyLabel(1234.5),/1\.234,50/);assert.match(eventLabel('future.event'),/future.event/);
 });
}
test('display translations never replace actionable Stage 10 enum props',()=>{
 const tech=read('apps/technician/src/app/usta/garanti-duzeltmeleri/page.tsx');
 assert.match(tech,/<WarrantyCorrectionAction[^>]*status=\{c\.status\}/);
 const admin=read('apps/admin/src/app/admin/ek-maliyet/page.tsx');
 assert.match(admin,/<AdditionalCostAdminAction[^>]*status=\{c\.status\}/);
});
