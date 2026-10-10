'use client';

import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export function AdminPasswordLoginForm(){
  const router=useRouter();const lock=useRef(false);
  const [password,setPassword]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  async function login(event:FormEvent){
    event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/auth/admin/password',{method:'POST',signal:AbortSignal.timeout(30000),
        headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const result=await response.json();
      if(!response.ok){setNotice('Giriş bilgileri geçersiz.');return;}
      setPassword('');router.replace(result.redirect);router.refresh();
    }catch{setNotice('Giriş bilgileri geçersiz.');}
    finally{lock.current=false;setBusy(false);}
  }
  return <main className="to-auth">
    <div className="to-auth-card">
      <header className="text-center"><h1><TeknikOBrand size="standard"/></h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Yönetim Girişi</p>
        <h2 className="mt-7 text-2xl font-extrabold tracking-tight">Tekrar hoş geldiniz</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Yönetici parolanızla giriş yapın.</p></header>
      <form className="mt-8" onSubmit={login}>
        <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-800">Yönetici parolası</label>
        <input id="admin-password" type="password" autoComplete="current-password" required
          value={password} onChange={event=>setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-[#F8F6F3] px-4 py-3 text-base text-slate-900 focus:border-[#B95236] focus:outline-none"/>
        <button type="submit" disabled={busy} className="mt-4 w-full rounded-xl bg-[#B95236] px-4 py-3 font-bold text-white shadow-sm disabled:opacity-50">{busy?'Giriş yapılıyor…':'Giriş Yap'}</button>
      </form>
      {notice&&<p role="alert" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{notice}</p>}
    </div>
  </main>;
}
