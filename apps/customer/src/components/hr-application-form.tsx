'use client';

import {useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabaseClient';

type Fields={fullName:string;phone:string;email:string;address:string;introduction:string};
const emptyFields:Fields={fullName:'',phone:'',email:'',address:'',introduction:''};

export function HrApplicationForm(){
  const [fields,setFields]=useState<Fields>(emptyFields);
  const [submitting,setSubmitting]=useState(false);
  const [message,setMessage]=useState<{kind:'success'|'error';text:string}|null>(null);
  const update=(key:keyof Fields,value:string)=>setFields(previous=>({...previous,[key]:value}));
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(submitting)return;
    setSubmitting(true);setMessage(null);
    try{
      const {data,error}=await supabase.auth.getSession();
      if(error||!data.session?.access_token){
        setMessage({kind:'error',text:'Başvuru kaydı için doğrulanmış kullanıcı oturumu gerekli. Mevcut kayıt akışı henüz bunu sağlamıyor.'});
        return;
      }
      const response=await fetch('/api/hr-applications',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},
        body:JSON.stringify(fields),
      });
      if(!response.ok){setMessage({kind:'error',text:'Başvuru şu anda gönderilemedi. Lütfen daha sonra tekrar deneyin.'});return;}
      setFields(emptyFields);setMessage({kind:'success',text:'Başvurunuz alındı'});
    }catch{setMessage({kind:'error',text:'Başvuru hizmetine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.'});}
    finally{setSubmitting(false);}
  };

  return <section className="relative mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-6 md:p-9" aria-labelledby="hr-heading">
    <h2 id="hr-heading" className="text-2xl font-black tracking-tight">İnsan Kaynakları</h2>
    <p className="mt-2 max-w-xl text-sm text-slate-600">Başvurmak istediğiniz pozisyonu, mesleki yeterliliklerinizi ve deneyiminizi tanıtım alanında anlatabilirsiniz.</p>
    <form onSubmit={event=>void submit(event)} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold">İsim Soyisim
        <input name="fullName" autoComplete="name" required minLength={2} maxLength={120} value={fields.fullName} onChange={event=>update('fullName',event.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-slate-300 p-3 text-sm font-normal focus:border-[#B95236] focus:outline-none"/>
      </label>
      <label className="block text-sm font-semibold">Telefon Numarası
        <input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={25} pattern="[+0-9 ()-]{7,25}" value={fields.phone} onChange={event=>update('phone',event.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-slate-300 p-3 text-sm font-normal focus:border-[#B95236] focus:outline-none"/>
      </label>
      <label className="block text-sm font-semibold">E-posta Adresi
        <input name="email" type="email" autoComplete="email" required maxLength={254} value={fields.email} onChange={event=>update('email',event.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-slate-300 p-3 text-sm font-normal focus:border-[#B95236] focus:outline-none"/>
      </label>
      <label className="block text-sm font-semibold">Adres
        <input name="address" autoComplete="street-address" maxLength={500} value={fields.address} onChange={event=>update('address',event.target.value)} className="mt-1 block w-full min-w-0 rounded-xl border border-slate-300 p-3 text-sm font-normal focus:border-[#B95236] focus:outline-none"/>
      </label>
      <label className="block text-sm font-semibold sm:col-span-2">Tanıtım
        <textarea name="introduction" required minLength={20} maxLength={3000} rows={6} value={fields.introduction} onChange={event=>update('introduction',event.target.value)} className="mt-1 block w-full min-w-0 resize-y rounded-xl border border-slate-300 p-3 text-sm font-normal focus:border-[#B95236] focus:outline-none"/>
      </label>
      {message&&<p role={message.kind==='error'?'alert':'status'} className={`rounded-xl p-3 text-sm sm:col-span-2 ${message.kind==='error'?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
      <button type="submit" disabled={submitting} className="rounded-xl bg-[#B95236] px-5 py-3 text-sm font-bold text-white hover:brightness-95 disabled:opacity-60 sm:col-span-2 sm:justify-self-start">{submitting?'Gönderiliyor…':'Başvuruyu Gönder'}</button>
    </form>
  </section>;
}
