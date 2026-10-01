import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const {CleaningInputSelector,toggleHomeExtra,changeUpholsteryQuantity,
 upholsterySelectionAnswer}=await import('../src/components/cleaning-input-selector.tsx');

test('home extras render all choices and exclusive Yok with explicit continuation',()=>{
 const html=renderToStaticMarkup(createElement(CleaningInputSelector,{mode:'home_extras',disabled:false,onContinue(){}}));
 for(const label of ['Fırın','Buzdolabı','Mutfak dolabı','Oda dolabı','Koltuk / sandalye silme',
  'Halı yüzeyi silme','Avize','Duvar silme','Yerleri elle silme','Cam silme','Yok','Devam Et'])
  assert.ok(html.includes(label),label);
 assert.ok(html.includes('disabled=""'));
 let selected=toggleHomeExtra({selected:[],none:false}, 'oven');
 selected=toggleHomeExtra(selected,'fridge');
 assert.deepEqual(selected,{selected:['oven','fridge'],none:false});
 selected=toggleHomeExtra(selected,'none');
 assert.deepEqual(selected,{selected:[],none:true});
 assert.deepEqual(toggleHomeExtra(selected,'walls'),{selected:['walls'],none:false});
});

test('upholstery selector has nine products, non-blocking set information, and quantity controls',()=>{
 const html=renderToStaticMarkup(createElement(CleaningInputSelector,{mode:'upholstery_items',disabled:false,onContinue(){}}));
 assert.equal((html.match(/artır/g)??[]).length,9);
 assert.equal((html.match(/azalt/g)??[]).length,9);
 assert.ok(html.includes('Koltuk takımı / oturma grubu'));
 assert.ok(html.includes('Bilgi: 1 oturma grubu'));
 assert.ok(html.includes('ayrıca adet olarak ekleyebilirsiniz.'));
 assert.ok(!html.includes('Takım ile takım parçalarını birlikte seçmeyin'));
 assert.ok(html.includes('disabled=""'));
 let quantities=changeUpholsteryQuantity({},'sofa_3',1);
 quantities=changeUpholsteryQuantity(quantities,'armchair',2);
 assert.equal(upholsterySelectionAnswer(quantities),"2 adet Berjer, 1 adet 3'lü koltuk");
 assert.deepEqual(changeUpholsteryQuantity(quantities,'sofa_3',-1).sofa_3,0);
 assert.equal(upholsterySelectionAnswer({}),null);
 assert.equal(upholsterySelectionAnswer({sofa_set:1}),'1 adet Koltuk takımı yıkama');
 assert.equal(upholsterySelectionAnswer({sofa_set:1,armchair:1}),
  '1 adet Berjer, 1 adet Koltuk takımı yıkama');
 assert.equal(upholsterySelectionAnswer({sofa_set:2,armchair:2}),
  '2 adet Berjer, 2 adet Koltuk takımı yıkama');
});
