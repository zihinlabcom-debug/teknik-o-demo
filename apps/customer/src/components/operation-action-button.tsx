'use client';
import {beginUiAction,endUiAction} from '@/lib/use-ui-action';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

export function OperationActionButton({endpoint,label,confirmText}:{endpoint:string;label:string;confirmText?:string}){
  const router=useRouter(); const [pending,setPending]=useState(false); const [feedback,setFeedback]=useState<{kind:'success'|'error';text:string}|null>(null);
  async function run(){
if(!beginUiAction(setPending))return;
try {

    if(confirmText&&!window.confirm(confirmText))return;
    setPending(true); setFeedback(null);
    try{
      const response=await fetch(endpoint,{signal:AbortSignal.timeout(30000),method:'POST',headers:{'Content-Type':'application/json'}});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(typeof body?.error==='string'?body.error:'İşlem tamamlanamadı.');
      setFeedback({kind:'success',text:'İşlem başarıyla tamamlandı.'});
      router.refresh();
    }catch(error){setFeedback({kind:'error',text:error instanceof Error?error.message:'İşlem tamamlanamadı.'});}
    finally{setPending(false);}

}catch {setFeedback({kind:'error',text:'Bağlantı kurulamadı. İşlem durumunu kontrol edip yeniden deneyin.'});}
finally {endUiAction(setPending);setPending(false);}
}
  return <div className="inline-flex flex-col items-start gap-1">
    <button type="button" disabled={pending} onClick={run} className="rounded-xl bg-[#B95236] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{pending?'İşleniyor…':label}</button>
    {feedback&&<p role={feedback.kind==='error'?'alert':'status'} className={`text-xs font-semibold ${feedback.kind==='error'?'text-red-700':'text-emerald-700'}`}>{feedback.text}</p>}
  </div>;
}
