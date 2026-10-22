'use client';
import {useState,useEffect,useRef,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {KeyRound,Mail} from 'lucide-react';
import {AuthVisualShell} from '@/components/auth-visual-shell';

export function EmailRecoveryForm({reset,role}:{reset:boolean;role:'customer'|'technician'}){
 const router=useRouter();const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 const [repeat,setRepeat]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const handled=useRef(false);
 useEffect(()=>{
  if(!reset||handled.current)return;
  handled.current=true;
  const fragment=new URLSearchParams(window.location.hash.slice(1));
  const token=fragment.get('token_hash');
  if(!token)return;
  window.history.replaceState(null,'',window.location.pathname);
  void fetch('/api/auth/email/callback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:token,type:fragment.get('type')})})
   .then(async response=>{const data=await response.json();if(!response.ok)setNotice(data.error);})
   .catch(()=>setNotice('Bağlantı doğrulanamadı. Yeni sıfırlama iletisi isteyin.'));
 },[reset]);
 async function submit(event:FormEvent){
  event.preventDefault();
  if(reset&&password!==repeat){setNotice('Şifreler eşleşmiyor.');return;}
  setBusy(true);setNotice('');
  try{
   const response=await fetch('/api/auth/email/'+(reset?'reset':'recover'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(reset?{password}:{email})});
   const data=await response.json();
   if(!response.ok){setNotice(data.error||'İşlem tamamlanamadı.');return;}
   if(reset){router.replace(data.redirect);router.refresh();}
   else setNotice(data.message);
  }catch{setNotice('İşlem tamamlanamadı. Daha sonra tekrar deneyin.');}finally{setBusy(false);}
 }
 return <AuthVisualShell fullScreen={role==='customer'&&!reset} title={reset?'Yeni şifreni belirle':'Şifreni mi unuttun?'} description={reset?'Hesabın için güçlü ve yalnızca sana ait yeni bir şifre oluştur.':'E-posta adresini yaz; şifre yenileme bağlantısını güvenli biçimde gönderelim.'}>
  <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-[#C86B32]/10 text-[#B85F2A]">{reset?<KeyRound className="size-6" aria-hidden="true"/>:<Mail className="size-6" aria-hidden="true"/>}</div>
  <form onSubmit={submit} className="space-y-4">
   {!reset?<label className="block text-sm font-semibold text-[#17263B]">E-posta adresi<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-[#C86B32] focus:ring-2 focus:ring-[#C86B32]/15" placeholder="ornek@eposta.com"/></label>:<>
    <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">En az 10 karakter; büyük harf, küçük harf ve rakam kullan.</p>
    <label className="block text-sm font-semibold text-[#17263B]">Yeni şifre<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-[#C86B32] focus:ring-2 focus:ring-[#C86B32]/15"/></label>
    <label className="block text-sm font-semibold text-[#17263B]">Şifre tekrar<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-[#C86B32] focus:ring-2 focus:ring-[#C86B32]/15"/></label>
   </>}
   <button disabled={busy} className="min-h-12 w-full rounded-2xl bg-[#C86B32] px-4 font-bold text-white shadow-md transition hover:bg-[#B85F2A] disabled:opacity-60">{busy?'İşleniyor…':reset?'Şifreyi güncelle':'Sıfırlama iletisi gönder'}</button>
  </form>
  {notice&&<p role="status" className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{notice}</p>}
  <Link href={role==='customer'?'/giris':'/giris-usta'} className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-[#A65326]">← Girişe dön</Link>
 </AuthVisualShell>;
}
