import './helpers/register-technician-documents.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {state,resetDocumentDouble} from './helpers/technician-documents-db-double.mjs';
const {documentFormat,uploadTechnicianDocument,technicianDocumentLink}=await import('../src/lib/technician-documents.ts');
const pdf=Buffer.from('%PDF-1.7\nTEST');
const file=(name='proof.pdf',type='application/pdf',bytes=pdf)=>new File([bytes],name,{type});

test('PDF/JPEG/PNG magic signatures and strict size/MIME validation',()=>{
  assert.equal(documentFormat(pdf,'application/pdf'),'pdf');
  assert.equal(documentFormat(Buffer.from([255,216,255,0]),'image/jpeg'),'jpg');
  assert.equal(documentFormat(Buffer.from([137,80,78,71,13,10,26,10]),'image/png'),'png');
  assert.equal(documentFormat(pdf,'image/jpeg'),null);
  assert.equal(documentFormat(Buffer.from([1]),'application/pdf'),null);
  assert.equal(documentFormat(Buffer.alloc(5*1024*1024+1),'application/pdf'),null);
});

test('two uploads create private owner paths and category-linked pending metadata',async()=>{
  resetDocumentDouble();
  await uploadTechnicianDocument(file(),state.categoryId);
  await uploadTechnicianDocument(file('second.pdf'),state.categoryId);
  assert.equal(state.uploads.length,2);assert.equal(state.metadata.length,2);
  assert.ok(state.uploads.every(path=>path.startsWith(`technician/${state.owner}/`)));
  assert.ok(state.metadata.every(row=>row.technician_id===state.owner&&
    row.category_id===state.categoryId&&row.status==='pending'));
});

test('invalid file rejected before upload and failed metadata removes storage object',async()=>{
  resetDocumentDouble();
  await assert.rejects(uploadTechnicianDocument(file('wrong.pdf','application/pdf',Buffer.from('oops')),
    state.categoryId));
  assert.equal(state.uploads.length,0);
  state.failMetadata=true;
  await assert.rejects(uploadTechnicianDocument(file(),state.categoryId));
  assert.deepEqual(state.removed,state.uploads);
});

test('signed document access only owner or admin; customer and other technician blocked',async()=>{
  resetDocumentDouble();
  const documentId='40000000-0000-4000-8000-000000000004';
  assert.match(await technicianDocumentLink(documentId),/^https:/);
  state.account={id:'50000000-0000-4000-8000-000000000005',role:'technician'};
  await assert.rejects(technicianDocumentLink(documentId),error=>error.status===403);
  state.account={id:'60000000-0000-4000-8000-000000000006',role:'customer'};
  await assert.rejects(technicianDocumentLink(documentId),error=>error.status===403);
  state.account={id:'10000000-0000-4000-8000-000000000001',role:'admin'};
  assert.match(await technicianDocumentLink(documentId),/^https:/);
});
