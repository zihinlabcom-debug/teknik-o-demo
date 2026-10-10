import {PanelNavigation} from './panel-navigation';
import type {ReactNode} from 'react';
import Link from 'next/link';

export type PanelLink={href:string;label:string};

export function OperationPanelShell({area,subtitle,links,children,isTest}:{area:string;subtitle:string;links:readonly PanelLink[];children:ReactNode;isTest?:boolean}){
 const priority=area==='Usta paneli'?['/usta','/usta/yeni-isler','/usta/aktif-isler','/usta/garanti-duzeltmeleri']:['/admin','/admin/talepler','/admin/ustalar','/admin/sikayetler'];
 const primary=priority.map(href=>links.find(x=>x.href===href)).filter((x):x is PanelLink=>Boolean(x));
 return <PanelNavigation area={area} links={links} primary={primary} isTest={isTest}><p className="mb-5 text-sm text-[#667085]">{subtitle}</p>{children}</PanelNavigation>;
}

export function PanelSubNav({links}:{links:readonly PanelLink[]}){
  return <nav aria-label="Müşteri paneli navigasyonu" className="mb-7 flex max-w-full gap-2 overflow-x-auto pb-1">
    {links.map(link=><Link key={link.href} href={link.href}
      className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#B95236] hover:text-[#A8422B]">{link.label}</Link>)}
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
  return <p role="status" className="rounded-xl border border-dashed border-slate-300 bg-[#F8F6F3] p-5 text-sm leading-6 text-slate-600">{children}</p>;
}

export function PanelTable({title,columns,empty}:{title:string;columns:readonly string[];empty:string}){
  return <PanelCard title={title}>
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-max text-left text-sm"><thead className="bg-[#F8F6F3]"><tr>
        {columns.map(column=><th key={column} scope="col" className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold text-slate-700">{column}</th>)}
      </tr></thead><tbody/></table>
    </div>
    <div className="mt-4"><EmptyPanelState>{empty}</EmptyPanelState></div>
  </PanelCard>;
}

export function FieldOutline({labels}:{labels:readonly string[]}){
  return <dl className="grid gap-3 sm:grid-cols-2">{labels.map(label=><div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-[#F8F6F3] p-3">
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
      <label className="text-sm font-semibold">Gerekçe<input className="mt-1 block w-full rounded-xl border border-slate-300 bg-[#F8F6F3] p-3" placeholder="Gerekçe"/></label>
      <label className="text-sm font-semibold">Talep edilen fark<input className="mt-1 block w-full rounded-xl border border-slate-300 bg-[#F8F6F3] p-3" placeholder="Tutar"/></label>
      <label className="text-sm font-semibold sm:col-span-2">Ek işlem açıklaması<textarea className="mt-1 block w-full rounded-xl border border-slate-300 bg-[#F8F6F3] p-3" placeholder="Açıklama"/></label>
      <label className="text-sm font-semibold sm:col-span-2">Fotoğraf kanıtı<input type="file" className="mt-1 block w-full rounded-xl border border-slate-300 bg-[#F8F6F3] p-3"/></label>
    </fieldset>
  </PanelCard>;
}
