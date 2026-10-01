import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const {CleaningCarpetInputSelector,changeCarpetQuantity,setCarpetArea,carpetSelectionMissing,carpetSelectionAnswer}=
 await import('../src/components/cleaning-carpet-input-selector.tsx');

test('selector starts at zero and renders separate controls for every listed product',()=>{
 const html=renderToStaticMarkup(createElement(CleaningCarpetInputSelector,{disabled:false,onContinue(){}}));
 assert.equal((html.match(/ artır/g)??[]).length,15);
 assert.equal((html.match(/ azalt/g)??[]).length,15);
 assert.equal((html.match(/ adet/g)??[]).length,15);
 assert.ok(html.includes('Sepette en az bir ürün seçin.'));
 assert.ok(html.includes('disabled=""'));
});
test('two rugs and two curtains keep independent area fields and mixed counts',()=>{
 let selection={};
 selection=changeCarpetQuantity(selection,'acrylic',1);
 selection=changeCarpetQuantity(selection,'acrylic',1);
 selection=setCarpetArea(selection,'acrylic',0,'4,2');
 assert.match(carpetSelectionMissing(selection),/2\. ürünün m²/);
 selection=setCarpetArea(selection,'acrylic',1,'6.1');
 selection=changeCarpetQuantity(selection,'roller_blind',1);
 selection=changeCarpetQuantity(selection,'roller_blind',1);
 selection=setCarpetArea(selection,'roller_blind',0,'2.2');
 selection=setCarpetArea(selection,'roller_blind',1,'3.1');
 selection=changeCarpetQuantity(selection,'blanket',1);
 assert.equal(carpetSelectionMissing(selection),null);
 assert.equal(carpetSelectionAnswer(selection),
  'Akrilik Halı Yıkama: 4.2 m² + 6.1 m²; Stor Perde Yıkama: 2.2 m² + 3.1 m²; Battaniye Yıkama: 1 adet');
 assert.deepEqual(changeCarpetQuantity(selection,'acrylic',-1).acrylic.areas,['4,2']);
});
