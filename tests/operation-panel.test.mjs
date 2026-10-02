import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const render=async file=>{
 const {default:Page}=await import(`../src/app/${file}/page.tsx`);
 return renderToStaticMarkup(createElement(Page));
};

test('customer panel routes render empty operations and a safe missing request detail',async()=>{
 const home=await render('musteri');
 assert.ok(home.includes('Aktif talep'));
 assert.ok(home.includes('Henüz aktif talebiniz bulunmuyor.'));
 assert.ok(home.includes('Son işlemler'));
 assert.ok(home.includes('/musteri/taleplerim'));
 const requests=await render('musteri/taleplerim');
 assert.ok(requests.includes('Henüz hizmet talebiniz bulunmuyor.'));
 for(const status of ['Aktif','tamamlanan','iptal edilen'])assert.ok(requests.includes(status));
 const detail=await render('musteri/taleplerim/[id]');
 for(const field of ['Hizmet / kategori','Talep durumu','Oluşturulma zamanı','Fiyat','Atanan usta','Hizmet adresi','Durum zaman çizelgesi'])
  assert.ok(detail.includes(field),field);
 assert.ok(detail.includes('görüntülenebilir bir kayıt bulunmuyor'));
 assert.ok(detail.includes('Henüz olay kaydı bulunmuyor.'));
});

test('provider routes render only empty jobs, safe detail and disabled extra-cost fields',async()=>{
 const home=await render('usta');
 assert.ok(home.includes('Henüz size gösterilen yeni iş bulunmuyor.'));
 assert.ok(home.includes('Henüz aktif işiniz bulunmuyor.'));
 const offered=await render('usta/yeni-isler');
 for(const field of ['Hizmet','Bölge','İş tutarı','Talep zamanı','Kabul / red'])assert.ok(offered.includes(field));
 assert.ok(!offered.includes('İş kabul edildi'));
 const active=await render('usta/aktif-isler');
 assert.ok(active.includes('Henüz aktif işiniz bulunmuyor.'));
 const detail=await render('usta/is/[id]');
 for(const field of ['Müşteri','Hizmet adresi','Kabul zamanı','İş başlatma','tamamlama','Ek maliyet talebi'])assert.ok(detail.includes(field));
 assert.ok(detail.includes('görüntülenebilir bir kayıt bulunmuyor'));
 const extra=await render('usta/ek-maliyet');
 for(const field of ['Gerekçe','Talep edilen fark','Ek işlem açıklaması','Fotoğraf kanıtı'])assert.ok(extra.includes(field));
 assert.ok(extra.includes('<fieldset disabled=""'));
 assert.ok(!extra.includes('type="submit"'));
});

test('admin routes render all operational empty shells without invented records or metrics',async()=>{
 const home=await render('admin');
 for(const heading of ['Açık talepler','Eşleşme bekleyen','Aktif işler','Tamamlanan işler'])assert.ok(home.includes(heading));
 assert.ok(home.includes('Veri entegrasyonu bekleniyor'));
 assert.ok(!home.includes('125.000'));
 const requests=await render('admin/talepler');
 for(const field of ['Talep ID','Tarih','Müşteri','Kategori','Durum','Fiyat','Usta','TEST / GERÇEK'])assert.ok(requests.includes(field));
 assert.equal((requests.match(/<select disabled=""/g)??[]).length,3);
 const detail=await render('admin/talepler/[id]');
 for(const field of ['Operasyon notu','Durum zaman çizelgesi','Ek maliyet'])assert.ok(detail.includes(field));
 assert.ok(detail.includes('görüntülenebilir bir kayıt bulunmuyor'));
 const customers=await render('admin/musteriler');
 for(const field of ['Telefon','E-posta','Şehir','İlçe','Adres','Hesap durumu','Toplam talep','Tamamlanan iş','Tekrar kullanım','TEST / GERÇEK'])assert.ok(customers.includes(field));
 const providers=await render('admin/ustalar');
 for(const field of ['Kategori','Bölge','Aktif / müsait','Gösterilen iş','Kabul edilen'])assert.ok(providers.includes(field));
 const extra=await render('admin/ek-maliyet');
 for(const field of ['İstenen fark','Fotoğraf kanıtı','Durum'])assert.ok(extra.includes(field));
 const kpi=await render('admin/pilot-kpi');
 for(const field of ['Toplam hizmet talebi','GMV','Teknik-O geliri','İptal oranı','Kategori bazında talep / işlem hacmi'])assert.ok(kpi.includes(field));
 assert.ok(kpi.includes('Pilot verileri toplandığında burada görüntülenecek.'));
 assert.ok(!kpi.includes('125.000'));
 const categories=await render('admin/kategoriler');
 assert.ok(categories.includes('Aktif / pasif'));
 const settings=await render('admin/ayarlar');
 assert.ok(settings.includes('Minimum ücretler'));
 assert.ok(settings.includes('Bölge ayarları'));
 assert.ok((await render('admin/talep-havuzu')).includes('Henüz kategori talebi bulunmuyor.'));
 assert.ok((await render('admin/ik-havuzu')).includes('Henüz İK başvurusu bulunmuyor.'));
});

test('shared panel navigation and TEST/GERÇEK badges do not assign fabricated record types',async()=>{
 const {OperationPanelShell,RecordTypeBadge}=await import('../src/components/operation-panel.tsx');
 const shell=renderToStaticMarkup(createElement(OperationPanelShell,{area:'Yönetim paneli',subtitle:'Boş',
  links:[{href:'/admin',label:'Özet'},{href:'/admin/pilot-kpi',label:'Pilot / KPI'}]},'İçerik'));
 assert.ok(shell.includes('Yönetim paneli navigasyonu'));
 assert.ok(shell.includes('/admin/pilot-kpi'));
 assert.ok(shell.includes('overflow-x-auto'));
 assert.ok(renderToStaticMarkup(createElement(RecordTypeBadge,{kind:'TEST'})).includes('TEST'));
 assert.ok(renderToStaticMarkup(createElement(RecordTypeBadge,{kind:'GERÇEK'})).includes('GERÇEK'));
 assert.ok(!shell.includes('TEST</span>'));
});
