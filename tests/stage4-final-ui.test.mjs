import './helpers/register-operation-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';

test('technician form keeps subtitle style and separates address from service multi-select',async()=>{
  const {TechnicianSignupForm}=await import('../src/components/technician-signup-form.tsx');
  const html=renderToStaticMarkup(createElement(TechnicianSignupForm,{
    categories:[{id:'30000000-0000-4000-8000-000000000003',name:'Boya'}],
    cities:[{id:1,name:'İstanbul'}],districts:[{id:2,city_id:1,name:'Kadıköy'}],
  }));
  assert.match(html,/Emeğinizi koruyor, işinizi güvence altına alıyoruz\./);
  assert.match(html,/Adres ili/);assert.match(html,/Adres ilçesi/);assert.match(html,/Açık adres/);
  assert.match(html,/Hizmet verdiğiniz şehir/);assert.match(html,/Hizmet verilen ilçeler/);
  assert.match(html,/aria-expanded="false"/);assert.match(html,/İlçeleri seçin/);
  assert.doesNotMatch(html,/Kadıköy.*type="checkbox"/);
  assert.match(html,/Mesleki yeterlilik \/ ustalık belgeleri/);
  assert.match(html,/multiple=""/);
});

test('admin entry is password-only while customer and technician retain OTP form',async()=>{
  const {default:Admin}=await import('../src/app/giris-admin/page.tsx');
  const {default:Customer}=await import('../src/app/giris/page.tsx');
  const admin=renderToStaticMarkup(createElement(Admin));
  const customer=renderToStaticMarkup(createElement(Customer));
  assert.match(admin,/Yönetici parolası/);assert.match(admin,/Giriş Yap/);
  assert.doesNotMatch(admin,/Telefon Numarası|SMS Doğrulama Kodu/);
  assert.match(customer,/Telefon Numarası/);
});

test('technician missing-document warning and category approval are separate UI actions',()=>{
  const panel=readFileSync(new URL('../src/app/usta/page.tsx',import.meta.url),'utf8');
  const controls=readFileSync(new URL('../src/components/technician-admin-controls.tsx',import.meta.url),'utf8');
  assert.match(panel,/requiresDocument&&!category\.hasVerifiedDocument/);
  assert.match(panel,/mesleki yeterlilik belgenizi/);
  assert.match(controls,/Kategori onayla/);assert.match(controls,/Kategori reddet/);
  assert.match(controls,/document_verify/);assert.match(controls,/document_reject/);
});
