'use client';
import {useState,useEffect,useRef,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {TechnicianAuthShell} from '@/components/technician-auth-shell';
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
  void fetch('/api/auth/email/callback',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token_hash:token,type:fragment.get('type')})})
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
 return <TechnicianAuthShell eyebrow="HESAP GÜVENLİĞİ" title={reset?'Yeni şifre belirle':'Şifremi unuttum'} description={reset?'Yeni şifrenizi güvenli biçimde oluşturun.':'Şifre sıfırlama bağlantısını kayıtlı e-posta adresinize gönderelim.'}>
   <form onSubmit={submit} className="mt-6 space-y-4">
    {!reset?<label className="block">E-posta adresi<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>:<>
     <p className="text-sm">En az 10 karakter; büyük harf, küçük harf ve rakam.</p>
     <label className="block">Yeni şifre<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
     <label className="block">Şifre tekrar<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
    </>}
    <button disabled={busy} className="w-full rounded-xl bg-[#C86B32] p-3 font-bold text-white disabled:opacity-50">{busy?'İşleniyor…':reset?'Şifreyi güncelle':'Sıfırlama iletisi gönder'}</button>
   </form>
   {notice&&<p role="status" className="mt-4 text-sm">{notice}</p>}
   <Link href={role==='customer'?'/giris':'/giris-usta'} className="mt-6 block text-sm underline">Giriş ekranına dön</Link>
 </TechnicianAuthShell>;
}
