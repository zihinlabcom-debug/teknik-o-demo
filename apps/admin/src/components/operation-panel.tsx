import type {ReactNode} from 'react';
import Link from 'next/link';
import {AdminDashboardShell,type AdminNavLink} from '@/components/admin-dashboard-shell';

export type PanelLink=AdminNavLink;

export function OperationPanelShell({links,children,isTest}:{
  area:string;subtitle:string;links:readonly PanelLink[];children:ReactNode;isTest?:boolean;
}){
  return <AdminDashboardShell links={links} isTest={isTest}>{children}</AdminDashboardShell>;
}

export function PanelSubNav({links}:{links:readonly Omit<PanelLink,'group'>[]}){
  return <nav aria-label="Müşteri paneli navigasyonu" className="mb-7 flex max-w-full gap-2 overflow-x-auto pb-1">
    {links.map(link=><Link key={link.href} href={link.href}
      className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#C86B32] hover:text-[#A94D18]">{link.label}</Link>)}
  </nav>;
}

export function PanelHeading({title,description}:{title:string;description:string}){
  return <header className="mb-6"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#C86B32]">Yönetim / {title}</p><h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-[#082B4C] sm:text-[30px]">{title}</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#617086]">{description}</p></header>;
}

export function PanelCard({title,children}:{title:string;children:ReactNode}){
  return <section className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_28px_rgba(15,42,68,0.055)] sm:p-5" aria-label={title}>
    <div className="flex items-center gap-3"><span aria-hidden="true" className="h-6 w-1 rounded-full bg-[#C86B32]"/><h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-[#082B4C]">{title}</h2></div><div className="mt-4">{children}</div>
  </section>;
}

export function EmptyPanelState({children}:{children:ReactNode}){
  return <p role="status" className="rounded-xl border border-dashed border-[#C8D4E0] bg-[#F8FAFC] p-5 text-sm leading-6 text-[#617086]">{children}</p>;
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
