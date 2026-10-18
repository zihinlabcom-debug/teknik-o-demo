'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export type AdminNavLink={href:string;label:string;group:string};

type IconName='dashboard'|'requests'|'customers'|'technicians'|'finance'|'support'|'warranty'|'chart'|'categories'|'settings'|'pool'|'people'|'menu'|'close'|'collapse'|'logout'|'shield';

function Icon({name,className='size-5'}:{name:IconName;className?:string}){
  const common={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...common}>
    {name==='dashboard'&&<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>}
    {name==='requests'&&<><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></>}
    {name==='customers'&&<><circle cx="12" cy="8" r="3"/><path d="M5 20a7 7 0 0 1 14 0"/></>}
    {name==='technicians'&&<><path d="m14 6 4-3 3 3-3 4"/><path d="m16 8-9 9-3 3-1-1 3-3 9-9"/><path d="M13 3a5 5 0 0 0 6 6"/></>}
    {name==='finance'&&<><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.5-1.6-.8-2.6-.8-1.5 0-2.7.8-2.7 2s1.1 1.8 2.7 2.2 2.8.9 2.8 2.3-1.2 2.1-2.9 2.1c-1.1 0-2.2-.3-3-.9M12 5.5v13"/></>}
    {name==='support'&&<><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v-6H4ZM20 13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-6h2"/></>}
    {name==='warranty'&&<><path d="m12 3 7 3v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z"/><path d="m9 12 2 2 4-5"/></>}
    {name==='chart'&&<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>}
    {name==='categories'&&<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M17.5 14v7M14 17.5h7"/></>}
    {name==='settings'&&<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>}
    {name==='pool'&&<><path d="M4 5h16v14H4z"/><path d="M4 9h16M8 13h3M8 16h6"/></>}
    {name==='people'&&<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20a6 6 0 0 1 12 0M15 15a5 5 0 0 1 6 5"/></>}
    {name==='menu'&&<path d="M4 7h16M4 12h16M4 17h16"/>}
    {name==='close'&&<path d="m6 6 12 12M18 6 6 18"/>}
    {name==='collapse'&&<path d="m14 6-6 6 6 6"/>}
    {name==='logout'&&<><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></>}
    {name==='shield'&&<><path d="m12 3 7 3v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></>}
  </svg>;
}

function iconFor(href:string):IconName{
  if(href==='/admin')return 'dashboard';
  if(href.includes('musteriler'))return 'customers';
  if(href.includes('ustalar'))return 'technicians';
  if(href.includes('ek-maliyet'))return 'finance';
  if(href.includes('sikayetler'))return 'support';
  if(href.includes('garanti'))return 'warranty';
  if(href.includes('pilot-kpi'))return 'chart';
  if(href.includes('kategoriler'))return 'categories';
  if(href.includes('ayarlar'))return 'settings';
  if(href.includes('ik-havuzu'))return 'people';
  if(href.includes('talep-havuzu'))return 'pool';
  return 'requests';
}

function isActive(path:string,href:string){return href==='/admin'?path==='/admin':path===href||path.startsWith(`${href}/`);}

export function AdminDashboardShell({links,children,isTest}:{links:readonly AdminNavLink[];children:ReactNode;isTest?:boolean}){
  const path=usePathname();
  const [mobileOpen,setMobileOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const active=links.find(link=>isActive(path,link.href));
  const groups=[...new Set(links.map(link=>link.group))];

  const sidebar=<aside className={`flex h-full flex-col bg-[#082B4C] text-white transition-[width] duration-200 ${collapsed?'lg:w-20':'lg:w-72'}`} aria-label="Yönetim paneli menüsü">
    <div className="flex min-h-20 items-center justify-between gap-2 border-b border-white/10 px-4">
      <Link href="/admin" onClick={()=>setMobileOpen(false)} className="min-w-0"><TeknikOBrand size="compact" onDark showWordmark={!collapsed}/></Link>
      <button type="button" onClick={()=>setMobileOpen(false)} aria-label="Menüyü kapat" className="grid size-10 place-items-center rounded-xl text-white/80 hover:bg-white/10 lg:hidden"><Icon name="close"/></button>
    </div>
    <div className="flex-1 overflow-y-auto px-3 py-5">
      {!collapsed&&<div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F0A36D]">Yönetim alanı</p><p className="mt-1 text-xs leading-5 text-white/65">Yetkili operasyon ve hesap yönetimi</p></div>}
      <nav className="space-y-5">
        {groups.map(group=><div key={group}>
          {!collapsed&&<p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{group}</p>}
          <div className="space-y-1">{links.filter(link=>link.group===group).map(link=>{
            const selected=isActive(path,link.href);
            return <Link key={link.href} href={link.href} onClick={()=>setMobileOpen(false)} title={collapsed?link.label:undefined} aria-current={selected?'page':undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${selected?'bg-[#C86B32] text-white shadow-[0_8px_18px_rgba(200,107,50,0.25)]':'text-white/72 hover:bg-white/8 hover:text-white'} ${collapsed?'justify-center':''}`}>
              <Icon name={iconFor(link.href)} className="size-5 shrink-0"/>{!collapsed&&<span>{link.label}</span>}
            </Link>;
          })}</div>
        </div>)}
      </nav>
    </div>
    <div className="border-t border-white/10 p-3">
      <form action="/api/auth/logout" method="post"><button type="submit" title={collapsed?'Çıkış Yap':undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white ${collapsed?'justify-center':''}`}><Icon name="logout"/>{!collapsed&&'Çıkış Yap'}</button></form>
      <button type="button" onClick={()=>setCollapsed(value=>!value)} aria-label={collapsed?'Menüyü genişlet':'Menüyü daralt'} className={`mt-1 hidden min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/55 hover:bg-white/10 hover:text-white lg:flex ${collapsed?'justify-center':''}`}><Icon name="collapse" className={`size-5 transition-transform ${collapsed?'rotate-180':''}`}/>{!collapsed&&'Menüyü daralt'}</button>
    </div>
  </aside>;

  return <div className="admin-shell min-h-screen bg-[#F4F7FB] text-[#17263B] lg:flex">
    {mobileOpen&&<button type="button" aria-label="Menüyü kapat" onClick={()=>setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"/>}
    <div className={`fixed inset-y-0 left-0 z-50 w-[min(82vw,18rem)] transition-transform duration-200 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-auto lg:shrink-0 lg:translate-x-0 ${mobileOpen?'translate-x-0':'-translate-x-full'}`}>{sidebar}</div>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 flex min-h-18 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={()=>setMobileOpen(true)} aria-label="Yönetim menüsünü aç" className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#DCE4ED] text-[#082B4C] lg:hidden"><Icon name="menu"/></button>
          <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#C86B32]">HizmetPey Admin</p><p className="truncate text-sm font-extrabold text-[#082B4C] sm:text-base">{active?.label??'Yönetim paneli'}</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof isTest==='boolean'&&<span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:inline-flex ${isTest?'bg-amber-100 text-amber-800':'bg-emerald-100 text-emerald-800'}`}>{isTest?'TEST':'GERÇEK'}</span>}
          <div className="grid size-10 place-items-center rounded-full bg-[#EAF0F6] text-[#082B4C]" aria-label="Yetkili yönetici"><Icon name="shield"/></div>
        </div>
      </header>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8"><div className="mx-auto w-full max-w-[1440px]">{children}</div></main>
    </div>
  </div>;
}
