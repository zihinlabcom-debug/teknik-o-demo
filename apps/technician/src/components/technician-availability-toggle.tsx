'use client';
import {useRouter} from 'next/navigation';
import {useId,useState} from 'react';

export function TechnicianAvailabilityToggle({isAvailable,disabled=false}:{isAvailable:boolean;disabled?:boolean}){
  const router=useRouter();const statusId=useId();
  const [available,setAvailable]=useState(isAvailable);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function toggle(){
    if(busy||disabled)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/technician/availability',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({isAvailable:!available}),
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body.changed!==true)throw new Error(typeof body.error==='string'?body.error:'Müsaitlik değiştirilemedi.');
      setAvailable(current=>!current);
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Müsaitlik değiştirilemedi.');}
    finally{setBusy(false);}
  }
  return <div className="shrink-0 text-center">
    <button type="button" role="switch" aria-checked={available} aria-describedby={statusId} disabled={busy||disabled} onClick={()=>void toggle()}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border-2 border-transparent shadow-inner transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C86B32] disabled:cursor-not-allowed disabled:opacity-55 ${available?'bg-emerald-600':'bg-red-600'}`}>
      <span className={`size-5 rounded-full bg-white shadow transition-transform ${available?'translate-x-5':'translate-x-0.5'}`}/>
      <span className="sr-only">Müsaitlik durumunu değiştir</span>
    </button>
    <p id={statusId} className={`mt-1 text-[11px] font-extrabold ${available?'text-emerald-700':'text-red-700'}`}>{busy?'Güncelleniyor…':available?'Müsait':'Müsait değil'}</p>
    {error&&<p role="alert" className="mt-1 max-w-32 text-[11px] font-semibold leading-4 text-red-700">{error}</p>}
  </div>;
}
