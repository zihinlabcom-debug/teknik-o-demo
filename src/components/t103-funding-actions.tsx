'use client';
import {useState}from'react';import{useRouter}from'next/navigation';
import{Stage12IyzicoSandboxPayment}from'../../apps/customer/src/components/stage12-iyzico-sandbox-payment';
import type{T103Funding}from'../lib/t100-contract';
const money=(n:number)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n/100);
export function T103FundingActions({funding,requestId,jobId,role,reviewOpen,finalizing}:{funding:T103Funding;requestId:string;jobId?:string|null;role:'customer'|'technician'|'admin';reviewOpen:boolean;finalizing:boolean}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const additional=funding.parts.filter(p=>p.purpose==='additional');if(!additional.length)return null;
 async function act(action:'retry_authorization'|'funding_review',part:T103Funding['parts'][number]){
  if(busy||finalizing)return;setBusy(true);setMessage('');
  const endpoint=action==='funding_review'?'/api/t100/jobs/'+jobId:'/api/t100/requests/'+requestId;
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,costId:part.costId,...(action==='retry_authorization'?{approvalVersion:part.approvalVersion}:{})})});const body=await response.json().catch(()=>({}));setMessage(response.ok?(body.message??'Güncel ödeme durumu hazırlanıyor.'):body.error??'İşlem doğrulanamadı.');router.refresh();}
  catch{setMessage('Sonuç doğrulanamadı. Yeni ödeme göndermeden önce güncel durumu kontrol edin.');router.refresh();}finally{setBusy(false);}
 }
 return <section aria-label="Ek hizmet ödeme güvencesi"className="space-y-3 rounded-xl border border-amber-300 p-4">
 <h3 className="font-bold">Ek hizmet ödeme güvencesi</h3><p className="text-sm">Onaylı toplam: {money(funding.approvedMinor)} · Doğrulanmış güvence: {money(funding.securedMinor)}</p>
 {!funding.fullySecured&&<p role="status"className="text-sm">Ek maliyet onayı tek başına ödeme güvencesi değildir. Güvencesi doğrulanmamış ek işin yapılması beklenmez. İlk provizyon otomatik iptal edilmez.</p>}
 {additional.map(part=><div key={part.intentId}className="space-y-2 rounded-xl bg-slate-50 p-3"><p className="text-sm font-bold">Ek hizmet: {money(part.amountMinor)}</p><p className="text-sm">{part.secured?'Provizyon doğrulandı.':part.uncertain?'Sağlayıcı sonucu belirsiz; yeni provizyon gönderilmez.':part.canRetry?'Önceki provizyonun reddi doğrulandı.':'Provizyon doğrulaması bekleniyor.'}</p>
 {role==='customer'&&!part.secured&&!finalizing&&(part.canRetry?<button disabled={busy}onClick={()=>void act('retry_authorization',part)}className="min-h-11 rounded-xl bg-[#C86B32] px-4 py-2 font-bold text-white">Başka kartla yeni ödeme denemesi hazırla</button>:<Stage12IyzicoSandboxPayment key={part.intentId+String(part.uncertain)} intentId={part.intentId}purpose="additional"initialReview={part.uncertain}/>)}
 {role==='technician'&&!part.secured&&!reviewOpen&&!finalizing&&jobId&&<button disabled={busy}onClick={()=>void act('funding_review',part)}className="min-h-11 rounded-xl border border-amber-500 px-4 py-2 font-bold">Ek ödeme için inceleme iste</button>}
 </div>)}
 {reviewOpen&&<p className="text-sm">İnceleme açık. Hizmet otomatik tamamlanmış veya iptal edilmiş sayılmaz; bu başvuru ceza puanı oluşturmaz.</p>}
 {message&&<p role="status"className="text-sm">{message}</p>}
 </section>;
}
