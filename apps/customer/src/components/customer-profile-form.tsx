'use client';

import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import type {CustomerProfileData,ProfileAddress} from '@/lib/profile-server';

async function postProfile(body:Record<string,unknown>){
  const response=await fetch('/api/customer/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok||result.ok===false)throw new Error(result.error||'İşlem tamamlanamadı.');
  return result;
}

export function CustomerProfileForm({profile}:{profile:CustomerProfileData}){
  const router=useRouter();
  const [name,setName]=useState(profile.name);
  const [email,setEmail]=useState(profile.email);
  const [addresses,setAddresses]=useState<ProfileAddress[]>(profile.addresses);
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPhone,setNewPhone]=useState('');
  const [phoneToken,setPhoneToken]=useState('');
  const [passwordToken,setPasswordToken]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  const run=async(task:()=>Promise<unknown>,success:string)=>{
    setBusy(true);setNotice('');
    try{await task();setNotice(success);router.refresh();}
    catch(error){setNotice(error instanceof Error?error.message:'İşlem tamamlanamadı.');}
    finally{setBusy(false);}
  };

  const save=(event:FormEvent)=>{
    event.preventDefault();
    void run(()=>postProfile({action:'update',name,email,addresses}),'Profiliniz güncellendi.');
  };

  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-5">
        {profile.avatarUrl?<img src={profile.avatarUrl} alt="" className="size-24 rounded-full object-cover"/>:
          <div className="grid size-24 place-items-center rounded-full bg-orange-100 text-3xl font-black text-[#D97724]">{name.slice(0,1).toLocaleUpperCase('tr-TR')}</div>}
        <div><h1 className="text-2xl font-black">Profilim</h1><p className="text-sm text-slate-600">{profile.phone}</p></div>
      </div>
      <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={event=>{
        event.preventDefault();const form=new FormData(event.currentTarget);
        void run(async()=>{const response=await fetch('/api/customer/profile/avatar',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error);},'Profil görseliniz güncellendi.');
      }}>
        <label className="text-sm font-semibold">Profil görseli
          <input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className="mt-2 block text-sm"/>
        </label>
        <button disabled={busy} className="rounded-xl bg-[#D97724] px-4 py-2 font-bold text-white disabled:opacity-50">Yükle</button>
      </form>
    </section>

    <form onSubmit={save} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black">Kişisel bilgiler ve adresler</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Ad soyad<input required minLength={2} maxLength={200} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
        <label className="text-sm font-semibold">E-posta<input type="email" maxLength={320} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
      </div>
      {addresses.map((address,index)=>{
        const available=profile.districts.filter(item=>item.cityId===address.cityId);
        return <fieldset key={index} className="rounded-2xl border border-slate-200 p-4">
          <legend className="px-2 text-sm font-bold">Adres {index+1}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Etiket<input maxLength={40} value={address.label} onChange={e=>setAddresses(current=>current.map((item,i)=>i===index?{...item,label:e.target.value}:item))} className="mt-1 w-full rounded-xl border p-3"/></label>
            <label className="text-sm">İl<select required value={address.cityId||''} onChange={e=>setAddresses(current=>current.map((item,i)=>i===index?{...item,cityId:Number(e.target.value),districtId:0}:item))} className="mt-1 w-full rounded-xl border p-3"><option value="">Seçin</option>{profile.cities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
            <label className="text-sm">İlçe<select required value={address.districtId||''} onChange={e=>setAddresses(current=>current.map((item,i)=>i===index?{...item,districtId:Number(e.target.value)}:item))} className="mt-1 w-full rounded-xl border p-3"><option value="">Seçin</option>{available.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            <label className="text-sm sm:col-span-2">Açık adres<textarea required minLength={10} maxLength={500} value={address.addressLine} onChange={e=>setAddresses(current=>current.map((item,i)=>i===index?{...item,addressLine:e.target.value}:item))} className="mt-1 w-full rounded-xl border p-3"/></label>
          </div>
          {addresses.length>1&&<button type="button" onClick={()=>setAddresses(current=>current.filter((_,i)=>i!==index).map((item,i)=>({...item,slot:i+1})))} className="mt-3 text-sm font-bold text-red-700">Adresi kaldır</button>}
        </fieldset>;
      })}
      {addresses.length<3&&<button type="button" onClick={()=>setAddresses(current=>[...current,{slot:current.length+1,label:`Adres ${current.length+1}`,cityId:0,districtId:0,addressLine:''}])} className="text-sm font-bold text-[#A64D12]">+ Adres ekle</button>}
      <button disabled={busy} className="w-full rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white disabled:opacity-50">Profil Bilgilerini Kaydet</button>
    </form>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black">Telefonu değiştir</h2>
        <label className="mt-4 block text-sm">Yeni telefon<input value={newPhone} onChange={e=>setNewPhone(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
        <label className="mt-3 block text-sm">Mevcut şifre<input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
        <button disabled={busy} onClick={()=>void run(()=>postProfile({action:'phone-start',phone:newPhone,currentPassword}),'Yeni telefonunuza doğrulama kodu gönderildi.')} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Kod gönder</button>
        <label className="mt-4 block text-sm">SMS kodu<input value={phoneToken} onChange={e=>setPhoneToken(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
        <button disabled={busy} onClick={()=>void run(()=>postProfile({action:'phone-confirm',phone:newPhone,token:phoneToken}),'Telefon numaranız güncellendi.')} className="mt-3 rounded-xl bg-[#D97724] px-4 py-2 font-bold text-white">Telefonu doğrula</button>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black">Şifreyi değiştir</h2>
        <button disabled={busy} onClick={()=>void run(()=>postProfile({action:'password-start'}),'Telefonunuza güvenlik kodu gönderildi.')} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">SMS kodu gönder</button>
        <label className="mt-4 block text-sm">SMS kodu<input value={passwordToken} onChange={e=>setPasswordToken(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
        <label className="mt-3 block text-sm">Yeni şifre<input type="password" minLength={10} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
        <button disabled={busy} onClick={()=>void run(()=>postProfile({action:'password-confirm',token:passwordToken,password:newPassword}),'Şifreniz güncellendi.')} className="mt-3 rounded-xl bg-[#D97724] px-4 py-2 font-bold text-white">Şifreyi kaydet</button>
      </div>
    </section>
    {notice&&<p role="status" className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">{notice}</p>}
  </div>;
}
