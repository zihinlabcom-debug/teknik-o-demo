import type {ReactNode} from 'react';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export function TechnicianAuthShell({eyebrow,title,description,children,wide=false}:{eyebrow:string;title:string;description:string;children:ReactNode;wide?:boolean}){
  return <main className="min-h-screen bg-[#082B4C] text-[#17263B]">
    <div className={`mx-auto min-h-screen w-full ${wide?'max-w-[560px]':'max-w-[430px]'} bg-[#F5F7FA] shadow-[0_0_42px_rgba(0,0,0,0.2)]`}>
      <header className="relative overflow-hidden bg-[#082B4C] px-5 pb-9 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <div className="absolute -right-16 -top-16 size-48 rounded-full border-[34px] border-[#C86B32]/20"/>
        <div className="relative"><TeknikOBrand size="standard" onDark/><p className="mt-8 text-[11px] font-extrabold tracking-[0.2em] text-[#F0A36D]">{eyebrow}</p><h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.04em]">{title}</h1><p className="mt-2 max-w-md text-sm leading-6 text-white/80">{description}</p></div>
      </header>
      <section className="-mt-4 rounded-t-[28px] bg-[#F5F7FA] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
        <div className="rounded-2xl border border-[#DEE5ED] bg-white p-5 shadow-[0_10px_28px_rgba(8,43,76,0.08)]">{children}</div>
      </section>
    </div>
  </main>;
}
