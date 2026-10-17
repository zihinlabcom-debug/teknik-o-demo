'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

export function TechnicianCaseForm({kind,items}:{kind:'complaint'|'additional_cost';items:Array<{id:string;label:string}>}){
  const router=useRouter();
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  async function submit(form:FormData){
    setBusy(true);setMessage('');
    form.set('idempotencyKey',crypto.randomUUID());
    const url=kind==='complaint'?'/api/stage10/complaints':'/api/stage10/additional-costs';
    try{
      const response=await fetch(url,{method:'POST',body:form});
      const body=await response.json().catch(()=>({}));
      setMessage(response.ok?(kind==='complaint'?'Şikâyetiniz inceleniyor.':'Ek maliyet talebi incelemeye gönderildi.'):body.error??'İşlem tamamlanamadı.');
      if(response.ok)router.refresh();
    }catch{setMessage('İşlem hizmetine ulaşılamıyor. Daha sonra tekrar deneyin.');}
    finally{setBusy(false);}
  }

  return <form action={submit} className="grid gap-4">
    <label className="text-sm font-semibold">{kind==='complaint'?'Hizmet talebi':'Aktif iş'}<select name={kind==='complaint'?'requestId':'jobId'} required className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Seçin</option>{items.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    {kind==='additional_cost'&&<label className="text-sm font-semibold">Talep edilen fark (TL)<input name="amount" type="number" min="0.01" step="0.01" required className="mt-1 block w-full rounded-xl border border-slate-300 p-3"/></label>}
    <label className="text-sm font-semibold">{kind==='complaint'?'Açıklama':'Gerekçe'}<textarea name={kind==='complaint'?'description':'reason'} minLength={20} maxLength={1000} required className="mt-1 block min-h-28 w-full rounded-xl border border-slate-300 p-3"/></label>
    <label className="text-sm font-semibold">Kanıt dosyası (isteğe bağlı)<input name="evidence" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,application/pdf" className="mt-1 block w-full rounded-xl border border-slate-300 p-3"/></label>
    <button disabled={busy||!items.length} className="rounded-xl bg-[#C86B32] px-4 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50">{busy?'Gönderiliyor…':'Gönder'}</button>
    {!items.length&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Bu işlem için uygun kayıt bulunmuyor.</p>}
    {message&&<p role="status" className="rounded-xl border border-[#D8E1EB] bg-[#F7F9FC] p-3 text-sm font-semibold">{message}</p>}
  </form>;
}

export function WarrantyCorrectionAction({id,status}:{id:string;status:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function act(action:'accept'|'decline'|'complete'){
    const messages={accept:'Bu garanti düzeltme işini kabul etmek istiyor musunuz?',decline:'Bu garanti düzeltme işini reddetmek istiyor musunuz?',complete:'Düzeltme işi tamamlandı olarak işaretlensin mi?'};
    if(!window.confirm(messages[action]))return;
    setBusy(true);setError('');
    try{
      const response=await fetch(`/api/stage10/warranty-corrections/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error??'İşlem tamamlanamadı.');
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'İşlem tamamlanamadı.');}
    finally{setBusy(false);}
  }

  return <div className="mt-3">
    <div className="grid gap-2">{status==='offered'&&<><button type="button" disabled={busy} onClick={()=>void act('accept')} className="rounded-xl bg-[#C86B32] px-3 py-3 text-sm font-bold text-white">Kabul et</button><button type="button" disabled={busy} onClick={()=>void act('decline')} className="rounded-xl border border-red-300 px-3 py-3 text-sm font-bold text-red-700">Reddet</button></>}{status==='accepted'&&<button type="button" disabled={busy} onClick={()=>void act('complete')} className="rounded-xl bg-[#C86B32] px-3 py-3 text-sm font-bold text-white">Düzeltmeyi tamamla</button>}</div>
    {error&&<p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
  </div>;
}
