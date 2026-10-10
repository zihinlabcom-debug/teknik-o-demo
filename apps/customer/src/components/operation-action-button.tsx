'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

export function OperationActionButton({endpoint,label,confirmText}:{endpoint:string;label:string;confirmText?:string}){
  const router=useRouter(); const [pending,setPending]=useState(false); const [error,setError]=useState('');
  async function run(){
    if(confirmText&&!window.confirm(confirmText))return;
    setPending(true); setError('');
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'}});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(typeof body?.error==='string'?body.error:'İşlem tamamlanamadı.');
      router.refresh();
    }catch(error){setError(error instanceof Error?error.message:'İşlem tamamlanamadı.');}
    finally{setPending(false);}
  }
  return <div className="inline-flex flex-col items-start gap-1">
    <button type="button" disabled={pending} onClick={run} className="rounded-xl bg-[#D97724] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{pending?'İşleniyor…':label}</button>
    {error&&<p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
  </div>;
}
