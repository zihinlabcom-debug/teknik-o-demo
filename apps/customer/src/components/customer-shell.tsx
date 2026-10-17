'use client';

import {type ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Bell,Headphones,House,LogOut,ClipboardList,UserRound} from 'lucide-react';
import {HizmetPeyBrand} from '@/components/brand/hizmetpey-brand';

const navigation=[
  {href:'/hizmetler',label:'Ana Sayfa',icon:House},
  {href:'/musteri/taleplerim',label:'Taleplerim',icon:ClipboardList},
  {href:'/musteri/destek',label:'Destek',icon:Headphones},
  {href:'/musteri/profil',label:'Profil',icon:UserRound},
] as const;

function isCurrent(pathname:string,href:string){
  if(href==='/hizmetler')return pathname==='/hizmetler'||pathname==='/kategoriler'||pathname==='/dashboard'||pathname==='/teshis';
  if(href==='/musteri/taleplerim')return pathname.startsWith('/musteri/taleplerim')||pathname==='/musteri'||pathname==='/musteri/ek-maliyet';
  if(href==='/musteri/destek')return pathname==='/musteri/destek'||pathname==='/musteri/bildirimler'||pathname==='/musteri/sikayetler'||pathname==='/musteri/garanti'||pathname==='/iletisim';
  return pathname.startsWith(href);
}

export function CustomerShell({children}:{children:ReactNode}){
  const pathname=usePathname();

  return <div className="min-h-screen bg-[#E7ECF2] font-sans text-[#17263B] sm:px-4 sm:py-6">
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-[#F7F9FC] shadow-[0_24px_70px_rgba(8,43,76,0.18)] sm:min-h-[calc(100vh-3rem)] sm:rounded-[32px] sm:border sm:border-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#082B4C] px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] text-white shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <Link href="/hizmetler" className="inline-flex min-h-11 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="HizmetPey ana sayfa"><HizmetPeyBrand size="compact"/></Link>
          <div className="flex items-center gap-2">
            <button type="button" disabled aria-label="Bildirimler henüz kullanılamıyor" title="Bildirimler henüz kullanılamıyor" className="grid size-11 cursor-not-allowed place-items-center rounded-full border border-white/15 bg-white/10 text-white/70"><Bell className="size-5" aria-hidden="true"/></button>
            <Link href="/musteri/profil" aria-label="Profil" className="relative size-11 overflow-hidden rounded-full border-2 border-white/80 bg-slate-100 shadow-sm"><Image src="/brand/default-customer-avatar.svg" alt="" fill sizes="44px" className="object-cover"/></Link>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-white/75">Ne ödeyeceğini bil, hizmetini al.</p>
          <form action="/api/auth/logout" method="post"><button type="submit" className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[11px] font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"><LogOut className="size-3.5" aria-hidden="true"/> Çıkış</button></form>
        </div>
      </header>

      <main className="min-w-0 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[430px] grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(8,43,76,0.08)] backdrop-blur sm:rounded-b-[32px]" aria-label="Müşteri ana menüsü">
        {navigation.map(item=>{const Icon=item.icon;const current=isCurrent(pathname,item.href);return <Link key={item.href} href={item.href} aria-current={current?'page':undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition ${current?'text-[#B85F2A]':'text-slate-500 hover:bg-slate-50 hover:text-[#082B4C]'}`}><Icon className={`size-5 ${current?'fill-[#C86B32]/15':''}`} strokeWidth={current?2.6:2} aria-hidden="true"/><span className="truncate">{item.label}</span></Link>;})}
      </nav>
    </div>
  </div>;
}
