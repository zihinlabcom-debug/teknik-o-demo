'use client';

import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';
import {ACTIVE_SERVICE_CATEGORIES,type ServiceCategory} from '@/lib/service-categories';

const images={
  boiler:'/service-categories/boiler.jpg',
  painting:'/service-categories/painting.jpg',
  cleaning:'/service-categories/cleaning.jpg',
  moving:'/service-categories/moving.jpg',
  sofa_cleaning:'/service-categories/sofa-extraction.jpg',
  carpet_cleaning:'/service-categories/carpet-extraction.jpg',
};
const categories=ACTIVE_SERVICE_CATEGORIES.map(category=>({
  id:category.id,name:category.label,image:images[category.id],
}));

export default function LandingPage(){
  const [selectedCategory,setSelectedCategory]=useState<ServiceCategory|null>(null);

  return <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white px-6 py-8 font-sans text-[#111827] shadow-xl">
    <header className="mt-2 flex flex-col items-center text-center">
      <h1><TeknikOBrand size="hero" /></h1>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Teknik hizmetin akıllı platformu</p>
    </header>

    <section className="mt-10 text-center" aria-label="Teknik-O hakkında">
      <h2 className="mx-auto max-w-sm text-[2rem] font-black leading-[1.12] tracking-tight sm:text-[2.35rem]">
        Ev hizmetlerinin <span className="text-[#A8422B]">maliyetini</span> öğrenin.
      </h2>
      <p className="mx-auto mt-4 max-w-sm text-[0.95rem] font-medium leading-6 text-slate-700">
        İhtiyacınız olan hizmeti seçin, maliyetini hemen öğrenin ve güvenle hizmet alın.
      </p>
    </section>

    <section className="mt-9" aria-label="Hizmet kategorileri">
      <div className="grid grid-cols-3 gap-3">
        {categories.map(category=><button key={category.id} type="button"
          aria-pressed={selectedCategory===category.id}
          onClick={()=>setSelectedCategory(category.id)}
          className={`flex min-w-0 flex-col items-center rounded-2xl border bg-white p-2 pb-3 text-center shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95236] ${selectedCategory===category.id?'border-[#B95236] ring-2 ring-[#B95236]':'border-slate-100'}`}>
          <span className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
            <Image src={category.image} alt={`${category.name} hizmeti`} fill sizes="(max-width: 448px) 30vw, 130px" className="object-cover" />
          </span>
          <span className="flex min-h-8 items-center text-xs font-bold leading-tight">{category.name}</span>
        </button>)}
      </div>
    </section>

    <nav aria-label="Hesap işlemleri" className="mt-auto grid grid-cols-2 gap-3 pt-10">
      <Link href="/kayit" className="flex min-h-12 items-center justify-center rounded-2xl bg-[#B95236] px-3 py-3 text-center text-sm font-bold text-white shadow-md transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95236]">
        Kayıt Ol
      </Link>
      <Link href="/giris" className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-[#B95236] bg-white px-3 py-3 text-center text-sm font-bold text-[#A64D12] transition hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95236]">
        Giriş Yap
      </Link>
    </nav>
  </main>;
}
