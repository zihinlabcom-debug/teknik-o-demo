'use client';

import {type PointerEvent,useRef,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight,ChevronRight,Flame,Paintbrush,RectangleHorizontal,Search,Sofa,Sparkles,Truck} from 'lucide-react';
import type {ServiceCategory} from '@/lib/service-categories';

type CategoryCard={
  id:ServiceCategory;
  label:string;
  available:boolean;
};

const icons={
  boiler:Flame,
  painting:Paintbrush,
  cleaning:Sparkles,
  moving:Truck,
  sofa_cleaning:Sofa,
  carpet_cleaning:RectangleHorizontal,
} as const;

const categoryStyles={
  boiler:'bg-gradient-to-br from-[#E9A477] to-[#B85F2A] text-white',
  painting:'bg-gradient-to-br from-[#EAA77C] to-[#C86B32] text-white',
  cleaning:'bg-gradient-to-br from-[#65C89D] to-[#24966D] text-white',
  moving:'bg-gradient-to-br from-[#72B8FF] to-[#397DCC] text-white',
  sofa_cleaning:'bg-gradient-to-br from-[#F7B75A] to-[#E88E25] text-white',
  carpet_cleaning:'bg-gradient-to-br from-[#61AEFF] to-[#246DBB] text-white',
} as const;

const bannerSlides=[
  {
    id:'painting',
    image:'/service-categories/painting.jpg',
    imageAlt:'Boya hizmeti',
    title:'Hızlı fiyat al',
    description:'Boya, kombi, temizlik ve daha fazlası.',
    href:'/kategoriler',
  },
  {
    id:'boiler',
    image:'/service-categories/boiler.jpg',
    imageAlt:'Kombi bakım hizmeti',
    title:'Kombi bakımını planla',
    description:'Bakım ihtiyacınız için güvenli akışı başlatın.',
    href:'/dashboard?category=boiler',
  },
  {
    id:'cleaning',
    image:'/service-categories/cleaning.jpg',
    imageAlt:'Ev temizliği hizmeti',
    title:'Temizlik için teklif al',
    description:'Eviniz için uygun hizmet akışını kolayca oluşturun.',
    href:'/dashboard?category=cleaning',
  },
] as const;

