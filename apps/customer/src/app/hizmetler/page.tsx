import {CustomerMobileHeader,CustomerBottomNavigation} from '@/components/customer-mobile-chrome';
import Image from 'next/image';
import Link from 'next/link';
import {ChevronRight,Clock3,MapPin,ShieldCheck} from 'lucide-react';
import {CustomerHomeExplorer} from '@/components/customer-home-explorer';
import {ACTIVE_SERVICE_CATEGORIES} from '@/lib/service-categories';
import {getCustomerProfile} from '@/lib/profile-server';
import {customerRequestList} from '@/lib/operation-server';

export const dynamic='force-dynamic';

const unavailableCategories=new Set(['moving']);
const categoryOrder=['painting','boiler','cleaning','moving','sofa_cleaning','carpet_cleaning'] as const;
const categoryImages:Record<string,string>={
  painting:'/service-categories/painting.jpg',
  boiler:'/service-categories/boiler.jpg',
  cleaning:'/service-categories/cleaning.jpg',
  moving:'/service-categories/moving.jpg',
  sofa_cleaning:'/service-categories/sofa-extraction.jpg',
  carpet_cleaning:'/service-categories/carpet-extraction.jpg',
};
const dateFormatter=new Intl.DateTimeFormat('tr-TR',{
  timeZone:'Europe/Istanbul',
  day:'numeric',
  month:'short',
  year:'numeric',
  hour:'2-digit',
  minute:'2-digit',
});

export default async function ServiceHomePage(){
  const [profile,requests]=await Promise.all([getCustomerProfile(),customerRequestList()]);
  const firstAddress=profile.addresses[0]??null;
  const city=firstAddress?profile.cities.find(item=>item.id===firstAddress.cityId)?.name:null;
  const district=firstAddress?profile.districts.find(item=>item.id===firstAddress.districtId)?.name:null;
  const location=[city,district].filter(Boolean).join(', ')||'Konum bilgisi eklenmemiş';
  const firstName=profile.name.trim().split(/\s+/)[0]||'';
  const activeRequests=requests.filter(item=>!['completed','cancelled','technician_unavailable'].includes(item.status));
  const categories=categoryOrder.map(id=>{
    const item=ACTIVE_SERVICE_CATEGORIES.find(category=>category.id===id)!;
    return {...item,available:!unavailableCategories.has(item.id)};
  });

  return <main className="min-h-screen bg-[#E7ECF2] font-sans text-[#12213A]">
    <div className="relative mx-auto min-h-screen max-w-[430px] overflow-x-hidden bg-[#F8FAFC] pb-24 shadow-[0_0_48px_rgba(8,43,76,0.16)] sm:border-x sm:border-slate-200">
      <section className="relative isolate overflow-hidden bg-[#062A4B] px-4 pb-11 pt-4 text-white" aria-labelledby="welcome-heading">
        <Image src="/service-categories/painting.jpg" alt="" fill sizes="430px" className="-z-20 object-cover opacity-[0.16] blur-[1px]" priority/>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,rgba(3,29,52,0.98),rgba(6,42,75,0.91)_58%,rgba(6,42,75,0.62)),radial-gradient(circle_at_88%_20%,rgba(200,107,50,0.30),transparent_32%)]"/>

        <CustomerMobileHeader avatarUrl={profile.avatarUrl}/>
        <div className="mt-3.5">
          <h1 id="welcome-heading" className="text-[28px] font-extrabold leading-tight tracking-[-0.035em]">Merhaba{firstName?`, ${firstName}`:''} <span aria-hidden="true">👋</span></h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-medium text-white/85"><MapPin className="size-[18px] shrink-0 text-white" aria-hidden="true"/>{location}</p>
        </div>
      </section>

      <div className="relative z-10 -mt-6 px-3.5 sm:px-4">
        <CustomerHomeExplorer categories={categories}/>

        <section className="mt-6" aria-labelledby="featured-heading">
          <SectionHeading id="featured-heading" title="Öne Çıkan Hizmetler" href="/kategoriler"/>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <FeaturedService href="/dashboard?category=painting" image="/service-categories/painting.jpg" title="Boya Badana" description="Evinizi yenileyin, uzman ustalarla çalışın."/>
            <FeaturedService href="/dashboard?category=boiler" image="/service-categories/boiler.jpg" title="Kombi Bakım" description="Kombi ihtiyacınız için güvenli akışı başlatın."/>
          </div>
        </section>

        <section className="mt-6" aria-labelledby="requests-heading">
          <SectionHeading id="requests-heading" title="Aktif Taleplerim" href="/musteri/taleplerim"/>
          {activeRequests.length?<div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_18px_rgba(8,43,76,0.06)]">
            {activeRequests.slice(0,3).map(item=>{
              const image=typeof item.category_id==='string'?categoryImages[item.category_id]??'/service-categories/painting.jpg':'/service-categories/painting.jpg';
              const tone=statusTone(item.operation_status.code);
              return <Link key={item.id} href={`/musteri/taleplerim/${item.id}`} className="flex min-h-[74px] items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#C86B32]">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-slate-100"><Image src={image} alt="" fill sizes="48px" className="object-cover"/></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold text-[#10203A]">{item.category_name}</span><span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">{dateFormatter.format(new Date(item.created_at))}</span></span>
                <span className={`inline-flex max-w-[116px] shrink-0 items-center gap-1 truncate rounded-full px-2 py-1.5 text-[10px] font-bold ${tone}`} title={item.operation_status.label}><Clock3 className="size-3.5 shrink-0" aria-hidden="true"/><span className="truncate">{item.operation_status.label}</span></span>
                <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true"/>
              </Link>;
            })}
          </div>:<div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-5 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-xl bg-[#EAF7F0] text-[#16815D]"><ShieldCheck className="size-5" aria-hidden="true"/></span>
            <p className="mt-2.5 text-sm font-extrabold text-[#17263B]">Aktif talebiniz bulunmuyor</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Yeni bir talep için hizmet kategorilerinden başlayabilirsiniz.</p>
          </div>}
        </section>
      </div>

      <CustomerBottomNavigation/>

    </div>
  </main>;
}

