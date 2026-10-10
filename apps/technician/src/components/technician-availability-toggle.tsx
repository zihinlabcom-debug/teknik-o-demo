'use client';
import {beginUiAction,endUiAction} from '@/lib/use-ui-action';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

export function TechnicianAvailabilityToggle({isAvailable}:{isAvailable:boolean}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function toggle(){
if(!beginUiAction(setBusy))return;
try {

    setBusy(true);setError('');
    try{
      const response=await fetch('/api/technician/availability',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({isAvailable:!isAvailable}),
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(typeof body.error==='string'?body.error:'Müsaitlik değiştirilemedi.');
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Müsaitlik değiştirilemedi.');}
    finally{setBusy(false);}

}catch {setError('Bağlantı kurulamadı. İşlem durumunu kontrol edip yeniden deneyin.');}
finally {endUiAction(setBusy);setBusy(false);}
}
  return <div className="mt-3"><button type="button" disabled={busy} onClick={()=>void toggle()}
    className="rounded-xl bg-[#B95236] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
    {busy?'İşleniyor…':isAvailable?'Müsaitliği kapat':'Müsaitliği aç'}</button>
    {error&&<p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}</div>;
}
