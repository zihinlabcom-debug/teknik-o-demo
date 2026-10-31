'use client';import {useState} from 'react';import {useRouter} from 'next/navigation';
export function T100AdminFinanceActions({jobId,state,complaintId,reportVersion,evidence=[]}:{jobId:string;state:string|null;complaintId?:string;reportVersion?:string|null;evidence?:Array<{id:string;name:string}>}){
 const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[choice,setChoice]=useState<'distribute'|'refund'|null>(null),[reason,setReason]=useState(''),[selected,setSelected]=useState<string[]>([]),[key]=useState(()=>crypto.randomUUID());
 async function recover(){
  if(busy)return;setBusy(true);
  try{const response=await fetch('/api/admin/t100/jobs/'+jobId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'recover'})});const body=await response.json().catch(()=>({}));setMessage(response.ok?body.message:body.error??'Kanıt doğrulanamadı.');router.refresh();}
  catch{setMessage('Doğrulama sonucu alınamadı; ödeme tekrar gönderilmedi.');}finally{setBusy(false);}
 }
 async function decide(){
  if(!choice||busy||!complaintId||reason.trim().length<20||!selected.length||choice==='distribute'&&!reportVersion)return;setBusy(true);
  try{const response=await fetch('/api/admin/t100/jobs/'+jobId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:choice,complaintId,reportVersion:reportVersion??null,reason,evidenceIds:selected,idempotencyKey:key})});const body=await response.json().catch(()=>({}));setMessage(response.ok?body.message:body.error??'Karar kaydedilemedi.');setChoice(null);router.refresh();}
  catch{setMessage('Sonuç alınamadı. Yeniden karar vermeden önce durumu kontrol edin.');router.refresh();}
  finally{setBusy(false);}
 }
 return <section aria-label="İnceleme finans kararı" className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
 <p className="font-bold">İnceleme finans kararı</p>
 {state?<p role="status">Finans süreci: {state}. Yeni bir karşıt işlem başlatılamaz.</p>:<>
 <p className="text-sm">Dağıtım, sağlayıcı tahsilatı doğrulandıktan sonra %70 usta / %30 HizmetPey simülasyonu oluşturur. Gerçek banka aktarımı yapılmaz. Tamamlanmamış hizmetin tam finansal kapatılmasında hakediş ve hizmet komisyonu oluşturulmaz. Tamamlanmış hizmetlerde standart iade akışı sunulmaz.</p>
 <label className="block text-sm">Kanıta dayalı karar gerekçesi<textarea value={reason} onChange={e=>setReason(e.target.value)} minLength={20} maxLength={2000} className="mt-1 block w-full rounded-xl border p-3"/></label><fieldset className="space-y-2"><legend>İlgili şikâyet kanıtları (en az bir)</legend>{evidence.map(e=><label key={e.id} className="block text-sm"><input type="checkbox" checked={selected.includes(e.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,e.id]:current.filter(id=>id!==e.id))}/> {e.name}</label>)}{!evidence.length&&<p className="text-sm text-amber-800">İlgili şikâyete bağlı kanıt bulunmadan finans kararı başlatılamaz.</p>}</fieldset>
 <div className="flex flex-wrap gap-2"><button disabled={busy||!complaintId||!reportVersion||!selected.length||reason.trim().length<20} onClick={()=>setChoice('distribute')} className="min-h-11 rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white">ÖDEMEYİ DAĞIT</button><button disabled={busy||!complaintId||!selected.length||reason.trim().length<20} onClick={()=>setChoice('refund')} className="min-h-11 rounded-xl border border-red-300 px-4 py-3 font-bold text-red-700">TAMAMLANMAMIŞ HİZMETİ FİNANSAL KAPAT</button></div>
 {choice&&<div className="space-y-2"><p>{choice==='refund'?'Hizmet bedelinin tamamının iadesini onaylıyor musunuz?':'Ödemeyi sonuçlandırıp simüle dağıtıma almayı onaylıyor musunuz?'}</p><button disabled={busy} onClick={decide} className="min-h-11 rounded-xl bg-[#082B4C] px-4 py-3 font-bold text-white">Kararı onayla</button><button disabled={busy} onClick={()=>setChoice(null)} className="ml-3 min-h-11 px-3">Vazgeç</button></div>}</>}
 {state&&['unknown','blocked','failed'].includes(state)&&<button disabled={busy} onClick={recover} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 font-bold">Finansal sonucu doğrula</button>}
 {message&&<p role="status">{message}</p>}
 </section>;
}