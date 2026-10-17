'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

type IconName='home'|'briefcase'|'activity'|'support'|'profile'|'bell'|'back';

function OutlineIcon({name,className='size-6'}:{name:IconName;className?:string}){
  const common={fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...common}>
    {name==='home'&&<><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>}
    {name==='briefcase'&&<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>}
    {name==='activity'&&<><path d="M4 19V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11"/><path d="M8 6V4h8v2M3 19h18M8 11h8M8 15h5"/></>}
    {name==='support'&&<><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v-6H4ZM20 13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-6h2ZM18 19c0 1.1-.9 2-2 2h-3"/></>}
    {name==='profile'&&<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>}
    {name==='bell'&&<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>}
    {name==='back'&&<path d="m15 18-6-6 6-6"/>}
  </svg>;
}

const tabs=[
  {href:'/usta',label:'Ana Sayfa',icon:'home' as const},
  {href:'/usta/yeni-isler',label:'Yeni İşler',icon:'briefcase' as const},
  {href:'/usta/aktif-isler',label:'Aktif İşler',icon:'activity' as const},
  {href:'/usta/destek',label:'Destek',icon:'support' as const},
  {href:'/usta/profil',label:'Profil',icon:'profile' as const},
];

function activeIndex(path:string){
  if(path==='/usta')return 0;
  if(path.startsWith('/usta/yeni-isler'))return 1;
  if(path.startsWith('/usta/aktif-isler')||path.startsWith('/usta/is/'))return 2;
  if(path.startsWith('/usta/profil'))return 4;
  return 3;
}

function backHref(path:string){
  if(path.startsWith('/usta/is/'))return '/usta/aktif-isler';
  if(path==='/usta')return null;
  return '/usta';
}

export function TechnicianMobileHeader({isTest}:{isTest:boolean}){
  const path=usePathname();
  const back=backHref(path);
  const [logoutBusy,setLogoutBusy]=useState(false);
  const [logoutError,setLogoutError]=useState('');

  async function handleLogout(){
    if(logoutBusy)return;
    setLogoutBusy(true);
    setLogoutError('');
    try{
      const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',redirect:'manual'});
      if(!response.ok&&response.type!=='opaqueredirect'){
        const payload=await response.json().catch(()=>null) as {error?:string}|null;
        throw new Error(payload?.error??'Çıkış yapılamadı. Lütfen tekrar deneyin.');
      }
      window.location.replace('/giris-usta');
    }catch(error){
      setLogoutError(error instanceof Error?error.message:'Çıkış yapılamadı. Lütfen tekrar deneyin.');
      setLogoutBusy(false);
    }
  }

  return <header className="bg-[#082B4C] px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
    <div className="flex min-h-14 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        {back&&<Link href={back} aria-label="Geri dön" className="grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-white/10"><OutlineIcon name="back"/></Link>}
        <Link href="/usta" aria-label="HizmetPey usta ana sayfası" className="min-w-0"><TeknikOBrand size="compact" onDark/></Link>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isTest&&<span className="hidden rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-bold sm:inline-flex">TEST</span>}
        <button type="button" disabled aria-label="Bildirim merkezi henüz kullanılamıyor" className="grid size-10 place-items-center text-white/65"><OutlineIcon name="bell"/></button>
        <Link href="/usta/profil" aria-label="Usta profilim" className="grid size-10 place-items-center rounded-full border-2 border-white/80 bg-white/10"><OutlineIcon name="profile" className="size-5"/></Link>
      </div>
    </div>
    <div className="flex items-center justify-end border-t border-white/10 pt-2">
      <button type="button" onClick={handleLogout} disabled={logoutBusy} className="min-h-11 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-70">
        {logoutBusy?'Çıkış yapılıyor…':'Çıkış Yap'}
      </button>
    </div>
    {logoutError&&<p role="alert" className="mt-2 text-right text-xs font-semibold text-red-200">{logoutError}</p>}
  </header>;
}

export function TechnicianBottomNavigation(){
  const path=usePathname();
  const active=activeIndex(path);
  return <nav aria-label="Usta alt menüsü" className="fixed inset-x-0 bottom-0 z-40 mx-auto grid w-full max-w-[430px] grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(8,43,76,0.08)] backdrop-blur">
    {tabs.map(({href,label,icon},index)=><Link key={href} href={href} aria-current={index===active?'page':undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-center text-[9px] font-semibold leading-tight transition ${index===active?'text-[#C86B32]':'text-[#718096] hover:text-[#082B4C]'}`}>
      <OutlineIcon name={icon} className="size-[22px]"/><span>{label}</span>
    </Link>)}
  </nav>;
}
