'use client';

import {useState} from 'react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {Snowflake, PawPrint, Sprout, Wrench, Zap, Refrigerator, PanelsTopLeft, Plus} from 'lucide-react';
import {CustomerShell} from '@/components/customer-shell';
import {ACTIVE_SERVICE_CATEGORIES,type ServiceCategory} from '@/lib/service-categories';
import {INACTIVE_SERVICE_CATEGORIES,type InactiveServiceCategory} from '@/lib/inactive-service-categories';
import {supabase} from '@/lib/supabaseClient';

const images:Record<ServiceCategory,string>={
  boiler:'/service-categories/boiler.jpg',painting:'/service-categories/painting.jpg',
  cleaning:'/service-categories/cleaning.jpg',moving:'/service-categories/moving.jpg',
  sofa_cleaning:'/service-categories/sofa-extraction.jpg',carpet_cleaning:'/service-categories/carpet-extraction.jpg',
};
const inactiveIcons={
  climate:Snowflake,pet_care:PawPrint,garden:Sprout,plumbing:Wrench,
  electrical:Zap,appliances:Refrigerator,windows:PanelsTopLeft,other_services:Plus,
};
const plannedCategories=INACTIVE_SERVICE_CATEGORIES.filter(item=>item.group==='planned');
const unplannedCategories=INACTIVE_SERVICE_CATEGORIES.filter(item=>item.group==='unplanned');

export default function CategoriesPage(){
  const router=useRouter();
  const [upcomingSelection,setUpcomingSelection]=useState<InactiveServiceCategory|null>(null);
  const [requestError,setRequestError]=useState<string|null>(null);
  const [requestNote,setRequestNote]=useState('');
  const [submitting,setSubmitting]=useState(false);
  const [requestSuccess,setRequestSuccess]=useState(false);

  const openUpcoming=(item:InactiveServiceCategory)=>{
    setUpcomingSelection(item);setRequestError(null);setRequestNote('');setRequestSuccess(false);
  };
  const submitDemand=async()=>{
    if(!upcomingSelection||submitting)return;
    setSubmitting(true);setRequestError(null);
    try{
      const {data,error}=await supabase.auth.getSession();
      if(error||!data.session?.access_token){
        setRequestError('Talep kaydı için doğrulanmış kullanıcı oturumu gerekli. Mevcut kayıt akışı henüz bunu sağlamıyor.');
        return;
      }
      const response=await fetch('/api/category-demand',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},
        body:JSON.stringify({categorySlug:upcomingSelection.slug,requestNote}),
      });
      if(!response.ok){setRequestError('Talep kaydı şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.');return;}
      setUpcomingSelection(null);setRequestSuccess(true);
    }catch{setRequestError('Talep hizmetine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.');}
    finally{setSubmitting(false);}
  };
  const openActive=(id:ServiceCategory)=>{
    try {localStorage.setItem('tekniko_service_category',id);} catch {/* Storage may be disabled. */}
    router.push(`/dashboard?category=${id}`);
  };

  return <CustomerShell>
    <div className="relative mb-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D97724]">Hizmetler</p><h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Kategoriler</h1><p className="mt-2 text-sm text-slate-600">İhtiyacın olan hizmeti seç.</p>{requestSuccess&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Talebiniz alındı</p>}</div>
    <section className="relative" aria-labelledby="planned-heading">
      <h2 id="planned-heading" className="text-xl font-black tracking-tight md:text-2xl">Planlanan kategoriler</h2>
      <p className="mt-1 text-sm text-slate-600">Hizmete açık kategorilerden hemen başlayabilir, diğerleri için hazırlıklarımızı takip edebilirsin.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-5">
        {ACTIVE_SERVICE_CATEGORIES.map(item=><button key={item.id} type="button" onClick={()=>openActive(item.id)}
          className="group flex min-w-0 flex-col items-center rounded-[1.3rem] border border-slate-100 bg-white p-1.5 pb-3 text-center shadow-[0_8px_25px_rgba(15,23,42,0.07)] transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97724]">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 md:aspect-[4/3]"><Image src={images[item.id]} alt={`${item.label} hizmeti`} fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 300px" className="object-cover transition-transform duration-300 group-hover:scale-105"/></div>
          <span className="mt-2.5 font-bold text-[#0B1727]">{item.label}</span><span className="mt-1 text-[11px] font-semibold text-emerald-700">Hizmete açık</span>
        </button>)}
        {plannedCategories.map(item=>{
          const Icon=inactiveIcons[item.slug];
          return <button key={item.slug} type="button" onClick={()=>openUpcoming(item)} className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-[1.3rem] border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97724]">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#D97724]/10 text-[#D97724]"><Icon className="size-7" aria-hidden="true"/></span><span className="font-bold text-[#0B1727]">{item.name}</span><span className="text-[11px] font-semibold text-slate-500">Yakında</span>
          </button>;
        })}
      </div>
    </section>
    <section className="relative mt-12" aria-labelledby="unplanned-heading">
      <h2 id="unplanned-heading" className="text-xl font-black tracking-tight md:text-2xl">Henüz planlanmamış diğer kategoriler</h2>
      <p className="mt-1 text-sm text-slate-600">Aradığın hizmet bu listede değilse diğer hizmetleri seçebilirsin.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {unplannedCategories.map(item=>{const Icon=inactiveIcons[item.slug];return <button key={item.slug} type="button" onClick={()=>openUpcoming(item)} className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-[1.3rem] border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97724]"><span className="flex size-14 items-center justify-center rounded-2xl bg-[#D97724]/10 text-[#D97724]"><Icon className="size-7" aria-hidden="true"/></span><span className="font-bold">{item.name}</span></button>})}
      </div>
    </section>
    {upcomingSelection&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1727]/55 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="upcoming-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] bg-white p-4 shadow-2xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D97724]">{upcomingSelection.name}</p>
        <h2 id="upcoming-title" className="mt-2 text-2xl font-black">Yakında hizmetinizdeyiz</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{upcomingSelection.name} için hizmet altyapımız hazırlanıyor.</p>
        <label htmlFor="demand-note" className="mt-4 block text-sm font-semibold">Ek isteğiniz (isteğe bağlı)</label>
        <textarea id="demand-note" value={requestNote} onChange={event=>setRequestNote(event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full resize-none rounded-xl border border-slate-300 p-3 text-sm focus:border-[#D97724] focus:outline-none"/>
        {requestError&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{requestError}</p>}
        <div className="mt-6 flex flex-col gap-3 min-[380px]:flex-row"><button type="button" disabled={submitting} onClick={()=>void submitDemand()} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{submitting?'Gönderiliyor…':'Talep Topla'}</button><button type="button" disabled={submitting} onClick={()=>setUpcomingSelection(null)} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">Kapat</button></div>
      </section>
    </div>}
  </CustomerShell>;
}
