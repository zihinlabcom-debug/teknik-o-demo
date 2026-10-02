import type {ReactNode} from 'react';
import Link from 'next/link';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export type PanelLink={href:string;label:string};

export function OperationPanelShell({area,subtitle,links,children}:{
  area:string;subtitle:string;links:readonly PanelLink[];children:ReactNode;
}){
  return <div className="min-h-screen bg-slate-50 text-[#0B1727]">
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-8" aria-label={`${area} menüsü`}>
        <Link href="/hizmetler" className="inline-flex max-w-full items-center"><TeknikOBrand size="compact"/></Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#D97724]">{area}</p>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <nav aria-label={`${area} navigasyonu`} className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {links.map(link=><Link key={link.href} href={link.href}
            className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-orange-50 hover:text-[#B75D17] lg:shrink">
            {link.label}
          </Link>)}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  </div>;
}

export function PanelSubNav({links}:{links:readonly PanelLink[]}){
  return <nav aria-label="Müşteri paneli navigasyonu" className="mb-7 flex max-w-full gap-2 overflow-x-auto pb-1">
    {links.map(link=><Link key={link.href} href={link.href}
      className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#D97724] hover:text-[#B75D17]">{link.label}</Link>)}
  </nav>;
}

export function PanelHeading({title,description}:{title:string;description:string}){
  return <header className="mb-7"><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p></header>;
}

export function PanelCard({title,children}:{title:string;children:ReactNode}){
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label={title}>
    <h2 className="text-lg font-bold">{title}</h2><div className="mt-4">{children}</div>
  </section>;
}

export function EmptyPanelState({children}:{children:ReactNode}){
  return <p role="status" className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">{children}</p>;
}

export function PanelTable({title,columns,empty}:{title:string;columns:readonly string[];empty:string}){
  return <PanelCard title={title}>
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-max text-left text-sm"><thead className="bg-slate-50"><tr>
        {columns.map(column=><th key={column} scope="col" className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">{column}</th>)}
      </tr></thead><tbody/></table>
    </div>
    <div className="mt-4"><EmptyPanelState>{empty}</EmptyPanelState></div>
  </PanelCard>;
}

export function FieldOutline({labels}:{labels:readonly string[]}){
  return <dl className="grid gap-3 sm:grid-cols-2">{labels.map(label=><div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm text-slate-600">Veri bağlantısı bekleniyor</dd>
  </div>)}</dl>;
}

export function EventTimelineEmpty(){
  return <PanelCard title="Durum zaman çizelgesi"><EmptyPanelState>Henüz olay kaydı bulunmuyor.</EmptyPanelState></PanelCard>;
}

export function RecordTypeBadge({kind}:{kind:'TEST'|'GERÇEK'}){
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${kind==='TEST'?'bg-amber-100 text-amber-900':'bg-emerald-100 text-emerald-900'}`}>{kind}</span>;
}

export function ExtraCostPlaceholder(){
  return <PanelCard title="Ek maliyet talebi">
    <p className="mb-4 text-sm text-slate-600">Bu alan veri ve iş akışı entegrasyonunu bekliyor; henüz talep gönderilemez.</p>
    <fieldset disabled className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Gerekçe<input className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3" placeholder="Gerekçe"/></label>
      <label className="text-sm font-semibold">Talep edilen fark<input className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3" placeholder="Tutar"/></label>
      <label className="text-sm font-semibold sm:col-span-2">Ek işlem açıklaması<textarea className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3" placeholder="Açıklama"/></label>
      <label className="text-sm font-semibold sm:col-span-2">Fotoğraf kanıtı<input type="file" className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-3"/></label>
    </fieldset>
  </PanelCard>;
}
