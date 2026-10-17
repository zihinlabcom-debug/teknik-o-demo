'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {TechnicianAuthShell} from '@/components/technician-auth-shell';

type Category={id:string;name:string};
type City={id:number;name:string};
type District={id:number;city_id:number;name:string};
type SelectedDocument={id:string;file:File;categoryId:string;uploaded:boolean};

export function TechnicianSignupForm({categories,cities,districts}:{
  categories:Category[];cities:City[];districts:District[];
}){
  const [fullName,setFullName]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [passwordConfirmation,setPasswordConfirmation]=useState('');
  const [categoryIds,setCategoryIds]=useState<string[]>([]);
  const [cityId,setCityId]=useState<number|null>(null);
  const [districtIds,setDistrictIds]=useState<number[]>([]);
  const [addressCityId,setAddressCityId]=useState<number|null>(null);
  const [addressDistrictId,setAddressDistrictId]=useState<number|null>(null);
  const [addressLine,setAddressLine]=useState('');
  const [districtMenuOpen,setDistrictMenuOpen]=useState(false);
  const districtMenuRef=useRef<HTMLDivElement>(null);
  const [documents,setDocuments]=useState<SelectedDocument[]>([]);
  const [token,setToken]=useState('');
  const [step,setStep]=useState<'form'|'otp'|'documents'|'complete'>('form');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const availableDistricts=districts.filter(d=>d.city_id===cityId);
  const addressDistricts=districts.filter(d=>d.city_id===addressCityId);
  useEffect(()=>{
    if(!districtMenuOpen)return;
    function onOutside(event:PointerEvent){if(!districtMenuRef.current?.contains(event.target as Node))setDistrictMenuOpen(false);}
    function onEscape(event:KeyboardEvent){if(event.key==='Escape')setDistrictMenuOpen(false);}
    document.addEventListener('pointerdown',onOutside);document.addEventListener('keydown',onEscape);
    return ()=>{document.removeEventListener('pointerdown',onOutside);document.removeEventListener('keydown',onEscape);};
  },[districtMenuOpen]);

  function selectDocuments(files:FileList|null){
    if(!files)return;
    const selected=Array.from(files);
    if(documents.length+selected.length>5){setNotice('En fazla 5 belge yükleyebilirsiniz.');return;}
    if(selected.some(file=>!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024||file.size===0)){
      setNotice('Belgeler PDF, JPG veya PNG olmalı ve her biri en fazla 5 MB olabilir.');return;
    }
    setDocuments(current=>[...current,...selected.map(file=>({id:crypto.randomUUID(),file,
      categoryId:categoryIds.length===1?categoryIds[0]:'',uploaded:false}))]);
    setNotice('');
  }

  async function uploadDocuments(items:SelectedDocument[]){
    let failed=false;
    for(const item of items.filter(document=>!document.uploaded)){
      const payload=new FormData();payload.set('file',item.file);payload.set('categoryId',item.categoryId);
      payload.set('currentPassword',password);
      try{
        const response=await fetch('/api/technician/documents',{method:'POST',body:payload});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||'Belge yüklenemedi.');
        setDocuments(current=>current.map(document=>document.id===item.id?{...document,uploaded:true}:document));
      }catch(error){failed=true;setNotice(error instanceof Error?error.message:'Belge yüklenemedi.');}
    }
    if(!failed)setStep('complete');
  }

  const requestCode=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/auth/email/signup',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode:'signup',fullName,phone,email,password,categoryIds,cityId,districtIds,
          addressCityId,addressDistrictId,addressLine}),
      });
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Başvuru başlatılamadı.');return;}
      if(result.requiresOtp===false){
        if(documents.length){setStep('documents');await uploadDocuments(documents);}
        else setStep('complete');
        return;
      }
      setStep('otp');
      setNotice('E-posta adresinize gönderilen 6 haneli kodu girin.');
    }catch{setNotice('Doğrulama hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
  };

  const verifyCode=async(event:FormEvent)=>{
    event.preventDefault();setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/auth/email/verify',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,token}),
      });
      const result=await response.json();
      if(!response.ok){setNotice(result.error||'Başvuru tamamlanamadı.');return;}
      if(documents.length){setStep('documents');await uploadDocuments(documents);}
      else setStep('complete');
    }catch{setNotice('Doğrulama hizmetine ulaşılamıyor.');}
    finally{setBusy(false);}
  };

  return <TechnicianAuthShell wide eyebrow="USTA BAŞVURUSU" title="HizmetPey Usta" description="Hizmet alanlarınızı belirleyin, başvurunuzu tamamlayın ve onay sürecini takip edin.">

      {step==='form'&&<form className="mt-8 space-y-5" onSubmit={requestCode}>
        <label className="block text-sm font-semibold">Ad Soyad
          <input required minLength={2} maxLength={200} value={fullName} onChange={e=>setFullName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <label className="block text-sm font-semibold">Telefon
          <input required type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <label className="block text-sm font-semibold">E-posta
          <input required type="email" value={email} onChange={e=>setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <label className="block text-sm font-semibold">Şifre
          <input required type="password" minLength={10} maxLength={128} autoComplete="new-password"
            value={password} onChange={e=>setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/>
          <span className="mt-1 block text-xs font-normal text-slate-600">En az 10 karakter; büyük harf, küçük harf ve rakam içermeli.</span></label>
        <label className="block text-sm font-semibold">Şifre tekrar
          <input required type="password" minLength={10} maxLength={128} autoComplete="new-password"
            value={passwordConfirmation} onChange={e=>setPasswordConfirmation(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <fieldset><legend className="text-sm font-semibold">Hizmet kategorileri (bir veya daha fazla)</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{categories.map(category=><label key={category.id}
            className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
            <input type="checkbox" checked={categoryIds.includes(category.id)}
              onChange={e=>setCategoryIds(current=>e.target.checked?[...current,category.id]:current.filter(id=>id!==category.id))}/>
            {category.name}</label>)}</div></fieldset>
        <fieldset className="space-y-3"><legend className="text-sm font-semibold">Kayıt / ikamet veya işyeri adresiniz</legend>
          <label className="block text-sm font-semibold">Adres ili
            <select required value={addressCityId??''} onChange={e=>{setAddressCityId(e.target.value?Number(e.target.value):null);setAddressDistrictId(null);}}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base">
              <option value="">İl seçin</option>{cities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}
            </select></label>
          <label className="block text-sm font-semibold">Adres ilçesi
            <select required disabled={!addressCityId} value={addressDistrictId??''}
              onChange={e=>setAddressDistrictId(e.target.value?Number(e.target.value):null)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base">
              <option value="">İlçe seçin</option>{addressDistricts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select></label>
          <label className="block text-sm font-semibold">Açık adres
            <textarea required minLength={10} maxLength={500} value={addressLine} onChange={e=>setAddressLine(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        </fieldset>
        <label className="block text-sm font-semibold">Hizmet verdiğiniz şehir
          <select required value={cityId??''} onChange={e=>{setCityId(e.target.value?Number(e.target.value):null);setDistrictIds([]);}}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base">
            <option value="">Şehir seçin</option>{cities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}
          </select></label>
        <div ref={districtMenuRef} className="relative"><span className="text-sm font-semibold">Hizmet verilen ilçeler (bir veya daha fazla)</span>
          <button type="button" aria-expanded={districtMenuOpen} aria-controls="service-district-options"
            disabled={!cityId} onClick={()=>setDistrictMenuOpen(open=>!open)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-left text-sm disabled:opacity-50">
            {districtIds.length?`${districtIds.length} ilçe seçildi: ${availableDistricts.filter(d=>districtIds.includes(d.id)).map(d=>d.name).join(', ')}`:'İlçeleri seçin'}
          </button>
          {districtMenuOpen&&<div id="service-district-options" className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="max-h-48 space-y-1 overflow-y-auto">{availableDistricts.map(district=><label key={district.id} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" checked={districtIds.includes(district.id)}
                onChange={e=>setDistrictIds(current=>e.target.checked?[...current,district.id]:current.filter(id=>id!==district.id))}/>
              {district.name}</label>)}</div>
            <button type="button" onClick={()=>setDistrictMenuOpen(false)} className="mt-2 rounded-lg bg-[#C86B32] px-3 py-2 text-sm font-semibold text-white">Seçimi tamamla</button>
          </div>}</div>
        <div><label htmlFor="qualification-documents" className="text-sm font-semibold">Mesleki yeterlilik / ustalık belgeleri</label>
          <p className="mt-1 text-sm text-slate-600">Mesleğinizle ilgili sertifika veya belgeniz varsa yükleyiniz. Bazı hizmet alanlarında belge zorunlu olabilir. Gerekli durumlarda HizmetPey ekibi sizden ek belge talep edebilir.</p>
          <input id="qualification-documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={e=>{selectDocuments(e.target.files);e.target.value='';}} className="mt-2 block w-full text-sm"/>
          {documents.map(item=><div key={item.id} className="mt-2 flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
            <select aria-label={`${item.file.name} kategorisi`} required value={item.categoryId}
              onChange={e=>setDocuments(current=>current.map(doc=>doc.id===item.id?{...doc,categoryId:e.target.value}:doc))}
              className="rounded-lg border p-2"><option value="">Kategori seçin</option>
              {categories.filter(c=>categoryIds.includes(c.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select><button type="button" onClick={()=>setDocuments(current=>current.filter(doc=>doc.id!==item.id))}>Kaldır</button>
          </div>)}</div>
        <button type="submit" disabled={busy||password!==passwordConfirmation||!categoryIds.length||!districtIds.length||!addressDistrictId||documents.some(item=>!item.categoryId||!categoryIds.includes(item.categoryId))}
          className="w-full rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white shadow-sm disabled:opacity-50">Hesap Oluştur</button>
        <p className="text-center text-sm text-slate-600">Hesabınız var mı? <Link href="/giris-usta" className="font-bold text-[#A64D12] underline">Usta Girişi</Link></p>
      </form>}

      {step==='otp'&&<button type="button" disabled={busy} onClick={async()=>{
        setBusy(true);try{const response=await fetch('/api/auth/email/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
          const result=await response.json();setNotice(result.message||result.error);
        }catch{setNotice('Kod gönderilemedi.');}finally{setBusy(false);}
      }} className="mt-4 text-sm underline">Kodu yeniden gönder</button>}
      {step==='otp'&&<form className="mt-8 space-y-4" onSubmit={verifyCode}>
        <label className="block text-sm font-semibold">E-posta Doğrulama Kodu
          <input required inputMode="numeric" autoComplete="one-time-code" value={token}
            onChange={e=>setToken(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base"/></label>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white">Kayıt Oluştur</button>
        <button type="button" onClick={()=>{setStep('form');setToken('');}} className="w-full text-sm text-slate-600">Bilgileri Düzenle</button>
      </form>}

      {step==='documents'&&<div className="mt-8 space-y-3 text-sm">
        <p className="font-bold">Usta hesabınız oluşturuldu. Belgeleriniz yükleniyor.</p>
        {documents.map(item=><p key={item.id}>{item.file.name}: {item.uploaded?'Yüklendi':'Yüklenmeyi bekliyor'}</p>)}
        <button type="button" disabled={busy} onClick={()=>{setBusy(true);void uploadDocuments(documents).finally(()=>setBusy(false));}}
          className="rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white disabled:opacity-50">Yüklemeyi yeniden dene</button>
        <Link href="/usta" className="ml-3 underline">Daha sonra usta panelinden yükle</Link>
      </div>}

      {step==='complete'&&<div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-bold">Başvurunuz alındı. Admin onayı bekleniyor.</p>
        <p className="mt-2">Kategorilerinizi ve hizmet alanlarınızı usta panelinde görebilirsiniz.</p>
        <Link href="/usta" className="mt-4 inline-block rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white">Usta paneline git</Link>
      </div>}
      {notice&&<p role="status" className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{notice}</p>}
  </TechnicianAuthShell>;
}
