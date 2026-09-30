import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const {AdminDataPool,ADMIN_DATA_POOLS}=await import('../src/components/admin-data-pools.tsx');

const render=(kind,rows)=>renderToStaticMarkup(createElement(AdminDataPool,{kind,...(rows?{rows,connected:true}:{})}));

test('customer management pool is empty and reserves all required record fields',()=>{
  const html=render('customers');
  for(const label of ['Ad Soyad','Telefon','E-posta','Şehir','İlçe','Adres','Kayıt Tarihi','Hesap Durumu'])
    assert.ok(html.includes(label),label);
  assert.ok(html.includes('Henüz kayıtlı müşteri verisi bulunmuyor.'));
  assert.ok(html.includes('gerçek veri bağlantısı henüz etkin değil'));
  assert.ok(!html.includes('<tbody><tr'));
});
test('demand and HR pools remain separate, empty and ready for their own fields',()=>{
  const demand=render('category_demand'),hr=render('hr_applications');
  for(const label of ['Müşteri','Kategori','Alt Kategori','Şehir','İlçe','Açıklama','Durum','Oluşturulma Tarihi'])
    assert.ok(demand.includes(label),label);
  for(const label of ['İsim Soyisim','Telefon','E-posta','Adres','Tanıtım','Durum','Başvuru Tarihi'])
    assert.ok(hr.includes(label),label);
  assert.ok(demand.includes('Henüz kategori talebi bulunmuyor.'));
  assert.ok(hr.includes('Henüz İK başvurusu bulunmuyor.'));
  assert.ok(!demand.includes('Henüz İK başvurusu'));
  assert.ok(!hr.includes('Henüz kategori talebi'));
  assert.equal(Object.keys(ADMIN_DATA_POOLS).length,3);
});
test('shared pool component can later render real rows without an invented empty state',()=>{
  const html=render('customers',[{id:'1',fullName:'Doğrulanmış Test Kaydı',status:'active'}]);
  assert.ok(html.includes('Doğrulanmış Test Kaydı'));
  assert.ok(!html.includes('Henüz kayıtlı müşteri verisi bulunmuyor.'));
});
