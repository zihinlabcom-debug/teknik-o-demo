'use client';

import {useState} from 'react';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {Snowflake,PawPrint,Sprout,Wrench,Zap,Refrigerator,PanelsTopLeft,Plus,Clock3,X} from 'lucide-react';
import {CustomerShell} from '@/components/customer-shell';
import {ACTIVE_SERVICE_CATEGORIES,type ServiceCategory} from '@/lib/service-categories';
import {INACTIVE_SERVICE_CATEGORIES,type InactiveServiceCategory} from '@/lib/inactive-service-categories';

const images:Record<ServiceCategory,string>={
  boiler:'/service-categories/boiler.jpg',painting:'/service-categories/painting.jpg',cleaning:'/service-categories/cleaning.jpg',
  moving:'/service-categories/moving.jpg',sofa_cleaning:'/service-categories/sofa-extraction.jpg',carpet_cleaning:'/service-categories/carpet-extraction.jpg',
};
const inactiveIcons={climate:Snowflake,pet_care:PawPrint,garden:Sprout,plumbing:Wrench,electrical:Zap,appliances:Refrigerator,windows:PanelsTopLeft,other_services:Plus};
const plannedCategories=INACTIVE_SERVICE_CATEGORIES.filter(item=>item.group==='planned');
const unplannedCategories=INACTIVE_SERVICE_CATEGORIES.filter(item=>item.group==='unplanned');

export default function CategoriesPage(){
  const router=useRouter();
  const [upcomingSelection,setUpcomingSelection]=useState<{name:string}|null>(null);
  const openUpcoming=(item:InactiveServiceCategory|{name:string})=>setUpcomingSelection({name:item.name});
  const openActive=(id:ServiceCategory)=>{
    if(id==='cleaning'){router.push('/temizlik');return;}
    if(id==='moving'){openUpcoming({name:'Nakliye'});return;}
    try {localStorage.setItem('tekniko_service_category',id);} catch {/* Storage may be disabled. */}
    router.push(`/dashboard?category=${id}`);
  };

  return <CustomerShell>
    <header className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B85F2A]">Hizmet seçimi</p><h1 className="mt-1 text-[28px] font-bold tracking-[-0.035em] text-[#082B4C]">Hizmet kategorileri</h1><p className="mt-2 text-sm leading-6 text-slate-600">İhtiyacın olan hizmeti seç, değerlendirmeye güvenle başla.</p></header>
    <section aria-labelledby="active-heading">
      <h2 id="active-heading" className="text-lg font-bold text-[#082B4C]">Hizmete açık</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {ACTIVE_SERVICE_CATEGORIES.map(item=>{const upcoming=item.id==='moving';return <button key={item.id} type="button" onClick={()=>openActive(item.id)} className="group min-w-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white p-1.5 text-left shadow-sm transition hover:border-[#C86B32]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C86B32]">
          <span className="relative block aspect-[4/3] md:aspect-[16/9] overflow-hidden rounded-2xl bg-slate-100"><Image src={images[item.id]} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" className="object-cover transition group-hover:scale-[1.03] md:object-contain md:group-hover:scale-100"/><span className={`absolute bottom-2 left-2 rounded-full px-2 py-1 text-[9px] font-bold ${upcoming?'bg-white text-[#9A6013]':'bg-emerald-600 text-white'}`}>{upcoming?'Yakında':'Hizmete açık'}</span></span>
          <span className="block px-2 pb-2 pt-3 text-sm font-bold text-[#082B4C]">{item.label}</span>
        </button>;})}
      </div>
    </section>
    <section className="mt-8" aria-labelledby="planned-heading"><h2 id="planned-heading" className="text-lg font-bold text-[#082B4C]">Hazırlanan hizmetler</h2><p className="mt-1 text-xs leading-5 text-slate-500">Bu kategoriler için henüz talep veya fiyat oluşturulamaz.</p><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {plannedCategories.map(item=>{const Icon=inactiveIcons[item.slug];return <button key={item.slug} type="button" onClick={()=>openUpcoming(item)} className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-white p-3 text-center shadow-sm"><span className="grid size-12 place-items-center rounded-2xl bg-[#C86B32]/10 text-[#B85F2A]"><Icon className="size-6" aria-hidden="true"/></span><span className="text-sm font-bold text-[#082B4C]">{item.name}</span><span className="text-[10px] font-semibold text-slate-500">Yakında</span></button>;})}
    </div></section>
    <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-[#082B4C]">Diğer kategoriler</summary><div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">{unplannedCategories.map(item=>{const Icon=inactiveIcons[item.slug];return <button key={item.slug} type="button" onClick={()=>openUpcoming(item)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 p-3 text-center"><Icon className="size-5 text-[#B85F2A]" aria-hidden="true"/><span className="text-xs font-bold">{item.name}</span></button>;})}</div></details>
    {upcomingSelection&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#082B4C]/65 p-4"><section role="dialog" aria-modal="true" aria-labelledby="upcoming-title" className="w-full max-w-sm rounded-[26px] bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-[#9A6013]"><Clock3 className="size-6" aria-hidden="true"/></span><button type="button" onClick={()=>setUpcomingSelection(null)} aria-label="Kapat" className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-600"><X className="size-5" aria-hidden="true"/></button></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#B85F2A]">{upcomingSelection.name}</p><h2 id="upcoming-title" className="mt-1 text-2xl font-bold text-[#082B4C]">Yakında hizmetinizde</h2><p className="mt-3 text-sm leading-6 text-slate-600">Bu hizmetin yapılandırma ve fiyat altyapısı henüz doğrulanmadı. Şu anda talep alınmıyor.</p><button type="button" onClick={()=>setUpcomingSelection(null)} className="mt-5 min-h-12 w-full rounded-2xl bg-[#082B4C] px-4 text-sm font-bold text-white">Anladım</button></section></div>}
  </CustomerShell>;
}
