'use client';

import {useEffect,useState,type ChangeEvent,type FormEvent,type KeyboardEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,Building2,CheckCircle2,Eye,EyeOff,LockKeyhole,Mail,MapPin,Navigation,Phone,User} from 'lucide-react';
import {AuthVisualShell} from '@/components/auth-visual-shell';

type City={id:number;name:string};
type District={id:number;city_id:number;name:string};

export default function KayitPage(){
  const router=useRouter();
  const [cities,setCities]=useState<City[]>([]);
  const [districts,setDistricts]=useState<District[]>([]);
  const [selectedCityId,setSelectedCityId]=useState<number|null>(null);
  const [authStep,setAuthStep]=useState<'form'|'otp'>('form');
  const [passwordVisible,setPasswordVisible]=useState(false);
  const [formData,setFormData]=useState({
    fullName:'',phone:'',email:'',password:'',passwordConfirmation:'',city:'',district:'',address:'',
  });
  const [otpCode,setOtpCode]=useState<string[]>(Array(6).fill(''));
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    async function loadCities(){
      try{
        const response=await fetch('/api/auth/email/catalog');
        const result=await response.json();
        if(!response.ok)throw new Error('Catalog unavailable');
        setCities(result.items);
      }catch{
        setNotice('İl seçenekleri yüklenemedi. Lütfen sayfayı yenileyin.');
      }
    }
    void loadCities();
  },[]);

  useEffect(()=>{
    async function loadDistricts(){
      if(!selectedCityId){
        setDistricts([]);
        return;
      }
      try{
        const response=await fetch(`/api/auth/email/catalog?cityId=${selectedCityId}`);
        const result=await response.json();
        if(!response.ok)throw new Error('Catalog unavailable');
        setDistricts(result.items);
      }catch{
        setNotice('İlçe seçenekleri yüklenemedi. Lütfen tekrar seçin.');
      }
    }
    void loadDistricts();
  },[selectedCityId]);

  function handleInputChange(event:ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>){
    const {name,value}=event.target;
    if(name==='city'){
      const cityId=value?Number(value):null;
      setSelectedCityId(cityId);
      setFormData(previous=>({...previous,city:value,district:''}));
      return;
    }
    setFormData(previous=>({...previous,[name]:value}));
  }

  async function handleFormSubmit(event:FormEvent){
    event.preventDefault();
    if(!formData.fullName||!formData.phone||!formData.city||!formData.district||!formData.address){
      setNotice('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    if(formData.password!==formData.passwordConfirmation){
      setNotice('Şifreler eşleşmiyor.');
      return;
    }
    setBusy(true);
    setNotice('');
    try{
      const response=await fetch('/api/auth/email/signup',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          phone:formData.phone,
          fullName:formData.fullName,
          email:formData.email,
          password:formData.password,
          cityId:Number(formData.city),
          districtId:Number(formData.district),
          addressLine:formData.address,
        }),
      });
      const result=await response.json();
      if(!response.ok){
        setNotice(result.error||'Doğrulama başlatılamadı.');
        return;
      }
      if(result.requiresOtp===false){
        router.replace(result.redirect||'/hizmetler');
        router.refresh();
        return;
      }
      setAuthStep('otp');
      setNotice('E-posta adresinize gönderilen 6 haneli kodu girin.');
    }catch{
      setNotice('Doğrulama hizmetine ulaşılamıyor.');
    }finally{
      setBusy(false);
    }
  }

  function handleOtpChange(index:number,value:string){
    const digit=value.slice(-1).replace(/\D/g,'');
    setOtpCode(previous=>previous.map((item,itemIndex)=>itemIndex===index?digit:item));
    if(digit&&index<otpCode.length-1)document.getElementById(`otp-${index+1}`)?.focus();
  }

  function handleOtpKeyDown(index:number,event:KeyboardEvent<HTMLInputElement>){
    if(event.key==='Backspace'&&!otpCode[index]&&index>0)document.getElementById(`otp-${index-1}`)?.focus();
  }

  async function handleVerifyOtp(){
    setBusy(true);
    setNotice('');
    try{
      const response=await fetch('/api/auth/email/verify',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:formData.email,token:otpCode.join('')}),
      });
      const result=await response.json();
      if(!response.ok){
        setNotice(result.error||'Kod doğrulanamadı.');
        return;
      }
      router.replace(result.redirect||'/hizmetler');
      router.refresh();
    }catch{
      setNotice('Doğrulama hizmetine ulaşılamıyor.');
    }finally{
      setBusy(false);
    }
  }

  async function resendOtp(){
    setBusy(true);
    setNotice('');
    try{
      const response=await fetch('/api/auth/email/resend',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:formData.email}),
      });
      const result=await response.json();
      setNotice(result.message||result.error||'Kod yeniden gönderilemedi.');
    }catch{
      setNotice('Kod gönderilemedi.');
    }finally{
      setBusy(false);
    }
  }

  return <AuthVisualShell wide title={authStep==='form'?'Kayıt Ol':'E-posta Doğrulama'} description={authStep==='form'?'Dakikalar içinde hesabını oluştur, ihtiyaçlarını paylaş ve güvenilir hizmete ulaş.':'Hesabını tamamlamak için e-posta adresine gönderilen kodu gir.'}>
    {authStep==='form'?<form className="space-y-5" onSubmit={handleFormSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field icon={User} label="Ad Soyad" name="fullName" value={formData.fullName} onChange={handleInputChange} autoComplete="name" placeholder="Adınız ve soyadınız"/>
        <Field icon={Mail} label="E-posta" name="email" value={formData.email} onChange={handleInputChange} type="email" autoComplete="email" placeholder="E-posta adresiniz"/>
        <Field icon={Phone} label="Telefon Numarası" name="phone" value={formData.phone} onChange={handleInputChange} type="tel" autoComplete="tel" placeholder="05XX XXX XX XX" className="sm:col-span-2"/>
        <label className="block text-[13px] font-bold text-[#17263B]">İl
          <span className="relative mt-2 block"><Building2 className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
            <select name="city" required value={formData.city} onChange={handleInputChange} autoComplete="address-level1" className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base shadow-[0_4px_14px_rgba(8,43,76,0.04)] outline-none focus:border-[#C86B32] focus:ring-4 focus:ring-[#C86B32]/15">
              <option value="">İl seçiniz</option>{cities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </span>
        </label>
        <label className="block text-[13px] font-bold text-[#17263B]">İlçe
          <span className="relative mt-2 block"><Navigation className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
            <select name="district" required value={formData.district} onChange={handleInputChange} disabled={!formData.city} autoComplete="address-level2" className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base shadow-[0_4px_14px_rgba(8,43,76,0.04)] outline-none focus:border-[#C86B32] focus:ring-4 focus:ring-[#C86B32]/15 disabled:cursor-not-allowed disabled:bg-slate-100">
              <option value="">{formData.city?'İlçe seçiniz':'Önce il seçiniz'}</option>{districts.map(district=><option key={district.id} value={district.id}>{district.name}</option>)}
            </select>
          </span>
        </label>
        <label className="block text-[13px] font-bold text-[#17263B] sm:col-span-2">Açık Adres
          <span className="relative mt-2 block"><MapPin className="pointer-events-none absolute left-4 top-4 size-5 text-slate-400" aria-hidden="true"/>
            <textarea name="address" required minLength={10} rows={3} value={formData.address} onChange={handleInputChange} autoComplete="street-address" placeholder="Mahalle, sokak, bina ve daire bilgisi" className="w-full resize-none rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base shadow-[0_4px_14px_rgba(8,43,76,0.04)] outline-none focus:border-[#C86B32] focus:ring-4 focus:ring-[#C86B32]/15"/>
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField label="Şifre" name="password" value={formData.password} visible={passwordVisible} onChange={handleInputChange} onToggle={()=>setPasswordVisible(value=>!value)}/>
        <PasswordField label="Şifre Tekrar" name="passwordConfirmation" value={formData.passwordConfirmation} visible={passwordVisible} onChange={handleInputChange} onToggle={()=>setPasswordVisible(value=>!value)}/>
      </div>
      <p className="text-xs leading-5 text-slate-500">Şifreniz en az 10 karakter, büyük harf, küçük harf ve rakam içermelidir.</p>

      <button type="submit" disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D47A43] to-[#B85F2A] px-5 font-bold text-white shadow-lg shadow-[#C86B32]/20 transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#082B4C] disabled:cursor-not-allowed disabled:opacity-60">
        {busy?'Kayıt hazırlanıyor…':'Hesap Oluştur'}{busy?null:<ArrowRight className="size-5" aria-hidden="true"/>}
      </button>
      <p className="text-xs leading-5 text-slate-500">E-posta doğrulamasından sonra profil ve adres bilgileriniz güvenli biçimde kaydedilir.</p>
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center text-sm text-slate-600">Zaten hesabın var mı? <Link href="/giris" className="inline-flex min-h-11 items-center font-bold text-[#A65324] underline-offset-4 hover:underline">Giriş Yap</Link></p>
    </form>:<div className="text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#EAF7F0] text-[#16815D]"><CheckCircle2 className="size-7" aria-hidden="true"/></div>
      <p className="mt-4 text-sm leading-6 text-slate-600"><span className="font-bold text-[#17263B]">{formData.email}</span> adresine gönderilen kodu girin.</p>
      <div className="mt-7 flex justify-center gap-1.5 min-[375px]:gap-2 sm:gap-3" aria-label="Altı haneli doğrulama kodu">
        {otpCode.map((digit,index)=><input key={index} id={`otp-${index}`} type="text" inputMode="numeric" autoComplete={index===0?'one-time-code':'off'} maxLength={1} value={digit} onChange={event=>handleOtpChange(index,event.target.value)} onKeyDown={event=>handleOtpKeyDown(index,event)} aria-label={`${index+1}. hane`} className="size-10 rounded-2xl border-2 border-slate-200 bg-white text-center text-xl font-bold outline-none focus:border-[#C86B32] focus:ring-4 focus:ring-[#C86B32]/15 min-[375px]:size-11 sm:size-12"/>)}
      </div>
      <button type="button" onClick={handleVerifyOtp} disabled={busy||otpCode.some(digit=>!digit)} className="mt-7 min-h-14 w-full rounded-2xl bg-gradient-to-r from-[#D47A43] to-[#B85F2A] px-5 font-bold text-white shadow-lg shadow-[#C86B32]/20 disabled:cursor-not-allowed disabled:opacity-60">{busy?'Doğrulanıyor…':'Kayıt Oluştur ve Giriş Yap'}</button>
      <button type="button" disabled={busy} onClick={resendOtp} className="mt-3 min-h-11 w-full text-sm font-bold text-[#A65324] underline-offset-4 hover:underline disabled:opacity-60">Kodu yeniden gönder</button>
      <button type="button" disabled={busy} onClick={()=>setAuthStep('form')} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#082B4C]"><ArrowLeft className="size-4" aria-hidden="true"/> Bilgileri düzenle</button>
    </div>}

    {notice?<p role="status" aria-live="polite" className="mt-5 rounded-2xl border border-[#E6A275] bg-[#FFF2E8] p-4 text-sm font-medium text-[#7A3B19]">{notice}</p>:null}
  </AuthVisualShell>;
}

function Field({icon:Icon,label,name,value,onChange,type='text',autoComplete,placeholder,className=''}:{
  icon:typeof User;
  label:string;
  name:string;
  value:string;
  onChange:(event:ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>void;
  type?:string;
  autoComplete:string;
  placeholder:string;
  className?:string;
}){
  return <label className={`block text-[13px] font-bold text-[#17263B] ${className}`}>{label}
    <span className="relative mt-2 block"><Icon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
      <input type={type} name={name} required value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base shadow-[0_4px_14px_rgba(8,43,76,0.04)] outline-none focus:border-[#C86B32] focus:ring-4 focus:ring-[#C86B32]/15"/>
    </span>
  </label>;
}

function PasswordField({label,name,value,visible,onChange,onToggle}:{
  label:string;
  name:string;
  value:string;
  visible:boolean;
  onChange:(event:ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>void;
  onToggle:()=>void;
}){
  return <div>
    <label htmlFor={name} className="block text-[13px] font-bold text-[#17263B]">{label}</label>
    <span className="relative mt-2 block"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
      <input id={name} type={visible?'text':'password'} name={name} required minLength={10} maxLength={128} value={value} onChange={onChange} autoComplete="new-password" className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-14 text-base shadow-[0_4px_14px_rgba(8,43,76,0.04)] outline-none focus:border-[#C86B32] focus:ring-4 focus:ring-[#C86B32]/15"/>
      <button type="button" aria-label={visible?'Şifreyi gizle':'Şifreyi göster'} aria-pressed={visible} onClick={onToggle} className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#C86B32]">{visible?<EyeOff className="size-5" aria-hidden="true"/>:<Eye className="size-5" aria-hidden="true"/>}</button>
    </span>
  </div>;
}
