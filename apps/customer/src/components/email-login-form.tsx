'use client';

import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,Eye,EyeOff,LockKeyhole,Mail} from 'lucide-react';
import {AuthVisualShell} from '@/components/auth-visual-shell';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';
import {smsDisabledMessage} from '@/lib/email-auth-policy';

export function EmailLoginForm({role}:{role:'customer'|'technician'}){
  const router=useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [visible,setVisible]=useState(false);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  async function submit(event:FormEvent){
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try{
      const response=await fetch('/api/auth/email/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password}),
      });
      const result=await response.json();
      if(!response.ok){
        setNotice(result.error||'Giriş yapılamadı.');
        return;
      }
      router.replace(result.redirect);
      router.refresh();
    }catch{
      setNotice('Giriş hizmetine ulaşılamıyor.');
    }finally{
      setBusy(false);
    }
  }

  if(role==='technician'){
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 font-sans text-[#0B1727]">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
        <header className="text-center"><h1><TeknikOBrand size="standard"/></h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Usta Girişi</p>
          <h2 className="mt-7 text-2xl font-extrabold tracking-tight">Tekrar hoş geldiniz</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">E-posta adresiniz ve şifrenizle giriş yapın.</p>
        </header>
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold">E-posta adresi
            <input type="email" required autoComplete="username" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"/>
          </label>
          <label className="block text-sm font-semibold">Şifre
            <input type={visible?'text':'password'} required autoComplete="current-password" maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"/>
          </label>
          <button type="button" aria-pressed={visible} onClick={()=>setVisible(value=>!value)} className="text-sm underline">{visible?'Şifreyi gizle':'Şifreyi göster'}</button>
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white disabled:opacity-50">{busy?'Giriş yapılıyor…':'Giriş Yap'}</button>
          <Link href="/sifremi-unuttum" className="block text-center text-sm font-semibold text-[#A64D12] underline">Şifremi unuttum</Link>
          <button type="button" onClick={()=>setNotice(smsDisabledMessage)} className="w-full text-sm font-semibold text-[#A64D12] underline">SMS ile giriş</button>
        </form>
        {notice?<p role="status" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{notice}</p>:null}
        <p className="mt-7 text-center text-sm text-slate-600">Hesabınız yok mu? <Link href="/kayit-usta" className="font-bold text-[#A64D12] underline">Kayıt Ol</Link></p>
      </div>
    </main>;
  }

  return <AuthVisualShell title="Tekrar hoş geldin" description="Taleplerini takip etmek ve hizmetlerini yönetmek için hesabına giriş yap.">
    <form className="space-y-4" onSubmit={submit}>
      <label htmlFor="customer-login-email" className="block text-[13px] font-bold text-[#17263B]">E-posta
        <span className="relative mt-2 block">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
          <input id="customer-login-email" type="email" required autoComplete="username" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} placeholder="E-posta adresiniz" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base shadow-[0_4px_14px_rgba(8,43,76,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#C86B32] focus:ring-4 focus:ring-[#C86B32]/15"/>
        </span>
      </label>

      <div>
        <label htmlFor="customer-login-password" className="block text-[13px] font-bold text-[#17263B]">Şifre</label>
        <span className="relative mt-2 block">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
          <input id="customer-login-password" type={visible?'text':'password'} required autoComplete="current-password" maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Şifreniz" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-14 text-base shadow-[0_4px_14px_rgba(8,43,76,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#C86B32] focus:ring-4 focus:ring-[#C86B32]/15"/>
          <button type="button" aria-label={visible?'Şifreyi gizle':'Şifreyi göster'} aria-pressed={visible} onClick={()=>setVisible(value=>!value)} className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#C86B32]">
            {visible?<EyeOff className="size-5" aria-hidden="true"/>:<Eye className="size-5" aria-hidden="true"/>}
          </button>
        </span>
      </div>

      <div className="text-right"><Link href="/sifremi-unuttum" className="inline-flex min-h-10 items-center text-sm font-bold text-[#A65324] underline-offset-4 hover:underline">Şifremi unuttum</Link></div>

      <button type="submit" disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D47A43] to-[#B85F2A] px-5 font-bold text-white shadow-lg shadow-[#C86B32]/20 transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#082B4C] disabled:cursor-not-allowed disabled:opacity-60">
        {busy?'Giriş yapılıyor…':'Giriş Yap'}{busy?null:<ArrowRight className="size-5" aria-hidden="true"/>}
      </button>
    </form>

    {notice?<p role="status" aria-live="polite" className="mt-5 rounded-2xl border border-[#E6A275] bg-[#FFF2E8] p-4 text-sm font-medium text-[#7A3B19]">{notice}</p>:null}

    <p className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center text-sm text-slate-600">Hesabın yok mu? <Link href="/kayit" className="inline-flex min-h-11 items-center font-bold text-[#A65324] underline-offset-4 hover:underline">Kayıt Ol</Link></p>
  </AuthVisualShell>;
}
