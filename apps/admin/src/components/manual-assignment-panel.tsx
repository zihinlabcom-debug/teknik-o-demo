'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';

type Candidate={
  technician_id:string;
  name:string|null;
  is_available:boolean;
  active_job_count:number;
};

export function ManualAssignmentPanel({
  requestId,
  candidates,
}:{
  requestId:string;
  candidates:Candidate[];
}){
  const router=useRouter();
  const [reason,setReason]=useState('');
  const [pendingId,setPendingId]=useState<string|null>(null);
  const [completed,setCompleted]=useState(false);
  const [message,setMessage]=useState('');
  const [attempt,setAttempt]=useState<{
    technicianId:string;
    reason:string;
    idempotencyKey:string;
  }|null>(null);
  const normalizedReason=reason.trim();

  async function assign(candidate:Candidate){
    if(pendingId!==null||completed)return;
    if(attempt&&attempt.technicianId!==candidate.technician_id)return;

    const savedReason=attempt?.reason??normalizedReason;
    if(savedReason.length<3||savedReason.length>500){
      setMessage('Gerekçe 3 ile 500 karakter arasında olmalıdır.');
      return;
    }

    if(!attempt&&!window.confirm(
      `${candidate.name||'Seçilen usta'} doğrudan atanacak. İşlem onaylansın mı?`
    ))return;

    const operation=attempt??{
      technicianId:candidate.technician_id,
      reason:savedReason,
      idempotencyKey:crypto.randomUUID(),
    };
    setAttempt(operation);
    setPendingId(candidate.technician_id);
    setMessage('');

    try{
      const response=await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/manual-assignment`,
        {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          credentials:'same-origin',
          cache:'no-store',
          body:JSON.stringify(operation),
        }
      );

      const body=await response.json().catch(()=>null);

      if(!response.ok){
        setMessage(
          (typeof body?.error==='string'?body.error:'Atama doğrulanamadı.')+
          ' Aynı işlemi tekrar deneyebilir veya talebi yenileyerek durumu kontrol edebilirsiniz.'
        );
        return;
      }

      if(typeof body?.jobId!=='string'){
        setMessage('Atama yanıtı doğrulanamadı. Aynı işlemi tekrar deneyin veya talebi yenileyin.');
        return;
      }

      setCompleted(true);
      setMessage('Usta atandı. Talep bilgileri yenileniyor.');
      router.refresh();
    }catch{
      setMessage('Bağlantı hatası nedeniyle sonuç doğrulanamadı. Yalnızca aynı atamayı tekrar deneyin veya talebi yenileyin.');
    }finally{
      setPendingId(null);
    }
  }
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="manual-assignment-reason"
          className="mb-1 block text-sm font-semibold"
        >
          Manuel atama gerekçesi
        </label>
        <textarea
          id="manual-assignment-reason"
          value={reason}
          onChange={event=>setReason(event.target.value)}
          maxLength={500}
          disabled={completed||pendingId!==null||attempt!==null}
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm"
          placeholder="Atama gerekçesini yazın (3–500 karakter)"
        />
      </div>

      {candidates.length===0?(
        <p className="text-sm text-slate-600">
          Bu talep için uygun usta bulunamadı.
        </p>
      ):(
        <div className="space-y-3">
          {candidates.map(candidate=>(
            <div
              key={candidate.technician_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
            >
              <div className="text-sm">
                <p className="font-semibold">
                  {candidate.name||candidate.technician_id.slice(0,8)}
                </p>
                <p className="text-slate-600">
                  {candidate.is_available?'Müsait':'Müsait değil'}
                  {' · '}
                  Aktif iş: {candidate.active_job_count}
                </p>
              </div>
              <button
                type="button"
                onClick={()=>void assign(candidate)}
                disabled={
                  completed||
                  pendingId!==null||
                  (attempt!==null&&attempt.technicianId!==candidate.technician_id)||
                  (attempt?.reason??normalizedReason).length<3||
                  (attempt?.reason??normalizedReason).length>500
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingId===candidate.technician_id?'Atanıyor...':attempt?.technicianId===candidate.technician_id?'Aynı atamayı tekrar dene':'Ata'}
              </button>
            </div>
          ))}
        </div>
      )}

      {message&&(
        <p role="status" aria-live="polite" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}