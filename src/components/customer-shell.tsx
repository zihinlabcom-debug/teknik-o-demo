'use client';

import {useEffect, type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {House, LayoutGrid, Mail} from 'lucide-react';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';
import {useCustomerSession} from '@/components/use-customer-session';

const navigation=[
  {href:'/hizmetler',label:'Ana Sayfa',icon:House},
  {href:'/kategoriler',label:'Kategoriler',icon:LayoutGrid},
  {href:'/iletisim',label:'İletişim',icon:Mail},
] as const;

export function CustomerShell({children}:{children:ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const customerStatus=useCustomerSession();
  useEffect(()=>{if(customerStatus==='guest')router.replace('/');},[customerStatus,router]);
  if(customerStatus!=='authenticated')return null;

  return <div className="min-h-screen bg-slate-50 font-sans text-[#0B1727]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-slate-200 bg-white px-3 py-7 shadow-sm md:flex lg:w-64 lg:px-5" aria-label="Ana menü">
      <Link href="/hizmetler" className="mb-12 flex justify-center lg:justify-start"><TeknikOBrand size="standard" wordmarkClassName="hidden lg:inline" /></Link>
      <nav className="space-y-2" aria-label="Bölümler">
        {navigation.map(item=>{
          const Icon=item.icon;
          return <Link key={item.href} href={item.href} aria-current={pathname===item.href?'page':undefined} title={item.label}
            className={`flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors lg:justify-start ${pathname===item.href?'bg-[#D97724]/10 text-[#D97724]':'text-slate-600 hover:bg-slate-50 hover:text-[#0B1727]'}`}>
            <Icon className="size-5 shrink-0" aria-hidden="true"/><span className="hidden lg:inline">{item.label}</span>
          </Link>;
        })}
      </nav>
      <p className="mt-auto hidden rounded-2xl bg-[#D97724]/[0.07] p-4 text-xs leading-relaxed text-slate-600 lg:block">Sürpriz yok, doğru hizmet var.</p>
    </aside>
    <div className="md:pl-20 lg:pl-64">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur md:hidden">
        <TeknikOBrand size="compact"/>
        <nav className="mt-3 flex gap-1 overflow-x-auto" aria-label="Mobil menü">
          {navigation.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href?'page':undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${pathname===item.href?'bg-[#D97724] text-white':'bg-slate-100 text-slate-600'}`}>{item.label}</Link>)}
        </nav>
      </header>
      <main className="relative mx-auto min-h-screen max-w-6xl overflow-hidden bg-white px-5 pb-12 pt-6 shadow-xl sm:px-8 md:px-10 md:pt-10 lg:px-14">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-28 size-48 rounded-full bg-[#D97724]/5"/>
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-8 size-48 rounded-full bg-[#D97724]/5"/>
        {children}
      </main>
    </div>
  </div>;
}