export function CustomerHomeExplorer({categories}:{categories:readonly CategoryCard[]}){
  const [query,setQuery]=useState('');
  const [activeSlide,setActiveSlide]=useState(0);
  const pointerStart=useRef<number|null>(null);
  const suppressClick=useRef(false);
  const normalized=query.trim().toLocaleLowerCase('tr-TR');
  const filtered=normalized?categories.filter(item=>item.label.toLocaleLowerCase('tr-TR').includes(normalized)):categories;

  function handlePointerDown(event:PointerEvent<HTMLElement>){
    pointerStart.current=event.clientX;
    suppressClick.current=false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event:PointerEvent<HTMLElement>){
    if(pointerStart.current===null)return;
    const distance=event.clientX-pointerStart.current;
    pointerStart.current=null;
    if(Math.abs(distance)<40)return;
    suppressClick.current=true;
    setActiveSlide(current=>(current+(distance<0?1:-1)+bannerSlides.length)%bannerSlides.length);
  }

  return <>
    <label className="relative block">
      <span className="sr-only">Hizmet ara</span>
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-[#718096]" aria-hidden="true"/>
      <input
        type="search"
        value={query}
        onChange={event=>setQuery(event.target.value)}
        placeholder="Hangi hizmete ihtiyacın var?"
        className="h-[54px] w-full rounded-[14px] border border-white/90 bg-white pl-12 pr-4 text-[15px] text-[#17263B] shadow-[0_8px_24px_rgba(8,43,76,0.16)] outline-none transition placeholder:text-[#8290A3] focus-visible:ring-4 focus-visible:ring-[#C86B32]/30"
      />
    </label>

    <section
      className="relative mt-3 h-[178px] touch-pan-y overflow-hidden rounded-[22px] bg-[#0A2945] text-white shadow-[0_8px_24px_rgba(8,43,76,0.14)]"
      aria-label="Öne çıkan hizmetler"
      aria-roledescription="carousel"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={()=>{pointerStart.current=null;suppressClick.current=false;}}
      onClickCapture={event=>{
        if(!suppressClick.current)return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current=false;
      }}
      onDragStart={event=>event.preventDefault()}
    >
      {bannerSlides.map((slide,index)=>{
        const isActive=index===activeSlide;
        return <article
          key={slide.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index+1} / ${bannerSlides.length}`}
          aria-hidden={isActive?undefined:true}
          className={`absolute inset-0 transition-[transform,opacity] duration-500 ease-out ${isActive?'opacity-100':'pointer-events-none opacity-0'}`}
          style={{transform:`translateX(${(index-activeSlide)*100}%)`}}
        >
          <Image src={slide.image} alt={slide.imageAlt} fill sizes="(max-width: 430px) calc(100vw - 28px), 402px" className="object-cover" priority={index===0}/>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,24,39,0.96)_0%,rgba(7,24,39,0.80)_50%,rgba(7,24,39,0.14)_100%)]"/>
          <div className="relative flex h-full max-w-[74%] flex-col justify-center px-5 pb-4 max-[340px]:max-w-[82%] max-[340px]:px-4">
            <h2 className="text-[23px] font-bold leading-[1.06] tracking-[-0.025em] max-[340px]:text-[21px]">{slide.title}</h2>
            <p className="mt-2 text-[12px] font-normal leading-[17px] text-white/90">{slide.description}</p>
            <Link href={slide.href} tabIndex={isActive?undefined:-1} className="mt-3 inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-[#CF7843] to-[#B86432] px-4 text-[13px] font-semibold text-white shadow-md transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Hemen Talep Oluştur <ArrowRight className="size-4" aria-hidden="true"/></Link>
          </div>
        </article>;
      })}
      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center" aria-label="Banner seçimi">
        {bannerSlides.map((slide,index)=><button key={slide.id} type="button" onClick={()=>setActiveSlide(index)} aria-label={`${index+1}. bannerı göster`} aria-pressed={index===activeSlide} className="grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"><span className={`h-1.5 rounded-full bg-white transition-[width,opacity] ${index===activeSlide?'w-5 opacity-100':'w-1.5 opacity-60'}`}/></button>)}
      </div>
    </section>

    <section className="mt-6" aria-labelledby="categories-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="categories-heading" className="text-[21px] font-extrabold tracking-[-0.025em] text-[#0A2240]">Hizmet Kategorileri</h2>
        <Link href="/kategoriler" className="inline-flex min-h-10 items-center gap-0.5 text-xs font-bold text-[#2870C4] hover:underline">Tümünü Gör <ChevronRight className="size-4" aria-hidden="true"/></Link>
      </div>

      {filtered.length?<div className="mt-3 grid grid-cols-3 gap-2 max-[340px]:grid-cols-2">
        {filtered.map(item=>{
          const Icon=icons[item.id];
          const content=<>
            <span className={`grid size-[34px] shrink-0 place-items-center rounded-[11px] shadow-sm sm:size-10 ${categoryStyles[item.id]}`}><Icon className="size-[18px] sm:size-5" strokeWidth={2.4} aria-hidden="true"/></span>
            <span className="min-w-0 flex-1 text-left"><span className="block text-[10px] font-extrabold leading-[13px] text-[#10203A] sm:text-xs">{item.label}</span>{item.available?null:<span className="mt-0.5 block text-[9px] font-bold text-[#9A6013]">Yakında</span>}</span>
            {item.available?<ChevronRight className="size-3 shrink-0 text-slate-400 sm:size-3.5" aria-hidden="true"/>:null}
          </>;
          return item.available?<Link key={item.id} href={`/dashboard?category=${item.id}`} className="flex min-h-[68px] items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_4px_14px_rgba(8,43,76,0.05)] transition hover:border-[#C86B32]/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C86B32] sm:min-h-[72px] sm:gap-1.5 sm:p-2">{content}</Link>:
            <div key={item.id} aria-label={`${item.label} yakında`} className="flex min-h-[68px] items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 opacity-80 sm:min-h-[72px] sm:gap-1.5 sm:p-2">{content}</div>;
        })}
      </div>:<p role="status" className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">Aramanızla eşleşen hizmet bulunamadı.</p>}
    </section>
  </>;
}
