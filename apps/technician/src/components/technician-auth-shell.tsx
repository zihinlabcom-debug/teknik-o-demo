import Image from 'next/image';
import paintingBackground from '../../../customer/public/service-categories/painting.jpg';
import type {ReactNode} from 'react';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export function TechnicianAuthShell({eyebrow,title,description,children,wide=false,responsive=false,desktopScroll=false}:{eyebrow:string;title:string;description:string;children:ReactNode;wide?:boolean;responsive?:boolean;desktopScroll?:boolean}){
  return <main className={`min-h-screen bg-[#082B4C] text-[#17263B] ${responsive&&desktopScroll?'lg:h-dvh lg:min-h-0 lg:overflow-hidden':''}`}>
    <div className={`mx-auto min-h-screen w-full ${wide?'max-w-[560px]':'max-w-[430px]'} ${responsive?'md:max-w-none lg:grid lg:grid-cols-[0.46fr_0.54fr]':''} ${responsive&&desktopScroll?'lg:h-full lg:min-h-0 lg:grid-rows-[minmax(0,1fr)]':''} bg-[#F5F7FA] shadow-[0_0_42px_rgba(0,0,0,0.2)]`}>
      {responsive&&<aside className={`relative isolate hidden min-w-0 flex-col justify-center overflow-hidden bg-[#082B4C] px-10 py-12 text-white lg:flex xl:px-16 ${desktopScroll?'lg:h-full lg:min-h-0':'lg:min-h-dvh'}`} aria-label="HizmetPey usta tanıtımı">
        <Image src={paintingBackground} alt="" fill sizes="46vw" className="-z-20 object-cover object-center opacity-90" priority/>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(3,39,70,0.97)_0%,rgba(3,39,70,0.88)_35%,rgba(3,39,70,0.52)_75%,rgba(3,39,70,0.35)_100%)]"/>
        <div className="w-fit"><TeknikOBrand size="hero" onDark/></div>
        <p className="mt-12 text-xs font-extrabold uppercase tracking-[0.18em] text-[#F0A36D]">HizmetPey Usta</p>
        <h2 className="mt-4 max-w-xl text-[clamp(2rem,3vw,3.5rem)] font-extrabold leading-tight tracking-[-0.04em]">Ustanın hakkı, emeğin güvencesi.</h2>
        <p className="mt-6 max-w-lg text-base leading-8 text-white/90">Büyük bir özveriyle, gece gündüz demeden çalışan ustalarımızın haklarını korumayı en büyük sorumluluğumuz biliyoruz. Alın terinin ve nitelikli iş gücünün her zaman yanındayız.</p>
      </aside>}
      <header className={`relative overflow-hidden bg-[#082B4C] px-5 pb-9 pt-[max(1.25rem,env(safe-area-inset-top))] text-white ${responsive?'lg:hidden':''}`}>
        <div className="absolute -right-16 -top-16 size-48 rounded-full border-[34px] border-[#C86B32]/20"/>
        <div className="relative"><TeknikOBrand size="standard" onDark/><p className="mt-8 text-[11px] font-extrabold tracking-[0.2em] text-[#F0A36D]">{eyebrow}</p><h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.04em]">{title}</h1><p className="mt-2 max-w-md text-sm leading-6 text-white/80">{description}</p></div>
      </header>
      <section className={`-mt-4 rounded-t-[28px] bg-[#F5F7FA] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 ${responsive?'md:px-8 md:py-8 lg:mt-0 lg:flex lg:min-w-0 lg:justify-center lg:rounded-none lg:px-10 lg:py-12':''} ${responsive?(desktopScroll?'lg:h-full lg:min-h-0 lg:items-start lg:overflow-y-auto lg:overscroll-contain':'lg:min-h-dvh lg:items-center'):''}`}>
        <div className={`rounded-2xl border border-[#DEE5ED] bg-white p-5 shadow-[0_10px_28px_rgba(8,43,76,0.08)] ${responsive?'md:mx-auto md:w-full md:min-w-0 md:max-w-[520px] lg:mx-0 lg:p-8':''} ${responsive&&desktopScroll?'lg:my-auto lg:shrink-0':''}`}>
          {responsive&&<div className="mb-6 hidden lg:block"><p className="text-xs font-extrabold tracking-[0.18em] text-[#C86B32]">{eyebrow}</p><h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-[#082B4C]">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></div>}
          {children}
        </div>
      </section>
    </div>
  </main>;
}
