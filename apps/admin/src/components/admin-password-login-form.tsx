'use client';

import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AdminAuthShell} from '@/components/admin-auth-shell';

export function AdminPasswordLoginForm(){
  const router=useRouter();
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');
  const [visible,setVisible]=useState(false);
  const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
  async function login(event:FormEvent){
    event.preventDefault();setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/auth/admin/password',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Giriş bilgileri geçersiz.');return;}
      setPassword('');router.replace(result.redirect);router.refresh();
    }catch{setNotice('Giriş hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
  }
  return <AdminAuthShell eyebrow="Yönetim Girişi" title="Operasyonunuzu güvenle yönetin" description="Hizmet talepleri, usta süreçleri ve yönetim kayıtlarına yalnız yetkili hesabınızla erişin.">
    <div className="mx-auto w-full max-w-md">
      <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[#082B4C]">Tekrar hoş geldiniz</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Yetkili yönetici e-postanız ve kişisel şifrenizle giriş yapın.</p>
      <form className="mt-8 space-y-4" onSubmit={login}>
        <label className="block text-sm font-semibold text-slate-800">E-posta adresi
          <input type="email" autoComplete="username" maxLength={254} required value={email}
            onChange={event=>setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"/>
        </label>
        <label className="block text-sm font-semibold text-slate-800">Şifre
          <input type={visible?'text':'password'} autoComplete="current-password" maxLength={128} required value={password}
            onChange={event=>setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"/>
        </label>
        <button type="button" aria-pressed={visible} onClick={()=>setVisible(v=>!v)} className="text-sm underline">
          {visible?'Şifreyi gizle':'Şifreyi göster'}</button>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white shadow-[0_8px_18px_rgba(200,107,50,0.22)] disabled:opacity-50">
          {busy?'Giriş yapılıyor…':'Giriş Yap'}</button>
        <Link href="/sifremi-unuttum-admin" className="block text-center text-sm font-semibold text-[#A64D12] underline">Şifremi unuttum</Link>
      </form>
      {notice&&<p role="alert" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{notice}</p>}
      <p className="mt-5 text-center text-xs text-slate-500">Yeni yönetici hesabı yalnızca yetkili yönetim işlemiyle tanımlanabilir.</p>
    </div>
  </AdminAuthShell>;
}
