'use client';
import{T103FundingActions}from'./t103-funding-actions';
import {useEffect,useState} from 'react';import {useRouter} from 'next/navigation';
import type {T100State} from '../lib/t100-contract';
const money=(n:number)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(n/100);
const when=(value:string)=>new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
const button='min-h-11 rounded-xl bg-[#C86B32] px-4 py-3 text-sm font-bold text-white disabled:opacity-50';
export function T100ServiceActions({role,requestId,jobId,initialState}:{role:'customer'|'technician'|'admin';requestId:string;jobId?:string;initialState:T100State}){
 const router=useRouter();const [state,setState]=useState(initialState);const [confirming,setConfirming]=useState(false);
 const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const endpoint=role==='customer'?'/api/t100/requests/'+requestId:'/api/t100/jobs/'+jobId;
 const needsPolling=role==='customer'&&(!['completed','cancelled'].includes(state.jobStatus??'')||Boolean(state.policy&&state.policy.action!=='closed')||Boolean(state.completion&&!state.completion.voided_at&&!state.completion.resolution)||Boolean(state.finalization&&state.finalization.state!=='verified'));
 useEffect(()=>{
  if(!needsPolling)return;
  const controller=new AbortController();
  const timer=setInterval(async()=>{
   if(document.visibilityState!=='visible')return;
   try{const response=await fetch('/api/t100/requests/'+requestId,{cache:'no-store',signal:controller.signal});if(response.ok)setState(await response.json());}catch{/* Read failure never changes the known business state. */}
  },15000);
  return()=>{clearInterval(timer);controller.abort();};
 },[needsPolling,requestId]);
 async function act(body:Record<string,unknown>){
  if(busy)return;setBusy(true);setMessage('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok){setMessage(result.error??'İşlem kaydedilemedi. Güncel durumu kontrol edin.');setConfirming(false);router.refresh();return;}
   if(result.state)setState(result.state);
   setConfirming(false);
   if(result.redirect){router.push(result.redirect);return;}
   setMessage(result.message??'İşlem kaydedildi. Hizmet ve finans durumunu aşağıdan takip edebilirsiniz.');router.refresh();
  }catch{setMessage('Sonuç alınamadı. Tekrar göndermeden önce güncel durumu kontrol edin.');router.refresh();}
  finally{setBusy(false);}
 }
 const c=state.completion,policy=state.policy;
 const canAnswer=role==='customer'&&c&&!c.voided_at&&c.response==='pending'&&!c.resolution&&!state.finalization&&state.review?.status!=='open';
 const customerReviewHold=role==='customer'&&(c?.response==='no'||state.review?.status==='open');
 const canCancel=policy&&policy.action!=='closed'&&!state.finalization&&!c?.resolution&&!customerReviewHold;
 return <section aria-label="Hizmet onayı ve iptal işlemleri" className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-5">
  <h2 className="text-lg font-extrabold text-[#082B4C]">Hizmet işlemleri</h2>
  {c&&!c.voided_at&&<div className="rounded-xl bg-[#F5F7FA] p-4 text-sm leading-6">
   <p className="font-bold">{c.response==='no'?'Tamamlanma itirazı inceleme bekliyor':c.resolution==='timeout'?'Bir saatlik yanıt süresi dolduğu için tamamlandı':c.resolution?'Tamamlanma kararı kaydedildi':'Usta işin tamamlandığını bildirdi'}</p>
   {!c.resolution&&c.response==='pending'&&<p>Yanıt süresi: {when(c.deadline)}. Bir saat içinde yanıt verilmezse hizmet otomatik tamamlanmış kabul edilir.</p>}
   {canAnswer&&<div className="mt-3"><p className="mb-3 font-bold">İşiniz tamamlandı mı?</p><div className="flex flex-wrap gap-3">
    <button className={button} disabled={busy} onClick={()=>act({action:'answer',answer:'yes',jobId:state.jobId,reportVersion:c.version})}>EVET</button>
    <button className="min-h-11 rounded-xl border border-[#082B4C] px-4 py-3 text-sm font-bold text-[#082B4C] disabled:opacity-50" disabled={busy} onClick={()=>act({action:'answer',answer:'no',jobId:state.jobId,reportVersion:c.version})}>HAYIR</button>
   </div></div>}
   {role==='customer'&&c.response==='no'&&!c.resolution&&<a className="mt-3 inline-block font-bold underline" href={'/musteri/sikayetler?requestId='+encodeURIComponent(requestId)+'&purpose=completion_review'}>Mevcut şikâyet başvurusunu tamamla</a>}
  </div>}
  {state.review&&<div className="text-sm"><p>İptal/inceleme başvurusu: {state.review.status==='open'?'İnceleniyor':'Karar verildi'}. Hizmet durumu ve finans sonucu ayrı izlenir.</p>{role==='customer'&&state.review.status==='open'&&!state.review.complaintId&&<a className="mt-2 inline-block font-bold underline" href={'/musteri/sikayetler?requestId='+encodeURIComponent(requestId)}>Mevcut şikâyet başvurusunu tamamla</a>}</div>}
  {state.complaint&&<p className="text-sm">Şikâyet başvurusu: {state.complaint.status==='resolved'?'Sonuçlandı':'İnceleniyor'}. Bu durum finansal sonuçtan ayrıdır.</p>}
  {state.funding&&<T103FundingActions funding={state.funding}requestId={requestId}jobId={jobId??state.jobId}role={role}reviewOpen={state.review?.status==='open'}finalizing={Boolean(state.finalization)}/>}
  {state.preparation&&<p role="status" className="rounded-xl bg-amber-50 p-4 text-sm">Finansal sonuçlandırma başlatılmadı. {state.preparation.code==='price_authorization_mismatch'?'Onaylanan fiyat ve provizyon uyuşmuyor; inceleme gerekiyor.':'Sonuçlandırma hazırlığı kontrol bekliyor.'}</p>}
  {state.finalization&&<div role="status" className="rounded-xl bg-[#F5F7FA] p-4 text-sm leading-6"><p className="font-bold">Finans durumu</p><p>{state.finalization.action==='refund'?'Tam iade / provizyon kapatma':state.finalization.action==='cancel'?'İptal finans işlemi':'Hizmet ödeme sonuçlandırması'}</p>
   <p>{state.finalization.state==='verified'?'Finansal sonuç doğrulandı.':state.finalization.state==='blocked'?'Tahsilat kaydı mevcut; kalan provizyonun durumu doğrulanmadan iptal tamamlanmış sayılmaz.':state.finalization.state==='unknown'?'Sağlayıcı sonucu belirsiz; işlem inceleme bekliyor. Tekrar ödeme başlatmayın.':state.finalization.state==='failed'?'Finansal işlem başarısız; başarılı tahsilat veya iade gerçekleşmiş sayılmaz.':'Finansal sonuç bekleniyor.'}</p></div>}
  {state.simulation&&<div className="rounded-xl border border-slate-200 p-4 text-sm leading-6">
   <p className="font-bold">Simüle dağıtım — gerçek banka aktarımı yapılmadı</p>
   <p>Usta hakedişi: {money(state.simulation.technicianMinor)}</p><p>HizmetPey payı: {money(state.simulation.platformMinor)}</p>
  </div>}
  {role==='technician'&&state.penaltyTotal!==null&&<p className="text-sm">Toplam ceza puanınız: {state.penaltyTotal}</p>}
  {canCancel&&!confirming&&<button disabled={busy} className="min-h-11 rounded-xl border border-red-300 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50" onClick={()=>policy.action==='review'?act({action:'review'}):setConfirming(true)}>{policy.action==='review'?'İptal / inceleme başvurusu':'Hizmeti iptal et'}</button>}
  {canCancel&&confirming&&policy.action==='cancel'&&<div className="space-y-3 rounded-xl border border-amber-300 p-4">
   <h3 className="font-bold">İptal onayı</h3>
   {role==='customer'?<><p className="text-sm">İptal kesintisi: <strong>{money(policy.feeMinor)}</strong>. Kesintinin tamamı HizmetPey’e aittir; ustaya iptal hakedişi oluşmaz.</p><p className="text-sm">İptal, finansal sonuç doğrulandıktan sonra tamamlanır.</p><label className="block text-sm font-semibold">İptal gerekçesi<textarea disabled={busy} minLength={2} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3"/></label></>:
   <><p className="text-sm"><strong>{policy.points} ceza puanı</strong> uygulanacaktır. Biriken ceza puanları ileride daha az iş teklifi almanıza yol açabilir. Müşteri talebi ve fiyatı korunarak yeniden dağıtım başlatılır.</p>
   <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-sm font-bold">İptal gerekçesi seçin</legend>{[['availability','Zaman / müsaitlik sorunu'],['emergency','Acil durum'],['transport','Ulaşım sorunu'],['other','Diğer']].map(([value,label])=><label key={value} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="radio" name={'cancel-reason-'+jobId} value={value} checked={reason===value} onChange={()=>setReason(value)}/>{label}</label>)}</fieldset></>}
   <div className="flex flex-wrap gap-3"><button className={button} disabled={busy||reason.trim().length<2} onClick={()=>act({action:'cancel',version:policy.version,reason})}>{busy?'Kaydediliyor…':'Sonuçları kabul ediyorum, iptal et'}</button>
   <button className="min-h-11 rounded-xl border px-4 py-3 text-sm font-bold" disabled={busy} onClick={()=>setConfirming(false)}>Vazgeç</button></div>
  </div>}
  {state.jobStatus==='completed'&&<p className="text-sm">Hizmet tamamlandı. Normal iptal bulunmaz; mevcut şikâyet ve itiraz haklarınız korunur.</p>}
  {state.jobStatus==='cancelled'&&role==='technician'&&<p className="text-sm">Bu atama kapandı. Müşteri talebinin güncel süreci ayrı izlenir.</p>}
  {message&&<p role="status" className="text-sm font-semibold text-slate-700">{message}</p>}
 </section>;
}
