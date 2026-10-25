'use client';import {useState} from 'react';import {useRouter} from 'next/navigation';
export function T100AdminFinanceActions({jobId,state}:{jobId:string;state:string|null}){
 const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[choice,setChoice]=useState<'distribute'|'refund'|null>(null);
 async function recover(){
  if(busy)return;setBusy(true);
  try{const response=await fetch('/api/admin/t100/jobs/'+jobId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'recover'})});const body=await response.json().catch(()=>({}));setMessage(response.ok?body.message:body.error??'Kanıt doğrulanamadı.');router.refresh();}
  catch{setMessage('Doğrulama sonucu alınamadı; ödeme tekrar gönderilmedi.');}finally{setBusy(false);}
 }
 async function decide(){
  if(!choice||busy)return;setBusy(true);
  try{const response=await fetch('/api/admin/t100/jobs/'+jobId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:choice})});const body=await response.json().catch(()=>({}));setMessage(response.ok?body.message:body.error??'Karar kaydedilemedi.');setChoice(null);router.refresh();}
  catch{setMessage('Sonuç alınamadı. Yeniden karar vermeden önce durumu kontrol edin.');router.refresh();}
  finally{setBusy(false);}
 }
 return <section aria-label="İnceleme finans kararı" className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
 <p className="font-bold">İnceleme finans kararı</p>
 {state?<p role="status">Finans süreci: {state}. Yeni bir karşıt işlem başlatılamaz.</p>:<>
 <p className="text-sm">Dağıtım, sağlayıcı tahsilatı doğrulandıktan sonra %70 usta / %30 HizmetPey simülasyonu oluşturur. Gerçek banka aktarımı yapılmaz. Tam iadede hakediş ve hizmet komisyonu oluşturulmaz.</p>
 <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>setChoice('distribute')} className="min-h-11 rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white">ÖDEMEYİ DAĞIT</button><button disabled={busy} onClick={()=>setChoice('refund')} className="min-h-11 rounded-xl border border-red-300 px-4 py-3 font-bold text-red-700">ÖDEMEYİ İADE ET</button></div>
 {choice&&<div className="space-y-2"><p>{choice==='refund'?'Hizmet bedelinin tamamının iadesini onaylıyor musunuz?':'Ödemeyi sonuçlandırıp simüle dağıtıma almayı onaylıyor musunuz?'}</p><button disabled={busy} onClick={decide} className="min-h-11 rounded-xl bg-[#082B4C] px-4 py-3 font-bold text-white">Kararı onayla</button><button disabled={busy} onClick={()=>setChoice(null)} className="ml-3 min-h-11 px-3">Vazgeç</button></div>}</>}
 {state&&['unknown','blocked','failed'].includes(state)&&<button disabled={busy} onClick={recover} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 font-bold">Finansal sonucu doğrula</button>}
 {message&&<p role="status">{message}</p>}
 </section>;
}