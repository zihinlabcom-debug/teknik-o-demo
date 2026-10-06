'use client';

import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export function AccountLoginForm({role}:{role:'customer'|'technician'|'admin'}){
  const router=useRouter();
  const endpoint=role==='customer'?'/api/auth/otp':`/api/auth/${role}/otp`;
  const [phone,setPhone]=useState('');
  const [code,setCode]=useState('');
  const [step,setStep]=useState<'phone'|'otp'>('phone');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const requestCode=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice('');
    try{
      const response=await fetch(`${endpoint}/request`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,mode:'login'})});
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Doğrulama başlatılamadı.');return;}
      setStep('otp');
      setNotice(result.delivery==='test'?'Test hesabı için yapılandırılmış test kodunu girin. SMS gönderilmedi.':'SMS doğrulama kodunu girin.');
    }catch{setNotice('Doğrulama hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
  };
  const verifyCode=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice('');
    try{
      const response=await fetch(`${endpoint}/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,token:code})});
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Kod doğrulanamadı.');return;}
      router.replace(result.redirect);router.refresh();
    }catch{setNotice('Doğrulama hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 font-sans text-[#0B1727]">
    <div className="w-full max-w-md">
      {role==='customer'&&<Link href="/" className="mb-4 inline-flex text-sm font-semibold text-slate-600 hover:text-[#C65F16] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97724]">
        ← Ana Sayfaya Dön
      </Link>}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
        <header className="text-center">
          <h1><TeknikOBrand size="standard" /></h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{role==='technician'?'Usta Girişi':role==='admin'?'Yönetim Girişi':'Hesap Girişi'}</p>
          <h2 className="mt-7 text-2xl font-extrabold tracking-tight">Tekrar hoş geldiniz</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Telefon numaranızı doğrulayarak hesabınıza giriş yapın.</p>
        </header>

        {step==='phone'?<form className="mt-8" onSubmit={requestCode}>
          <label htmlFor="login-phone" className="block text-sm font-semibold text-slate-800">Telefon Numarası</label>
          <input id="login-phone" name="phone" type="tel" autoComplete="tel" inputMode="numeric" required
            pattern="5[0-9]{9}" maxLength={10}
            value={phone} onChange={event=>setPhone(event.target.value.replace(/\D/g,'').slice(0,10))}
            placeholder="5XX XXX XX XX"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#D97724] focus:outline-none" />
          <button type="submit" disabled={busy} className="mt-4 w-full rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97724]">
            SMS Kodu Gönder
          </button>
        </form>:null}

        {step==='otp'?<form aria-label="SMS kodu ile doğrulama" className="mt-8 border-t border-slate-200 pt-6" onSubmit={verifyCode}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sonraki adım</p>
          <label htmlFor="login-otp" className="mt-3 block text-sm font-semibold text-slate-800">SMS Doğrulama Kodu</label>
          <input id="login-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="Doğrulama kodu" required value={code} onChange={event=>setCode(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400" />
          <button type="submit" disabled={busy} className="mt-4 w-full rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white">Doğrula ve Giriş Yap</button>
          <button type="button" onClick={()=>{setStep('phone');setCode('');}} className="mt-3 w-full text-sm font-semibold text-slate-600">Numarayı Değiştir</button>
        </form>:null}
        {notice&&<p role="status" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm leading-5 text-orange-900">{notice}</p>}

        {role!=='admin'&&<p className="mt-7 text-center text-sm text-slate-600">Hesabınız yok mu? <Link href={role==='customer'?'/kayit':'/kayit-usta'} className="font-bold text-[#A64D12] underline underline-offset-2">Kayıt Ol</Link></p>}
      </div>
    </div>
  </main>;
}
