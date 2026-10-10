'use client';
import {beginUiAction,endUiAction} from '@/lib/use-ui-action';
import {useRouter} from 'next/navigation';
import {useState,type FormEvent} from 'react';

export function TechnicianDocumentUpload({categories}:{categories:{id:string;name:string}[]}){
  const router=useRouter();const [categoryId,setCategoryId]=useState('');
  const [files,setFiles]=useState<File[]>([]);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');
  async function upload(event:FormEvent){
if(!beginUiAction(setBusy))return;
try {

    event.preventDefault();setBusy(true);setNotice('');
    const failed:File[]=[];
    for(const file of files){
      const body=new FormData();body.set('categoryId',categoryId);body.set('file',file);
      try{
        const response=await fetch('/api/technician/documents',{signal:AbortSignal.timeout(30000),method:'POST',body});
        if(!response.ok)throw new Error('Bir belge yüklenemedi. Yeniden deneyebilirsiniz.');
      }catch{failed.push(file);}
    }
    setFiles(failed);setNotice(failed.length?'Bazı belgeler yüklenemedi. Kalanları yeniden deneyin.':'Belgeler inceleme için yüklendi.');
    setBusy(false);router.refresh();

}catch {setNotice('Bağlantı kurulamadı. İşlem durumunu kontrol edip yeniden deneyin.');}
finally {endUiAction(setBusy);setBusy(false);}
}
  return <form onSubmit={upload} className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
    <p className="font-semibold">Mesleki yeterlilik / ustalık belgesi yükle</p>
    <select required value={categoryId} onChange={event=>setCategoryId(event.target.value)}
      className="w-full rounded-lg border border-slate-300 p-2"><option value="">Belgenin kategorisi</option>
      {categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select>
    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={event=>{
      const selected=Array.from(event.target.files??[]);
      if(selected.length>5){setFiles([]);setNotice('En fazla 5 belge seçebilirsiniz.');return;}
      setFiles(selected);setNotice('');
    }}
      className="block w-full" aria-label="Belge dosyaları"/>
    <button type="submit" disabled={busy||!categoryId||!files.length}
      className="rounded-lg bg-[#B95236] px-3 py-2 font-bold text-white disabled:opacity-50">Belgeleri yükle</button>
    {notice&&<p role="status">{notice}</p>}
  </form>;
}
