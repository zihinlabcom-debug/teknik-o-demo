import type {ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {BadgeCheck,Clock3,ShieldCheck} from 'lucide-react';

const trustItems=[
  {label:'Güvenilir ustalar',icon:ShieldCheck},
  {label:'Hızlı teklifler',icon:Clock3},
  {label:'Kolay yönetim',icon:BadgeCheck},
] as const;

export function AuthVisualShell({title,description,children,wide=false}:{
  title:string;
  description:string;
  children:ReactNode;
  wide?:boolean;
}){
  return <main className="min-h-screen bg-[#E7ECF2] px-3 py-3 text-[#17263B] sm:px-5 sm:py-6">
    <div className={`mx-auto overflow-hidden rounded-[28px] border border-slate-200 bg-[#F8FAFC] shadow-[0_24px_70px_rgba(8,43,76,0.16)] ${wide?'max-w-[1080px]':'max-w-[940px]'}`}>
      <div className={`grid ${wide?'lg:grid-cols-[0.74fr_1.26fr]':'lg:grid-cols-[0.9fr_1.1fr]'}`}>
        <section className="relative isolate min-h-[330px] overflow-hidden bg-[#062A4B] px-5 py-6 text-white sm:px-8 sm:py-8 lg:min-h-[720px] lg:px-10 lg:py-10" aria-label="HizmetPey tanıtımı">
          <Image src="/service-categories/painting.jpg" alt="" fill sizes="(max-width: 1023px) 100vw, 430px" className="-z-20 object-cover opacity-40" priority/>
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(145deg,rgba(3,29,52,0.98)_0%,rgba(6,42,75,0.90)_55%,rgba(6,42,75,0.70)_100%),radial-gradient(circle_at_85%_15%,rgba(200,107,50,0.36),transparent_34%)]"/>
          <Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="HizmetPey ana sayfasına dön">
            <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm" aria-hidden="true"><Image src="/brand/hizmetpey-resmi.png" alt="" width={92} height={92} className="absolute left-[-24px] top-[-17px] size-[92px] max-w-none" priority/></span>
            <span className="text-[25px] font-extrabold tracking-[-0.045em] text-white">Hizmet<span className="text-[#E38245]">Pey</span></span>
          </Link>

          <div className="mt-9 max-w-[360px] sm:mt-12 lg:mt-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F0A270]">Hizmette netlik</p>
            <p className="mt-3 text-[30px] font-bold leading-[1.08] tracking-[-0.035em] sm:text-[34px]">Sürprizlere değil,<br/>hizmete yer var.</p>
            <p className="mt-4 max-w-[310px] text-[15px] font-medium leading-6 text-white/[0.88] sm:text-base">Ne ödeyeceğini bil, hizmetini al.</p>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2 lg:mt-12 lg:grid-cols-1 lg:gap-3" aria-label="HizmetPey avantajları">
            {trustItems.map(({label,icon:Icon})=><div key={label} className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.09] px-2 py-2.5 text-center backdrop-blur-sm lg:flex-row lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3 lg:text-left">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#C86B32] text-white lg:size-10 lg:rounded-xl"><Icon className="size-4 lg:size-5" aria-hidden="true"/></span>
              <span className="text-[10px] font-semibold leading-tight text-white/[0.92] sm:text-[11px] lg:text-sm">{label}</span>
            </div>)}
          </div>
        </section>
        <section className="bg-[#F8FAFC] px-5 py-7 sm:px-9 sm:py-10 lg:px-11 lg:py-12" aria-labelledby="auth-title">
          <div className="mx-auto max-w-xl">
            <Link href="/" className="mb-6 inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#C86B32]/40 hover:text-[#082B4C]">← Ana sayfaya dön</Link>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B85F2A]">{wide?'Müşteri kaydı':'Müşteri girişi'}</p>
            <h1 id="auth-title" className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.035em] text-[#082B4C] sm:text-[38px]">{title}</h1>
            <p className="mt-3 max-w-lg text-[15px] leading-6 text-slate-600">{description}</p>
            <div className="mt-7">{children}</div>
          </div>
        </section>
      </div>
    </div>
  </main>;
}
