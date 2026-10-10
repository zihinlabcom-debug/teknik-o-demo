'use client';
import {beginUiAction,endUiAction} from '@/lib/use-ui-action';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export function CaseApplicationForm({kind,requests}:{kind:'complaint'|'warranty';requests:Array<{id:string;category_name:string}>}){
  const router=useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  async function submit(formData:FormData){
if(!beginUiAction(setBusy))return;
try {

    setBusy(true);setMessage('');formData.set('idempotencyKey',crypto.randomUUID());
    const endpoint=kind==='complaint'?'/api/stage10/complaints':'/api/stage10/warranty';
    const response=await fetch(endpoint,{signal:AbortSignal.timeout(30000),method:'POST',body:formData}); const body=await response.json().catch(()=>({}));
    setBusy(false); if(!response.ok){setMessage(body.error??'Başvuru gönderilemedi.');return;}
    setMessage(kind==='complaint'?'Şikâyetiniz inceleniyor.':'Garanti talebiniz incelemeye alındı.');router.refresh();

}catch {setMessage('Bağlantı kurulamadı. İşlem durumunu kontrol edip yeniden deneyin.');}
finally {endUiAction(setBusy);setBusy(false);}
}
  return <form action={submit} className="grid gap-4">
    <label className="text-sm font-semibold">Hizmet talebi<select name="requestId" required className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Seçin</option>{requests.map(r=><option key={r.id} value={r.id}>{r.id.slice(0,8)} · {r.category_name}</option>)}</select></label>
    <label className="text-sm font-semibold">Açıklama<textarea name="description" required minLength={20} maxLength={1000} className="mt-1 block min-h-32 w-full rounded-xl border border-slate-300 p-3"/></label>
    <label className="text-sm font-semibold">Kanıt dosyaları {kind==='warranty'?'(en az 1 fotoğraf veya video)':'(isteğe bağlı, en fazla 5)'}<input name="evidence" type="file" multiple required={kind==='warranty'} accept={kind==='warranty'?'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm':'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,application/pdf'} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3"/></label>
    <button aria-busy={busy||!requests.length} disabled={busy||!requests.length} className="rounded-xl bg-[#B95236] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Gönderiliyor…':'Başvuruyu gönder'}</button>
    {message&&<p role="status" className="text-sm font-semibold text-slate-700">{message}</p>}
  </form>;
}

export function AdditionalCostDecision({id,version}:{id:string;version:number}){
  const router=useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  async function decide(accept:boolean){
if(!beginUiAction(setBusy))return;
try {
setBusy(true);const response=await fetch(`/api/stage10/additional-costs/${id}/decision`,{signal:AbortSignal.timeout(30000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accept,version})});const body=await response.json().catch(()=>({}));setBusy(false);setMessage(response.ok?(accept?'Ek maliyet kabul edildi.':'Ek maliyet reddedildi.'):body.error??'Karar kaydedilemedi.');if(response.ok)router.refresh();
}catch {setMessage('Bağlantı kurulamadı. İşlem durumunu kontrol edip yeniden deneyin.');}
finally {endUiAction(setBusy);setBusy(false);}
}
  return <div className="mt-3 flex flex-wrap gap-2"><button aria-busy={busy} disabled={busy} onClick={()=>decide(true)} className="to-primary">{busy?'İşleniyor…':'Kabul et'}</button><button disabled={busy} onClick={()=>decide(false)} className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-700">Reddet</button>{message&&<p role="status" className="to-feedback w-full">{message}</p>}</div>;
}
