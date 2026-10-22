'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {smsDisabledMessage} from '@/lib/email-auth-policy';
import {TechnicianAuthShell} from '@/components/technician-auth-shell';
export function EmailLoginForm({role}:{role:'customer'|'technician'}){
 const router=useRouter();
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [visible,setVisible]=useState(false);const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent){
  event.preventDefault();setBusy(true);setNotice('');
  try{
   const response=await fetch('/api/auth/email/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
   const result=await response.json();
   if(!response.ok){setNotice(result.error||'Giriş yapılamadı.');return;}
   router.replace(result.redirect);router.refresh();
  }catch{setNotice('Giriş hizmetine ulaşılamıyor.');}finally{setBusy(false);}
 }
 return <TechnicianAuthShell responsive={role==='technician'} eyebrow={role==='technician'?'USTA GİRİŞİ':'HESAP GİRİŞİ'} title="Tekrar hoş geldiniz" description="E-posta adresiniz ve şifrenizle hesabınıza güvenli biçimde giriş yapın.">
    {role==='customer'&&<Link href="/" className="mb-4 inline-flex text-sm font-semibold text-slate-600">← Ana sayfaya dön</Link>}
    <form className="mt-8 space-y-4" onSubmit={submit}>
     <label className="block text-sm font-semibold">E-posta adresi
      <input type="email" required autoComplete="username" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"/>
     </label>
     <label className="block text-sm font-semibold">Şifre
      <input type={visible?'text':'password'} required autoComplete="current-password" maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3"/>
     </label>
     <button type="button" aria-pressed={visible} onClick={()=>setVisible(v=>!v)} className="text-sm underline">{visible?'Şifreyi gizle':'Şifreyi göster'}</button>
     <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white shadow-sm disabled:opacity-50">{busy?'Giriş yapılıyor…':'Giriş Yap'}</button>
     <Link href="/sifremi-unuttum" className="block text-center text-sm font-semibold text-[#A64D12] underline">Şifremi unuttum</Link>
     <button type="button" onClick={()=>setNotice(smsDisabledMessage)} className="w-full text-sm font-semibold text-[#A64D12] underline">SMS ile giriş</button>
    </form>
    {notice&&<p role="status" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{notice}</p>}
    <p className="mt-7 text-center text-sm text-slate-600">Hesabınız yok mu? <Link href={role==='customer'?'/kayit':'/kayit-usta'} className="font-bold text-[#A64D12] underline">Kayıt Ol</Link></p>
 </TechnicianAuthShell>;
}
