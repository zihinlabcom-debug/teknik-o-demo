'use client';

import {useId,useState} from 'react';
import {useRouter} from 'next/navigation';

function useSubmit(onSuccess?:()=>void){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);
  return {
    busy,
    feedback,
    async send(url:string,body:Record<string,unknown>){
      setBusy(true);
      setFeedback(null);
      try{
        const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const data=await response.json().catch(()=>({}));
        setFeedback({text:response.ok?'İşlem kaydedildi.':data.error??'İşlem tamamlanamadı.',error:!response.ok});
        if(response.ok){onSuccess?.();router.refresh();}
      }catch{
        setFeedback({text:'İşlem tamamlanamadı.',error:true});
      }finally{
        setBusy(false);
      }
    },
  };
}

function Feedback({value,className=''}:{value:{text:string;error:boolean}|null;className?:string}){
  if(!value)return null;
  return <p role={value.error?'alert':'status'} className={`text-sm ${value.error?'text-red-700':'text-emerald-700'} ${className}`}>{value.text}</p>;
}

export function AdditionalCostAdminAction({id,status,version}:{id:string;status:string;version:number}){
  const s=useSubmit();
  const fieldId=useId();
  return <form action={form=>s.send(`/api/admin/stage10/additional-costs/${id}`,{
    action:String(form.get('action')),reason:String(form.get('reason')),version,
  })} aria-busy={s.busy} className="mt-3">
    <fieldset disabled={s.busy} className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Ek maliyet kararı</legend>
      <label htmlFor={`${fieldId}-reason`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Gerekçe <span className="text-[#A94D18]">(zorunlu)</span>
        <input id={`${fieldId}-reason`} name="reason" required minLength={10} maxLength={1000} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <label htmlFor={`${fieldId}-action`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Karar
        <select id={`${fieldId}-action`} name="action" className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900">
          {status==='pending_admin'?<><option value="approve">Admin onayı</option><option value="reject">Admin reddi</option></>:<><option value="continue">Önceki kapsamla devam</option><option value="cancel">Hizmeti iptal et</option></>}
        </select>
      </label>
      <button type="submit" className="rounded-xl bg-[#C86B32] px-4 py-2 text-sm font-bold text-white sm:col-span-2">Kararı kaydet</button>
    </fieldset>
    <Feedback value={s.feedback} className="mt-3"/>
  </form>;
}

export function ComplaintAdminAction({id,version}:{id:string;version:number}){
  const s=useSubmit();
  const [key]=useState(()=>crypto.randomUUID());
  const fieldId=useId();
  return <form action={form=>s.send(`/api/admin/stage10/complaints/${id}`,{
    key,customerMessage:String(form.get('customerMessage')),operationMessage:String(form.get('operationMessage')||''),action:'decide',finalCategory:String(form.get('finalCategory')),decision:String(form.get('decision')),
    reason:String(form.get('reason')),subjectUserId:String(form.get('subjectUserId')||''),
    sanctionEndsAt:String(form.get('sanctionEndsAt')||''),version,
  })} aria-busy={s.busy} className="mt-3">
    <fieldset disabled={s.busy} className="grid gap-3">
      <legend className="sr-only">Şikâyet kararı</legend>
      <label htmlFor={`${fieldId}-category`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Nihai kategori <span className="text-[#A94D18]">(zorunlu)</span>
        <input id={`${fieldId}-category`} name="finalCategory" required minLength={2} maxLength={100} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <label htmlFor={`${fieldId}-decision`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Karar
        <select id={`${fieldId}-decision`} name="decision" className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900">
          <option value="no_action">İşlem yok</option><option value="warning">Uyarı</option><option value="restrict_new_operations">Yeni işlemleri kısıtla</option><option value="temporary_suspension">Geçici askıya al</option><option value="permanent_closure">Kalıcı hesap kapatma</option><option value="finance_review">Finansal inceleme ve çözüm</option>
        </select>
      </label>
      <label htmlFor={`${fieldId}-subject`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Yaptırım uygulanacak kullanıcı kimliği <span className="font-normal text-slate-500">(işlem yoksa boş)</span>
        <input id={`${fieldId}-subject`} name="subjectUserId" className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <label htmlFor={`${fieldId}-ends`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Yaptırım bitiş zamanı <span className="font-normal text-slate-500">(isteğe bağlı)</span>
        <input id={`${fieldId}-ends`} name="sanctionEndsAt" type="datetime-local" className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <label htmlFor={`${fieldId}-reason`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Gerekçeli nihai karar <span className="text-[#A94D18]">(zorunlu)</span>
        <textarea id={`${fieldId}-reason`} name="reason" required minLength={20} maxLength={2000} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <label htmlFor={`${fieldId}-customer-result`} className="grid gap-1 text-sm font-semibold">Müşteriye açıklanacak gerekçeli sonuç<textarea id={`${fieldId}-customer-result`} name="customerMessage" required minLength={20} maxLength={2000} className="rounded-xl border p-2"/><span className="font-normal text-slate-500">İç notları ve gizli yaptırım ayrıntılarını bu alana yazmayın.</span></label>
      <label htmlFor={`${fieldId}-operation-result`} className="grid gap-1 text-sm font-semibold">Ustayı doğrudan etkileyen operasyonel bildirim<textarea id={`${fieldId}-operation-result`} name="operationMessage" minLength={10} maxLength={1000} className="rounded-xl border p-2"/><span className="font-normal text-slate-500">Ustaya yaptırım uygulanıyorsa zorunlu. Şikâyet dosyası veya müşteri açıklaması paylaşılmaz.</span></label>
      <button type="submit" className="rounded-xl bg-[#C86B32] px-4 py-2 text-sm font-bold text-white">Sonuçlandır</button>
    </fieldset>
    <Feedback value={s.feedback} className="mt-3"/>
  </form>;
}

export function ComplaintInfoRequest({id,version,recipients}:{id:string;version:number;recipients:Array<{id:string;name:string;role:string}>}){
  const [key,setKey]=useState(()=>crypto.randomUUID());const s=useSubmit(()=>setKey(crypto.randomUUID()));
  const fieldId=useId();
  return <form action={form=>s.send(`/api/admin/stage10/complaints/${id}`,{
    action:'request_info',version,key,recipientId:String(form.get('recipientId')),message:String(form.get('message')),
  })} aria-busy={s.busy} className="mt-3 flex flex-wrap items-end gap-2">
    <label htmlFor={`${fieldId}-recipient`} className="grid gap-1 text-sm font-semibold">Alıcı<select id={`${fieldId}-recipient`} name="recipientId" required disabled={s.busy} className="rounded-xl border p-2"><option value="">Alıcı seçin</option>{recipients.map(u=><option key={u.id} value={u.id}>{u.name} · {u.role==='customer'?'Müşteri':'Usta'}</option>)}</select></label>
    <label htmlFor={`${fieldId}-message`} className="grid min-w-64 flex-1 gap-1 text-sm font-semibold text-slate-700">
      Ek bilgi talebi <span className="text-[#A94D18]">(zorunlu)</span>
      <input id={`${fieldId}-message`} name="message" required minLength={10} maxLength={1000} disabled={s.busy} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
    </label>
    <button type="submit" disabled={s.busy} className="rounded-xl border border-[#C86B32] bg-white px-4 py-2 text-sm font-bold text-[#A94D18]">Bilgi iste</button>
    <Feedback value={s.feedback} className="w-full"/>
  </form>;
}

export function ComplaintDecisionCorrection({id}:{id:string}){
  const s=useSubmit();
  const fieldId=useId();
  return <form action={form=>s.send(`/api/admin/stage10/complaints/${id}`,{
    action:'correct',correctionText:String(form.get('correctionText')),revokeSanction:form.get('revokeSanction')==='on',
  })} aria-busy={s.busy} className="mt-3 grid gap-3">
    <label htmlFor={`${fieldId}-correction`} className="grid gap-1 text-sm font-semibold text-slate-700">
      Karar düzeltme kaydı <span className="text-[#A94D18]">(zorunlu)</span>
      <textarea id={`${fieldId}-correction`} name="correctionText" required minLength={20} maxLength={2000} disabled={s.busy} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
    </label>
    <label htmlFor={`${fieldId}-revoke`} className="flex items-center gap-2 text-sm">
      <input id={`${fieldId}-revoke`} name="revokeSanction" type="checkbox" disabled={s.busy}/> Bağlı yaptırımı ayrı kayıtla sona erdir
    </label>
    <button type="submit" disabled={s.busy} className="rounded-xl border border-[#C86B32] bg-white px-4 py-2 text-sm font-bold text-[#A94D18]">Düzeltme kaydı ekle</button>
    <Feedback value={s.feedback}/>
  </form>;
}

export function WarrantyAdminAction({id,version}:{id:string;version:number}){
  const s=useSubmit();
  const fieldId=useId();
  return <form action={form=>s.send(`/api/admin/stage10/warranty/${id}`,{
    action:'decide',accept:String(form.get('decision'))==='accept',customerReason:String(form.get('customerReason')),
    internalReason:String(form.get('internalReason')),version,
  })} aria-busy={s.busy} className="mt-3">
    <fieldset disabled={s.busy} className="grid gap-3">
      <legend className="sr-only">Garanti kararı</legend>
      <label htmlFor={`${fieldId}-decision`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Karar
        <select id={`${fieldId}-decision`} name="decision" className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"><option value="accept">Kabul</option><option value="reject">Ret</option></select>
      </label>
      <label htmlFor={`${fieldId}-customer-reason`} className="grid gap-1 text-sm font-semibold text-slate-700">
        Müşteriye gösterilecek kısa gerekçe <span className="text-[#A94D18]">(zorunlu)</span>
        <input id={`${fieldId}-customer-reason`} name="customerReason" required minLength={10} maxLength={1000} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <label htmlFor={`${fieldId}-internal-reason`} className="grid gap-1 text-sm font-semibold text-slate-700">
        İç değerlendirme <span className="text-[#A94D18]">(zorunlu)</span>
        <textarea id={`${fieldId}-internal-reason`} name="internalReason" required minLength={10} maxLength={2000} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
      </label>
      <button type="submit" className="rounded-xl bg-[#C86B32] px-4 py-2 text-sm font-bold text-white">Kararı kaydet</button>
    </fieldset>
    <Feedback value={s.feedback} className="mt-3"/>
  </form>;
}

export function WarrantyAssignmentAction({id,version}:{id:string;version:number}){
  const s=useSubmit();
  const fieldId=useId();
  return <form action={form=>s.send(`/api/admin/stage10/warranty/${id}`,{
    action:'assign',technicianId:String(form.get('technicianId')),version,
  })} aria-busy={s.busy} className="mt-3 flex flex-wrap items-end gap-2">
    <label htmlFor={`${fieldId}-technician`} className="grid min-w-64 flex-1 gap-1 text-sm font-semibold text-slate-700">
      Usta kullanıcı kimliği <span className="text-[#A94D18]">(zorunlu)</span>
      <input id={`${fieldId}-technician`} name="technicianId" required disabled={s.busy} className="rounded-xl border border-slate-300 p-2 font-normal text-slate-900"/>
    </label>
    <button type="submit" disabled={s.busy} className="rounded-xl bg-[#C86B32] px-4 py-2 text-sm font-bold text-white">Düzeltme ata</button>
    <Feedback value={s.feedback} className="w-full"/>
  </form>;
}