function SectionHeading({id,title,href}:{id:string;title:string;href:string}){
  return <div className="flex items-center justify-between gap-3"><h2 id={id} className="text-[21px] font-extrabold tracking-[-0.025em] text-[#0A2240]">{title}</h2><Link href={href} className="inline-flex min-h-10 items-center gap-0.5 text-xs font-bold text-[#2870C4] hover:underline">Tümünü Gör <ChevronRight className="size-4" aria-hidden="true"/></Link></div>;
}

function FeaturedService({href,image,title,description}:{href:string;image:string;title:string;description:string}){
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_5px_18px_rgba(8,43,76,0.06)]">
    <div className="relative aspect-[16/9] overflow-hidden"><Image src={image} alt="" fill sizes="(max-width: 430px) 50vw, 199px" className="object-cover"/></div>
    <div className="p-3"><h3 className="truncate text-[16px] font-extrabold tracking-[-0.02em] text-[#0A2240]">{title}</h3><p className="mt-1 line-clamp-2 min-h-9 text-[11px] leading-[18px] text-slate-600">{description}</p>
      <Link href={href} className="mt-2.5 flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D47A43] to-[#B85F2A] px-2 text-[13px] font-bold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#082B4C]">Teklif Al <ChevronRight className="size-4" aria-hidden="true"/></Link>
    </div>
  </article>;
}

function statusTone(code:string){
  if(['assigned','in_progress'].includes(code))return 'bg-[#E7F6ED] text-[#16815D]';
  if(['distributing','redistributing'].includes(code))return 'bg-[#EAF2FF] text-[#2765A8]';
  if(code==='admin_review')return 'bg-[#F2ECFA] text-[#7650A8]';
  if(code==='payment_failed')return 'bg-[#FDECEF] text-[#B42332]';
  return 'bg-[#FFF5DB] text-[#8A5610]';
}
