'use client';

import {useMemo,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';

type Props={data:{
  user:{id:string;name:string;phone:string|null;email:string|null};
  profile:{approval_status:string|null;is_available:boolean|null;address_city_id:number|null;address_district_id:number|null;address_line:string|null;avatarUrl:string|null};
  areas:{city_id:number;district_id:number|null}[];
  assigned:{category_id:string;approval_status:string;service_categories:{name:string}|{name:string}[]|null}[];
  documents:{id:string;category_id:string;original_file_name:string;status:string;rejection_reason:string|null;created_at:string}[];
  categories:{id:string;name:string}[];
  cities:{id:number;name:string}[];
  districts:{id:number;city_id:number;name:string}[];
}};

async function postProfile(body:Record<string,unknown>){
  const response=await fetch('/api/technician/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok||result.ok===false)throw new Error(result.error||'İşlem tamamlanamadı.');
  return result;
}

function categoryName(value:Props['data']['assigned'][number]['service_categories']){
  return Array.isArray(value)?value[0]?.name??'Kategori':value?.name??'Kategori';
}

export function TechnicianProfileForm({data}:Props){
  const router=useRouter();
  const serviceCity=Number(data.areas[0]?.city_id??0);
  const [name,setName]=useState(data.user.name);
  const [email]=useState(data.user.email??'');
  const [addressCityId,setAddressCityId]=useState(Number(data.profile.address_city_id??0));
  const [addressDistrictId,setAddressDistrictId]=useState(Number(data.profile.address_district_id??0));
  const [addressLine,setAddressLine]=useState(data.profile.address_line??'');
  const [serviceCityId,setServiceCityId]=useState(serviceCity);
  const [serviceDistrictIds,setServiceDistrictIds]=useState<number[]>(data.areas.map(item=>Number(item.district_id)).filter(Boolean));
  const [currentPassword,setCurrentPassword]=useState('');
  const [newCategory,setNewCategory]=useState('');
  const [newPhone,setNewPhone]=useState('');
  const [phoneToken,setPhoneToken]=useState('');
  const [passwordToken,setPasswordToken]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const availableAddressDistricts=useMemo(()=>data.districts.filter(item=>Number(item.city_id)===addressCityId),[data.districts,addressCityId]);
  const availableServiceDistricts=useMemo(()=>data.districts.filter(item=>Number(item.city_id)===serviceCityId),[data.districts,serviceCityId]);
  const existingCategoryIds=new Set(data.assigned.map(item=>item.category_id));

  const run=async(task:()=>Promise<unknown>,success:string)=>{
    setBusy(true);setNotice('');
    try{await task();setNotice(success);router.refresh();}
    catch(error){setNotice(error instanceof Error?error.message:'İşlem tamamlanamadı.');}
    finally{setBusy(false);}
  };

  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center gap-5">
        {data.profile.avatarUrl?<img src={data.profile.avatarUrl} alt="" className="size-24 rounded-full object-cover"/>:
          <div className="grid size-24 place-items-center rounded-full bg-orange-100 text-3xl font-black text-[#D97724]">{name.slice(0,1).toLocaleUpperCase('tr-TR')}</div>}
        <div><h1 className="text-2xl font-black">Usta Profilim</h1><p className="text-sm text-slate-600">{data.user.phone}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#A64D12]">Hesap durumu: {data.profile.approval_status}</p></div>
      </div>
      <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={event=>{
        event.preventDefault();const form=new FormData(event.currentTarget);
        void run(async()=>{const response=await fetch('/api/technician/profile/avatar',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error);},'Profil görseliniz güncellendi.');
      }}>
        <label className="text-sm font-semibold">Profil görseli<input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className="mt-2 block text-sm"/></label>
        <label className="text-sm font-semibold">Mevcut şifre<input name="currentPassword" type="password" required className="mt-2 w-full rounded-xl border p-2"/></label>
        <button disabled={busy} className="self-end rounded-xl bg-[#D97724] px-4 py-2 font-bold text-white">Yükle</button>
      </form>
    </section>

    <form onSubmit={(event:FormEvent)=>{event.preventDefault();void run(()=>postProfile({action:'update',name,email,addressCityId,addressDistrictId,addressLine,serviceCityId,serviceDistrictIds,currentPassword}),'Profiliniz güncellendi.');}} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-black">Kişisel bilgiler ve hizmet alanı</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Ad soyad<input required minLength={2} maxLength={200} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
        <label className="text-sm font-semibold">E-posta<input type="email" maxLength={320} value={email} readOnly className="mt-2 w-full rounded-xl border p-3"/></label>
        <label className="text-sm font-semibold">Adres ili<select required value={addressCityId||''} onChange={e=>{setAddressCityId(Number(e.target.value));setAddressDistrictId(0);}} className="mt-2 w-full rounded-xl border p-3"><option value="">Seçin</option>{data.cities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
        <label className="text-sm font-semibold">Adres ilçesi<select required value={addressDistrictId||''} onChange={e=>setAddressDistrictId(Number(e.target.value))} className="mt-2 w-full rounded-xl border p-3"><option value="">Seçin</option>{availableAddressDistricts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Açık adres<textarea required minLength={10} maxLength={500} value={addressLine} onChange={e=>setAddressLine(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
        <label className="text-sm font-semibold">Hizmet şehri<select required value={serviceCityId||''} onChange={e=>{setServiceCityId(Number(e.target.value));setServiceDistrictIds([]);}} className="mt-2 w-full rounded-xl border p-3"><option value="">Seçin</option>{data.cities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
        <fieldset><legend className="text-sm font-semibold">Hizmet ilçeleri</legend><div className="mt-2 max-h-40 space-y-2 overflow-auto rounded-xl border p-3">{availableServiceDistricts.map(d=><label key={d.id} className="flex gap-2 text-sm"><input type="checkbox" checked={serviceDistrictIds.includes(d.id)} onChange={e=>setServiceDistrictIds(current=>e.target.checked?[...current,d.id]:current.filter(id=>id!==d.id))}/>{d.name}</label>)}</div></fieldset>
      </div>
      <label className="block text-sm font-semibold">Değişiklikleri onaylamak için mevcut şifre<input type="password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
      <button disabled={busy} className="w-full rounded-xl bg-[#D97724] px-4 py-3 font-bold text-white">Bilgileri Kaydet</button>
    </form>

    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-black">Hizmet kategorileri</h2>
      <div className="mt-3 flex flex-wrap gap-2">{data.assigned.map(item=><span key={item.category_id} className="rounded-full bg-slate-100 px-3 py-2 text-sm">{categoryName(item.service_categories)} · {item.approval_status}</span>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <select value={newCategory} onChange={e=>setNewCategory(e.target.value)} className="rounded-xl border p-3"><option value="">Yeni kategori seçin</option>{data.categories.filter(item=>!existingCategoryIds.has(item.id)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <input type="password" placeholder="Mevcut şifre" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="rounded-xl border p-3"/>
        <button disabled={busy||!newCategory} onClick={()=>void run(()=>postProfile({action:'add-category',categoryId:newCategory,currentPassword}),'Kategori onaya gönderildi.')} className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Kategori ekle</button>
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-black">Belgeler</h2>
      <div className="mt-3 space-y-2">{data.documents.map(doc=><div key={doc.id} className="rounded-xl bg-slate-50 p-3 text-sm"><a className="font-bold underline" href={`/api/technician/documents/${doc.id}`}>{doc.original_file_name}</a><span> · {doc.status}</span>{doc.rejection_reason&&<p className="text-red-700">{doc.rejection_reason}</p>}</div>)}</div>
      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={event=>{
        event.preventDefault();const form=new FormData(event.currentTarget);
        void run(async()=>{const response=await fetch('/api/technician/documents',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error);},'Belge onaya gönderildi.');
      }}>
        <input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png" className="text-sm"/>
        <select name="categoryId" required className="rounded-xl border p-2"><option value="">Kategori</option>{data.assigned.map(item=><option key={item.category_id} value={item.category_id}>{categoryName(item.service_categories)}</option>)}</select>
        <input name="currentPassword" type="password" required placeholder="Mevcut şifre" className="rounded-xl border p-2"/>
        <button disabled={busy} className="rounded-xl bg-[#D97724] px-4 py-2 font-bold text-white">Yükle</button>
      </form>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black">Telefonu değiştir</h2>
        <input placeholder="Yeni telefon" value={newPhone} onChange={e=>setNewPhone(e.target.value)} className="mt-4 w-full rounded-xl border p-3"/>
        <input type="password" placeholder="Mevcut şifre" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-3 w-full rounded-xl border p-3"/>
        <button onClick={()=>void run(()=>Promise.reject(new Error('Telefon değişikliği SMS doğrulaması yeniden açılana kadar kullanılamıyor.')),'Yeni telefonunuza kod gönderildi.')} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">Kod gönder</button>
        <input placeholder="SMS kodu" value={phoneToken} onChange={e=>setPhoneToken(e.target.value)} className="mt-4 w-full rounded-xl border p-3"/>
        <button onClick={()=>void run(()=>Promise.reject(new Error('Telefon doğrulaması şu anda kapalı.')),'Telefon güncellendi.')} className="mt-3 rounded-xl bg-[#D97724] px-4 py-2 font-bold text-white">Doğrula</button>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black">Şifreyi değiştir</h2>
        <button onClick={()=>void run(()=>postProfile({action:'password-start'}),'E-posta adresinize güvenlik kodu gönderildi.')} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">E-posta kodu gönder</button>
        <input placeholder="E-posta kodu" value={passwordToken} onChange={e=>setPasswordToken(e.target.value)} className="mt-4 w-full rounded-xl border p-3"/>
        <input type="password" placeholder="Yeni şifre" minLength={10} value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mt-3 w-full rounded-xl border p-3"/>
        <button onClick={()=>void run(()=>postProfile({action:'password-confirm',token:passwordToken,password:newPassword}),'Şifreniz güncellendi.')} className="mt-3 rounded-xl bg-[#D97724] px-4 py-2 font-bold text-white">Şifreyi kaydet</button>
      </div>
    </section>
    {notice&&<p role="status" className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">{notice}</p>}
  </div>;
}
