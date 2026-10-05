'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

type Category={id:string;name:string;is_active:boolean};
type City={id:number;name:string;is_active:boolean};
type District={id:number;city_id:number;name:string;is_active:boolean};
type Assignment={category_id:string};
type Area={city_id:number;district_id:number|null};
type Document={id:string;document_type:string;status:string};

export function TechnicianAdminControls({technicianId,approvalStatus,isActive,categories,cities,districts,
  assignments,areas,documents}:{technicianId:string;approvalStatus:string;isActive:boolean;
  categories:Category[];cities:City[];districts:District[];assignments:Assignment[];
  areas:Area[];documents:Document[]}){
  const router=useRouter();
  const [categoryId,setCategoryId]=useState('');
  const [cityId,setCityId]=useState('');
  const [districtId,setDistrictId]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function change(action:string,extra:Record<string,unknown>={}){
    setBusy(true);setError('');
    try{
      const response=await fetch(`/api/admin/technicians/${technicianId}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra}),
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(typeof body.error==='string'?body.error:'Usta işlemi tamamlanamadı.');
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Usta işlemi tamamlanamadı.');}
    finally{setBusy(false);}
  }
  const button=(label:string,action:string,extra:Record<string,unknown>={})=><button
    type="button" disabled={busy} onClick={()=>void change(action,extra)}
    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">{label}</button>;
  return <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-sm">
    <p className="text-slate-600">Ustanın beyan ettiği kategori ve hizmet alanlarını gerektiğinde burada yönetebilirsiniz.</p>
    <div className="flex flex-wrap gap-2" aria-label="Usta onay ve aktiflik işlemleri">
      {approvalStatus!=='approved'&&button('Onayla','approve')}
      {approvalStatus!=='rejected'&&button('Reddet','reject')}
      {approvalStatus!=='suspended'&&button('Askıya al','suspend')}
      {approvalStatus!=='pending'&&button('Beklemeye al','pending')}
      {button(isActive?'Pasifleştir':'Aktifleştir',isActive?'deactivate':'activate')}
    </div>
    <div>
      <p className="font-semibold">Kategoriler</p>
      <div className="mt-2 flex flex-wrap gap-2">{assignments.map(a=><span key={a.category_id} className="rounded-lg bg-slate-50 px-2 py-1">
        {categories.find(c=>c.id===a.category_id)?.name??'Kategori'}{' '}
        {button('Kaldır','category_remove',{categoryId:a.category_id})}</span>)}</div>
      <div className="mt-2 flex flex-wrap gap-2"><select aria-label="Eklenecek kategori" value={categoryId}
        onChange={event=>setCategoryId(event.target.value)} className="rounded-lg border p-2 text-sm">
        <option value="">Kategori seçin</option>{categories.filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select><button type="button" disabled={busy||!categoryId} onClick={()=>void change('category_add',{categoryId})}
        className="rounded-lg bg-[#D97724] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Kategori ekle</button></div>
    </div>
    <div>
      <p className="font-semibold">Hizmet alanları</p>
      <div className="mt-2 flex flex-wrap gap-2">{areas.map(a=><span key={`${a.city_id}:${a.district_id??'all'}`}
        className="rounded-lg bg-slate-50 px-2 py-1">
        {cities.find(c=>c.id===a.city_id)?.name??'Şehir'}{a.district_id?` / ${districts.find(d=>d.id===a.district_id)?.name??'İlçe'}`:' / tüm ilçeler'}{' '}
        {button('Kaldır','area_remove',{cityId:a.city_id,districtId:a.district_id??undefined})}</span>)}</div>
      <div className="mt-2 flex flex-wrap gap-2"><select aria-label="Eklenecek şehir" value={cityId}
        onChange={event=>{setCityId(event.target.value);setDistrictId('');}} className="rounded-lg border p-2 text-sm">
        <option value="">Şehir seçin</option>{cities.filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select><select aria-label="Eklenecek ilçe" value={districtId} onChange={event=>setDistrictId(event.target.value)}
        disabled={!cityId} className="rounded-lg border p-2 text-sm"><option value="">Tüm ilçeler</option>
        {districts.filter(d=>d.is_active&&String(d.city_id)===cityId).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
      </select><button type="button" disabled={busy||!cityId}
        onClick={()=>void change('area_add',{cityId:Number(cityId),districtId:districtId?Number(districtId):undefined})}
        className="rounded-lg bg-[#D97724] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Alan ekle</button></div>
    </div>
    {documents.length>0&&<div><p className="font-semibold">Belge metadata durumu</p>{documents.map(d=><div key={d.id}
      className="mt-2 flex flex-wrap items-center gap-2"><span>{d.document_type}: {d.status}</span>
      {d.status!=='verified'&&button('Doğrula','document_verify',{documentId:d.id})}
      {d.status!=='rejected'&&button('Reddet','document_reject',{documentId:d.id})}</div>)}</div>}
    {error&&<p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
  </div>;
}
