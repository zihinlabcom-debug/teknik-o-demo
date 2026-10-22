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

const supportLinks=[
 {href:'/usta/ek-maliyet',label:'Ek maliyet',icon:'activity' as const},
 {href:'/usta/sikayetler',label:'Şikâyet ve başvuru',icon:'support' as const},
 {href:'/usta/garanti-duzeltmeleri',label:'Garanti düzeltmeleri',icon:'briefcase' as const},
];
const desktopTabs=[...tabs.slice(0,4),...supportLinks,...tabs.slice(4)];
function desktopActive(path:string,href:string){return href==='/usta'?path===href:href==='/usta/aktif-isler'?(path===href||path.startsWith(href+'/')||path.startsWith('/usta/is/')):path===href||path.startsWith(href+'/');}

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
  if(supportLinks.some(link=>path===link.href||path.startsWith(link.href+'/')))return '/usta/destek';
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

  return <header className="bg-[#082B4C] px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white lg:relative lg:flex lg:h-32 lg:items-center lg:gap-4 lg:px-6 lg:py-0">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      <div className="absolute inset-0 bg-[linear-gradient(125deg,transparent_0%,rgba(18,70,108,0.55)_28%,transparent_28.2%,transparent_65%,rgba(5,28,50,0.65)_65.2%),linear-gradient(145deg,transparent_18%,rgba(31,88,125,0.22)_18.2%,transparent_48%)]"/>
      <div className="absolute inset-0 bg-[linear-gradient(125deg,transparent_27.7%,rgba(200,107,50,0.45)_27.85%,transparent_28.05%,transparent_74%,rgba(200,107,50,0.22)_74.15%,transparent_74.3%),radial-gradient(ellipse_at_72%_0%,rgba(240,163,109,0.12),transparent_55%)]"/>
      <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle,rgba(240,163,109,0.25)_1px,transparent_1px)] bg-[size:12px_12px] opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]"/>
    </div>
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden items-center justify-center overflow-hidden opacity-15 lg:flex"><span className="text-[clamp(3rem,6vw,7rem)] font-extrabold leading-none tracking-[-0.045em] text-white">Hizmet<span className="text-[#E38245]">Pey</span></span></span>
    <div className="flex min-h-14 items-center justify-between gap-2 lg:relative lg:z-10 lg:min-w-0 lg:flex-1">
      <div className="flex min-w-0 items-center gap-1">
        {back&&<Link href={back} aria-label="Geri dön" className="grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-white/10"><OutlineIcon name="back"/></Link>}
        <Link href="/usta" aria-label="HizmetPey usta ana sayfası" className="min-w-0 lg:hidden"><TeknikOBrand size="compact" onDark/></Link>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isTest&&<span className="hidden rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-bold sm:inline-flex">TEST</span>}
        <button type="button" disabled aria-label="Bildirim merkezi henüz kullanılamıyor" className="grid size-10 place-items-center text-white/65"><OutlineIcon name="bell"/></button>
        <Link href="/usta/profil" aria-label="Usta profilim" className="grid size-10 place-items-center rounded-full border-2 border-white/80 bg-white/10"><OutlineIcon name="profile" className="size-5"/></Link>
      </div>
    </div>
    <div className="flex items-center justify-end border-t border-white/10 pt-2 lg:relative lg:z-10 lg:shrink-0 lg:border-0 lg:pt-0">
      <button type="button" onClick={handleLogout} disabled={logoutBusy} className="min-h-11 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-70">
        {logoutBusy?'Çıkış yapılıyor…':'Çıkış Yap'}
      </button>
    </div>
    {logoutError&&<p role="alert" className="mt-2 text-right text-xs font-semibold text-red-200 lg:absolute lg:bottom-2 lg:right-6 lg:z-20 lg:mt-0">{logoutError}</p>}
  </header>;
}

export function TechnicianBottomNavigation(){
  const path=usePathname();
  const active=activeIndex(path);
  return <nav aria-label="Usta alt menüsü" className="fixed inset-x-0 bottom-0 z-40 mx-auto grid w-full max-w-[430px] grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(8,43,76,0.08)] backdrop-blur md:max-w-none lg:hidden">
    {tabs.map(({href,label,icon},index)=><Link key={href} href={href} aria-current={index===active?'page':undefined} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-center text-[9px] font-semibold leading-tight transition ${index===active?'text-[#C86B32]':'text-[#718096] hover:text-[#082B4C]'}`}>
      <OutlineIcon name={icon} className="size-[22px]"/><span>{label}</span>
    </Link>)}
  </nav>;
}

export function TechnicianDesktopNavigation(){
 const path=usePathname();

 return <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex" aria-label="Usta masaüstü navigasyonu">
  <Link href="/usta" aria-label="HizmetPey usta ana sayfası" className="flex h-32 shrink-0 items-center bg-[#082B4C] px-6"><TeknikOBrand size="compact" onDark desktopEnlarged/></Link>
  <nav aria-label="Usta menüsü" className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">{desktopTabs.map(({href,label,icon})=><Link key={href} href={href} aria-current={desktopActive(path,href)?'page':undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C86B32] ${desktopActive(path,href)?'bg-[#C86B32]/10 text-[#A94D18]':'text-[#52627A] hover:bg-slate-50 hover:text-[#082B4C]'}`}><OutlineIcon name={icon} className="size-[22px] shrink-0"/><span>{label}</span></Link>)}</nav>
 </aside>;
}

export function TechnicianSupportNavigation(){
 const path=usePathname();
 return <details className="mb-5 rounded-2xl border border-[#DEE5ED] bg-white p-4 lg:hidden"><summary className="min-h-11 cursor-pointer text-sm font-bold text-[#082B4C]">Destek işlemleri</summary><nav aria-label="Destek işlemleri" className="mt-2 space-y-2">{supportLinks.map(({href,label})=><Link key={href} href={href} aria-current={desktopActive(path,href)?'page':undefined} className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-3 text-sm font-semibold text-[#082B4C]"><span>{label}</span><span aria-hidden="true">→</span></Link>)}</nav></details>;
}
