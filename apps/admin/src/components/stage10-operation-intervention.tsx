'use client';

import {useId,useState} from 'react';
import {useRouter} from 'next/navigation';

export function Stage10OperationIntervention({requestId,currentJobId,closed}:{requestId:string;currentJobId:string|null;closed:boolean}){
  const router=useRouter();
  const fieldId=useId();
  const [feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);
  const [busy,setBusy]=useState(false);

  async function submit(form:FormData){
    setBusy(true);
    setFeedback(null);
    const action=String(form.get('action'));
    const body={
      action,
      reason:String(form.get('reason')),
      technicianId:String(form.get('technicianId')||''),
      expectedJobId:currentJobId,
      idempotencyKey:crypto.randomUUID(),
    };
    try{
      const response=await fetch(`/api/admin/stage10/requests/${requestId}/intervention`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
      });
      const data=await response.json().catch(()=>({}));
      setFeedback({text:response.ok?'Operasyon müdahalesi kaydedildi.':data.error??'İşlem tamamlanamadı.',error:!response.ok});
      if(response.ok)router.refresh();
    }catch{
      setFeedback({text:'İşlem tamamlanamadı.',error:true});
    }finally{
      setBusy(false);
    }
  }

  if(closed)return <p className="text-sm text-slate-600">Kesin kapanmış hizmete müdahale edilemez.</p>;

  return <form action={submit} aria-busy={busy} className="grid gap-3">
    <fieldset className="grid gap-3" disabled={busy}>
      <legend className="sr-only">Operasyon müdahalesi</legend>
      <label htmlFor={`${fieldId}-action`} className="grid gap-1 text-sm font-semibold text-slate-700">
        İşlem
        <select id={`${fieldId}-action`} name="action" className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900">
          <option value="change_technician">Usta değiştir</option>
          <option value="cancel">Hizmeti iptal et</option>
        </select>
      </label>
      <label htmlFor={`${fieldId}-technician`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Yeni usta kullanıcı kimliği <span className="font-normal text-slate-500">(yalnız usta değişikliğinde)</span>
        <input id={`${fieldId}-technician`} name="technicianId" aria-describedby={`${fieldId}-technician-help`} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <p id={`${fieldId}-technician-help`} className="-mt-2 text-xs text-slate-500">Hizmet iptalinde bu alanı boş bırakın.</p>
      <label htmlFor={`${fieldId}-reason`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Müdahale gerekçesi <span className="text-[#A94D18]">(zorunlu)</span>
        <textarea id={`${fieldId}-reason`} name="reason" required minLength={10} maxLength={1000} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <button type="submit" className="rounded-xl bg-[#C86B32] px-4 py-2 text-sm font-bold text-white">Uygula</button>
    </fieldset>
    {feedback&&<p role={feedback.error?'alert':'status'} className={`text-sm ${feedback.error?'text-red-700':'text-emerald-700'}`}>{feedback.text}</p>}
  </form>;
}
