import './helpers/register-ui.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const {ServiceCategoryCards}=await import('../src/components/service-category-cards.tsx');
const {ServiceResultCard,DiagnosisDebugPanel,DiagnosisProgress,TechnicianHandoffNotice}=await import('../src/components/service-result.tsx');
const {RegistrationHeader}=await import('../src/components/registration-header.tsx');
import {hidesFinalTechnicalText,isDebugQuery,visualProgress,servicePricePresentation} from '../src/lib/service-presentation.ts';

const render=(component,props={})=>renderToStaticMarkup(createElement(component,props));
const response={category:'boiler',resultState:'uncertain_price',questionCount:4,answeredSystemQuestions:3,
 candidateProbabilities:[{name:'Eşanjör/ısı bloğu sorunu',probability:65},{name:'Kablolama/soket/bağlantı sorunu',probability:35}],
 groupProbabilities:[{key:'heat',name:'Isı transferi',probability:65,candidateNames:[]}],
 pricingData:null,deterministicOMF:null,estimatedPrice:null};

test('customer category card DOM contains exactly the six active categories and no old categories',()=>{
 const html=render(ServiceCategoryCards,{onSelect(){}});
 assert.equal((html.match(/<button\b/g)??[]).length,6);
 for(const name of ['Kombi','Boya','Temizlik','Nakliye','Koltuk Yıkama','Halı Yıkama'])assert.ok(html.includes(name),name);
 for(const name of ['Klima','Tesisat','Elektrik','Beyaz Eşya','Çilingir'])assert.ok(!html.includes(name),name);
});
test('normal result has no candidate/evidence/percent render; debug-only panel reveals unchanged data',()=>{
 const before=structuredClone(response);
 const normal=render(ServiceResultCard,{result:servicePricePresentation(response),onRequestTechnician(){},onReject(){}})+render(DiagnosisDebugPanel,{enabled:false,response});
 for(const text of ['Eşanjör','%65','Toplam %100','Değerlendirilen olası arızalar','Değerlendirmede kullanılan gözlemler','DEBUG'])assert.ok(!normal.includes(text),text);
 assert.ok(!normal.includes('<li'));
 const debug=render(DiagnosisDebugPanel,{enabled:true,response});
 assert.ok(debug.includes('DEBUG'));assert.ok(debug.includes('Eşanjör/ısı bloğu sorunu'));assert.ok(debug.includes('%65'));
 assert.ok(debug.includes('uncertain_price'));assert.ok(debug.includes('4'));assert.ok(debug.includes('boiler'));
 assert.deepEqual(response,before);
 assert.equal(isDebugQuery('?debug=1'),true);assert.equal(isDebugQuery('?debug=0'),false);assert.equal(isDebugQuery(''),false);
});
test('visual progress uses answer count and remains 100 while the result is still diagnosing',()=>{
 for(const [count,expected] of [[0,0],[1,13],[2,26],[7,91],[8,100],[9,100]]){
  assert.equal(visualProgress(count),expected);
  const html=render(DiagnosisProgress,{answeredSystemQuestions:count,isAnalyzing:false,resultState:'diagnosing'});
  assert.ok(html.includes('aria-valuenow="'+expected+'"'));assert.ok(html.includes('Bilgi toplama'));
  assert.ok(!html.includes('Değerlendirme tamamlandı'));
 }
});
test('uncertain and missing prices have green/red actions without the old final prose',()=>{
 for(const resultState of ['uncertain_price','pricing_missing']){
  const html=render(ServiceResultCard,{result:servicePricePresentation({...response,resultState}),onRequestTechnician(){},onReject(){}});
  assert.ok(html.includes('Belirsiz'));assert.ok(html.includes('Usta çağır'));assert.ok(html.includes('Talebi reddet'));
  assert.ok(html.includes('bg-emerald-600'));assert.ok(html.includes('bg-red-600'));
  assert.ok(!html.includes('Olası arızalar güvenilir biçimde'));
 }
});
test('painting manual review keeps its explanation and uses the shared uncertain-price result actions',()=>{
 const manual={...response,category:'painting',resultState:'painting_manual_review',
  aiText:'Ciddi sıva veya derin hasar standart Boya V1 fiyatına dahil değil. Yerinde inceleme gerekir.',
  estimatedPrice:null,paintingQuote:null};
 assert.equal(hidesFinalTechnicalText(manual.resultState),false);
 assert.deepEqual(servicePricePresentation(manual),{title:'Fiyat',amount:null,lines:[]});
 const html=render(ServiceResultCard,{result:servicePricePresentation(manual),onRequestTechnician(){},onReject(){}});
 assert.ok(html.includes('Servis fiyatı'));
 assert.ok(html.includes('>Fiyat</h3>'));
 assert.ok(html.includes('>Belirsiz</p>'));
 assert.ok(html.includes('Usta çağır'));assert.ok(html.includes('Talebi reddet'));
 assert.ok(html.includes('bg-emerald-600'));assert.ok(html.includes('bg-red-600'));
 assert.ok(!html.includes('TL'));
});
test('provided backend price is displayed; components are not invented into a new total',()=>{
 const priced={...response,resultState:'priced_candidate',estimatedPrice:'4.250 ₺'};
 const html=render(ServiceResultCard,{result:servicePricePresentation(priced),onRequestTechnician(){},onReject(){}});
 assert.ok(html.includes('Tahmini servis tutarı'));assert.ok(html.includes('4.250 ₺'));
 const lines=servicePricePresentation({...priced,estimatedPrice:null,pricingData:{currency:'TRY',labor_price_min:2000,labor_price_max:2500,
  part_price_min:700,part_price_max:900,service_fee:300}});
 assert.equal(lines.amount,null);assert.equal(lines.lines.length,3);
 assert.ok(!JSON.stringify(lines).includes('3.000'));
});
test('diagnosing, verification and safety stop have no normal price/service result card',()=>{
 for(const resultState of ['diagnosing','verification','safety_stop'])assert.equal(servicePricePresentation({...response,resultState}),null);
 assert.equal(render(ServiceResultCard,{result:null,onRequestTechnician(){},onReject(){}}),'');
});
test('registration header uses existing logo and uppercase brand above secondary heading',()=>{
 const html=render(RegistrationHeader);
 assert.ok(html.includes('logo-icon.png'));assert.ok(html.includes('TEKNİK-'));
 assert.ok(html.includes('text-[#D97724]'));assert.ok(html.includes('Müşteri Kaydı'));
 assert.ok(!html.includes('Teknik-O logo'));assert.ok(!html.includes('Teknik-o Müşteri Kaydı'));
 assert.ok(html.indexOf('</h1>')<html.indexOf('Müşteri Kaydı'));
});
test('technician action notice never claims a fake booking or assignment',()=>{
 const html=render(TechnicianHandoffNotice,{onClose(){}});
 assert.ok(html.includes('role="dialog"'));
 for(const phrase of [
  'Ba?ar?yla Olu?turuldu',
  'talebiniz onayland?',
  'adresinize y?nlendirilecektir'
 ]) assert.ok(!html.includes(phrase),phrase);
});
