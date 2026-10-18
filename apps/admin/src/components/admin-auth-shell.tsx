import type {ReactNode} from 'react';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export function AdminAuthShell({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children:ReactNode}){
  return <main className="min-h-screen bg-[#EAF0F6] p-3 text-[#17263B] sm:p-6">
    <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(8,43,76,0.16)] sm:min-h-[calc(100vh-3rem)] md:grid-cols-[0.9fr_1.1fr]">
      <header className="relative overflow-hidden bg-[#082B4C] p-7 text-white sm:p-10">
        <span aria-hidden="true" className="absolute -right-20 -top-20 size-64 rounded-full border-[48px] border-[#C86B32]/25"/>
        <span aria-hidden="true" className="absolute -bottom-24 -left-20 size-72 rounded-full bg-white/5"/>
        <div className="relative flex h-full min-h-64 flex-col"><TeknikOBrand size="standard" onDark/>
          <div className="mt-auto pt-14"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#F0A36D]">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.04em]">{title}</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">{description}</p>
            <div className="mt-7 flex items-center gap-2 text-xs font-semibold text-white/60"><span className="size-2 rounded-full bg-emerald-400"/>Yetkili yönetim erişimi</div>
          </div>
        </div>
      </header>
      <section className="flex items-center p-6 sm:p-10"><div className="w-full">{children}</div></section>
    </div>
  </main>;
}
