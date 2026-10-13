'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';

export function AdminRecoveryForm({reset}:{reset:boolean}){
  const router=useRouter();
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');
  const [repeat,setRepeat]=useState('');const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);const [verified,setVerified]=useState(!reset);
  const handled=useRef(false);
  useEffect(()=>{
    if(!reset||handled.current)return;
    handled.current=true;
    const fragment=new URLSearchParams(window.location.hash.slice(1));
    const token=fragment.get('token_hash');const type=fragment.get('type');
    window.history.replaceState(null,'',window.location.pathname);
    async function verifyRecoveryLink(){
      if(!token||type!=='recovery')return 'Bağlantı geçersiz. Yeni sıfırlama isteği gönderin.';
      const response=await fetch('/api/auth/admin/recovery/callback',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({token_hash:token,type})});
      return response.ok?null:'Bağlantı geçersiz veya süresi dolmuş.';
    }
    void verifyRecoveryLink().then(error=>{
      if(error){setMessage(error);return;}
      setVerified(true);
    }).catch(()=>setMessage('Bağlantı doğrulanamadı.'));
  },[reset]);
  async function submit(event:FormEvent){
    event.preventDefault();if(reset&&!verified)return;
    if(reset&&password!==repeat){setMessage('Şifreler eşleşmiyor.');return;}
    setBusy(true);setMessage('');
    try{
      const action=reset?'reset':'request';
      const response=await fetch('/api/auth/admin/recovery/'+action,{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(reset?{password}:{email})});
      const data=await response.json();
      if(!response.ok){setMessage(data.error||'İşlem tamamlanamadı.');return;}
      if(reset){router.replace('/giris-admin');router.refresh();}
      else setMessage(data.message||'Hesabınız uygunsa sıfırlama bağlantısı gönderildi.');
    }catch{setMessage('İşlem tamamlanamadı. Daha sonra tekrar deneyin.');}
    finally{setBusy(false);}
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
      <h1 className="text-2xl font-bold">{reset?'Yeni yönetici şifresi':'Yönetici şifremi unuttum'}</h1>
      <p className="mt-3 text-sm text-slate-600">Yalnız önceden yetkilendirilmiş yönetici hesapları erişebilir.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {!reset?<label className="block">E-posta adresi
          <input type="email" required autoComplete="email" maxLength={254} value={email}
            onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/>
        </label>:<>
          <p className="text-sm">En az 10 karakter; büyük harf, küçük harf ve rakam.</p>
          <label className="block">Yeni şifre<input type="password" required minLength={10} maxLength={128}
            autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"/></label>
          <label className="block">Şifre tekrar<input type="password" required minLength={10} maxLength={128}
            autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3"/></label>
        </>}
        <button type="submit" disabled={busy||(reset&&!verified)}
          className="w-full rounded-xl bg-[#D97724] p-3 font-bold text-white disabled:opacity-50">
          {reset?'Şifreyi güncelle':'Sıfırlama iletisi gönder'}</button>
      </form>
      {message&&<p role="status" className="mt-4 text-sm">{message}</p>}
      <Link href="/giris-admin" className="mt-6 block text-sm underline">Giriş ekranına dön</Link>
    </div>
  </main>;
}
