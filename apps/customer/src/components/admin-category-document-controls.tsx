'use client';
import {beginUiAction,endUiAction} from '@/lib/use-ui-action';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

export function AdminCategoryDocumentControls({id,requiresDocument}:{id:string;requiresDocument:boolean}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function change(){
if(!beginUiAction(setBusy))return;
try {

    setBusy(true);setError('');
    try{
      const response=await fetch(`/api/admin/categories/${id}`,{signal:AbortSignal.timeout(30000),method:'PATCH',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({requiresDocument:!requiresDocument})});
      if(!response.ok)throw new Error('Kategori güncellenemedi.');
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Kategori güncellenemedi.');}
    finally{setBusy(false);}

}catch {setError('Bağlantı kurulamadı. İşlem durumunu kontrol edip yeniden deneyin.');}
finally {endUiAction(setBusy);setBusy(false);}
}
  return <><button type="button" disabled={busy} onClick={()=>void change()}
    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
    {requiresDocument?'Belge zorunluluğunu kaldır':'Belge zorunlu yap'}</button>
    {error&&<span role="alert" className="text-xs text-red-700">{error}</span>}</>;
}
