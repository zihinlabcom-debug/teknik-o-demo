import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Stage 10 admin controls connect every named field to a visible label',()=>{
  for(const path of [
    'apps/admin/src/components/stage10-operation-intervention.tsx',
    'apps/admin/src/components/stage10-admin-actions.tsx',
  ]){
    const source=read(path);
    const fields=[...source.matchAll(/<(?:input|textarea|select)[^>]*\bname=/g)].length;
    const labels=[...source.matchAll(/<label\s+htmlFor=/g)].length;
    assert.equal(labels,fields,`${path}: every named field must have a linked label`);
    assert.match(source,/useId\(/);
    assert.match(source,/aria-busy=/);
  }
});

test('decision groups, required hints and asynchronous feedback remain accessible',()=>{
  const intervention=read('apps/admin/src/components/stage10-operation-intervention.tsx');
  const actions=read('apps/admin/src/components/stage10-admin-actions.tsx');
  assert.match(intervention,/<fieldset/);assert.match(intervention,/<legend/);
  assert.match(intervention,/aria-describedby=/);assert.match(intervention,/role=\{feedback\.error\?'alert':'status'\}/);
  assert.match(actions,/<fieldset/);assert.match(actions,/<legend/);
  assert.match(actions,/\(zorunlu\)/);assert.match(actions,/role=\{value\.error\?'alert':'status'\}/);
});
