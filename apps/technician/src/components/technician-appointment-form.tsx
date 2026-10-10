'use client';

import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

type AppointmentMode='scheduled'|'immediate';

type TechnicianAppointmentFormProps={
  jobId:string;
  mode:AppointmentMode;
  requestedDate:string|null;
  assignedAt:string;
};

function formatDate(value:string){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if(!match)return value;

  return `${match[3]}.${match[2]}.${match[1]}`;
}

function istanbulDate(value:number){
  if(!Number.isFinite(value))return undefined;

  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Europe/Istanbul',
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
  }).formatToParts(new Date(value));

  const year=parts.find(part=>part.type==='year')?.value;
  const month=parts.find(part=>part.type==='month')?.value;
  const day=parts.find(part=>part.type==='day')?.value;

  if(!year||!month||!day)return undefined;

  return `${year}-${month}-${day}`;
}

export function TechnicianAppointmentForm({
  jobId,
  mode,
  requestedDate,
  assignedAt,
}:TechnicianAppointmentFormProps){
  const router=useRouter();
  const [date,setDate]=useState('');
  const [time,setTime]=useState('');
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');

  const assignedAtMs=Date.parse(assignedAt);

  const immediateMinDate=istanbulDate(assignedAtMs);
  const immediateMaxDate=istanbulDate(assignedAtMs+24*60*60*1000);

  const appointmentDate=
    mode==='scheduled'
      ?requestedDate??''
      :date;

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setError('');

    if(!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)){
      setError('Geçerli bir randevu tarihi seçin.');
      return;
    }

    if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)){
      setError('Geçerli bir randevu saati seçin.');
      return;
    }

    if(time>'20:00'){
      setError('Randevu başlangıcı 20:00 sonrasında olamaz.');
      return;
    }

    const startsAt=`${appointmentDate}T${time}:00+03:00`;

    setPending(true);

    try{
      const response=await fetch(
        `/api/operations/jobs/${jobId}/appointment`,
        {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({startsAt}),
        }
      );

      const body=await response.json().catch(()=>({}));

      if(!response.ok){
        throw new Error(
          typeof body?.error==='string'
            ?body.error
            :'Randevu oluşturulamadı.'
        );
      }

      router.refresh();
    }catch(error){
      setError(
        error instanceof Error
          ?error.message
          :'Randevu oluşturulamadı.'
      );
    }finally{
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="grid gap-4 sm:grid-cols-2">
      {mode==='scheduled'
        ?<div>
          <p className="text-sm font-semibold">Müşterinin seçtiği tarih</p>
          <p className="mt-1 rounded-xl border border-slate-300 bg-white p-3 text-sm font-bold">
            {requestedDate?formatDate(requestedDate):'—'}
          </p>
        </div>
        :<label className="text-sm font-semibold">
          Tarih
          <input
            type="date"
            required
            value={date}
            min={immediateMinDate}
            max={immediateMaxDate}
            onChange={event=>setDate(event.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3"
          />
        </label>}

      <label className="text-sm font-semibold">
        Saat
        <input
          type="time"
          required
          max="20:00"
          value={time}
          onChange={event=>setTime(event.target.value)}
          className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3"
        />
      </label>
    </div>

    <div className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
      {mode==='scheduled'
        ?<p>Müşterinin seçtiği tarih değiştirilemez. Yalnız randevu saatini belirleyin.</p>
        :<p>Hemen taleplerinde randevu, işi kabul ettiğiniz andan itibaren 24 saat içinde olmalıdır.</p>}
      <p>Randevu başlangıç saati en geç 20:00 olabilir.</p>
      <p>Randevu, işi kabul ettikten sonra 1 saat içinde belirlenmelidir.</p>
    </div>

    <div className="mt-4">
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[#D97724] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending?'Kaydediliyor…':'Randevuyu belirle'}
      </button>
    </div>

    {error&&
      <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
        {error}
      </p>}
  </form>;
}