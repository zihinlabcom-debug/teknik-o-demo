'use client';

import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

type Category={id:string;name:string};
type City={id:number;name:string};
type District={id:number;city_id:number;name:string};

export function TechnicianSignupForm({categories,cities,districts}:{
  categories:Category[];cities:City[];districts:District[];
}){
  const [fullName,setFullName]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [categoryIds,setCategoryIds]=useState<string[]>([]);
  const [cityId,setCityId]=useState<number|null>(null);
  const [districtIds,setDistrictIds]=useState<number[]>([]);
  const [token,setToken]=useState('');
  const [step,setStep]=useState<'form'|'otp'|'complete'>('form');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const availableDistricts=districts.filter(d=>d.city_id===cityId);

  const requestCode=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/auth/technician/otp/request',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode:'signup',fullName,phone,email,categoryIds,cityId,districtIds}),
      });
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Başvuru başlatılamadı.');return;}
      setStep('otp');
      setNotice(result.delivery==='test'?'Yapılandırılmış test kodunu girin. SMS gönderilmedi.':'SMS doğrulama kodunu girin.');
    }catch{setNotice('Doğrulama hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
  };

  const verifyCode=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/auth/technician/otp/verify',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,token}),
      });
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Başvuru tamamlanamadı.');return;}
      setStep('complete');
    }catch{setNotice('Doğrulama hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 font-sans text-[#0B1727]">
    <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
      <header className="text-center"><h1><TeknikOBrand size="standard"/></h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Usta Başvurusu</p>
        <h2 className="mt-7 text-2xl font-extrabold">Teknik-O Usta</h2>
        <p className="mt-2 text-sm text-slate-600">Hizmetlerinizi ve çalıştığınız bölgeleri seçin.</p>
      </header>

      {step==='form'&&<form className="mt-8 space-y-5" onSubmit={requestCode}>
        <label className="block text-sm font-semibold">Ad Soyad
          <input required minLength={2} maxLength={200} value={fullName} onChange={e=>setFullName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <label className="block text-sm font-semibold">Telefon
          <input required type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <label className="block text-sm font-semibold">E-posta (isteğe bağlı)
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <fieldset><legend className="text-sm font-semibold">Hizmet kategorileri (bir veya daha fazla)</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{categories.map(category=><label key={category.id}
            className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
            <input type="checkbox" checked={categoryIds.includes(category.id)}
              onChange={e=>setCategoryIds(current=>e.target.checked?[...current,category.id]:current.filter(id=>id!==category.id))}/>
            {category.name}</label>)}</div></fieldset>
        <label className="block text-sm font-semibold">Şehir
          <select required value={cityId??''} onChange={e=>{setCityId(e.target.value?Number(e.target.value):null);setDistrictIds([]);}}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base">
            <option value="">Şehir seçin</option>{cities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}
          </select></label>
        <fieldset disabled={!cityId}><legend className="text-sm font-semibold">Hizmet verilen ilçeler (bir veya daha fazla)</legend>
          <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-3">
            {availableDistricts.map(district=><label key={district.id} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" checked={districtIds.includes(district.id)}
                onChange={e=>setDistrictIds(current=>e.target.checked?[...current,district.id]:current.filter(id=>id!==district.id))}/>
              {district.name}</label>)}
          </div></fieldset>
        <button type="submit" disabled={busy||!categoryIds.length||!districtIds.length}
          className="w-full rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white disabled:opacity-50">SMS Kodu Gönder</button>
        <p className="text-center text-sm text-slate-600">Hesabınız var mı? <Link href="/giris-usta" className="font-bold text-[#A64D12] underline">Usta Girişi</Link></p>
      </form>}

      {step==='otp'&&<form className="mt-8 space-y-4" onSubmit={verifyCode}>
        <label className="block text-sm font-semibold">SMS Doğrulama Kodu
          <input required inputMode="numeric" autoComplete="one-time-code" value={token}
            onChange={e=>setToken(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white">Kayıt Oluştur</button>
        <button type="button" onClick={()=>{setStep('form');setToken('');}} className="w-full text-sm text-slate-600">Bilgileri Düzenle</button>
      </form>}

      {step==='complete'&&<div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-bold">Başvurunuz alındı. Admin onayı bekleniyor.</p>
        <p className="mt-2">Kategorilerinizi ve hizmet alanlarınızı usta panelinde görebilirsiniz.</p>
        <Link href="/usta" className="mt-4 inline-block rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white">Usta paneline git</Link>
      </div>}
      {notice&&<p role="status" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{notice}</p>}
    </div>
  </main>;
}
