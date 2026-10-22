import type {ReactNode} from 'react';
import Link from 'next/link';
import {TechnicianBottomNavigation,TechnicianDesktopNavigation,TechnicianMobileHeader} from '@/components/technician-mobile-chrome';
import {TechnicianPageHero} from '@/components/technician-ui';

export type PanelLink={href:string;label:string};

export function OperationPanelShell({children,isTest=false}:{children:ReactNode;isTest?:boolean}){
  return <div className="min-h-screen bg-[#EAF0F6] text-[#17263B]">
    <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden md:max-w-none lg:pl-64 bg-[#F5F7FA] shadow-[0_0_42px_rgba(8,43,76,0.12)]">
      <TechnicianDesktopNavigation/>
      <TechnicianMobileHeader isTest={isTest}/>
      <main className="min-w-0 px-3 pb-28 pt-4 sm:px-4 md:px-6 md:pt-6 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-8 lg:pb-8 lg:pt-8">{children}</main>
      <TechnicianBottomNavigation/>
    </div>
  </div>;
}

export function PanelSubNav({links}:{links:readonly PanelLink[]}){
  return <nav aria-label="Bölüm navigasyonu" className="mb-5 flex max-w-full gap-2 overflow-x-auto pb-1">
    {links.map(link=><Link key={link.href} href={link.href} className="shrink-0 rounded-full border border-[#D8E1EB] bg-white px-4 py-2.5 text-xs font-bold text-[#52627A] shadow-sm transition hover:border-[#C86B32] hover:text-[#A94D18]">{link.label}</Link>)}
  </nav>;
}

export function PanelHeading({title,description}:{title:string;description:string}){
  return <TechnicianPageHero title={title} description={description}/>;
}

export function PanelCard({title,children,headerAction}:{title:string;children:ReactNode;headerAction?:ReactNode}){
  return <section className="mb-4 min-w-0 rounded-2xl border border-[#DEE5ED] bg-white p-4 shadow-[0_8px_24px_rgba(8,43,76,0.06)]" aria-label={title}>
    <div className="flex items-start justify-between gap-3">
      <h2 className="min-w-0 text-[18px] font-extrabold tracking-[-0.02em] text-[#082B4C]">{title}</h2>
      {headerAction}
    </div>
    <div className="mt-4">{children}</div>
  </section>;
}

export function EmptyPanelState({children}:{children:ReactNode}){
  return <p role="status" className="rounded-xl border border-dashed border-[#C7D3DF] bg-[#F7F9FC] p-4 text-sm leading-6 text-[#607089]">{children}</p>;
}

export function PanelTable({title,columns,empty}:{title:string;columns:readonly string[];empty:string}){
  return <PanelCard title={title}><div className="max-w-full overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-max text-left text-sm"><thead className="bg-slate-50"><tr>{columns.map(column=><th key={column} scope="col" className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">{column}</th>)}</tr></thead><tbody/></table></div><div className="mt-4"><EmptyPanelState>{empty}</EmptyPanelState></div></PanelCard>;
}

export function FieldOutline({labels}:{labels:readonly string[]}){
  return <dl className="grid gap-3 sm:grid-cols-2">{labels.map(label=><div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-600">Veri bağlantısı bekleniyor</dd></div>)}</dl>;
}

export function EventTimelineEmpty(){return <PanelCard title="Durum zaman çizelgesi"><EmptyPanelState>Henüz olay kaydı bulunmuyor.</EmptyPanelState></PanelCard>;}

export function RecordTypeBadge({kind}:{kind:'TEST'|'GERÇEK'}){return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${kind==='TEST'?'bg-amber-100 text-amber-900':'bg-emerald-100 text-emerald-900'}`}>{kind}</span>;}

export function ExtraCostPlaceholder(){return <PanelCard title="Ek maliyet talebi"><p className="mb-4 text-sm text-slate-600">Bu alan veri ve iş akışı entegrasyonunu bekliyor; henüz talep gönderilemez.</p><fieldset disabled className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Gerekçe<input className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3" placeholder="Gerekçe"/></label><label className="text-sm font-semibold">Talep edilen fark<input className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3" placeholder="Tutar"/></label><label className="text-sm font-semibold sm:col-span-2">Ek işlem açıklaması<textarea className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3" placeholder="Açıklama"/></label><label className="text-sm font-semibold sm:col-span-2">Fotoğraf kanıtı<input type="file" className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3"/></label></fieldset></PanelCard>;}
