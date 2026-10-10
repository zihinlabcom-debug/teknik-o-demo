"use client";
import {useRef,useEffect,type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {TeknikOBrand} from './brand/teknik-o-brand';
export type NavigationItem={href:string;label:string};
const icons=['M3 10 12 3l9 7v11h-6v-7H9v7H3Z','M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z','M5 5h14v16H5z M9 3h6v4H9z M8 12h8 M8 16h6','M4 6h16 M4 12h16 M4 18h16'];
function Icon({index}:{index:number}){return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[index%icons.length]}/></svg>}
export function PanelNavigation({children,links,primary,area,isTest}:{children:ReactNode;links:readonly NavigationItem[];primary:readonly NavigationItem[];area:string;isTest?:boolean}){
 const path=usePathname();const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);
 const active=links.filter(x=>path===x.href||path.startsWith(x.href+'/')).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
 function close(){dialog.current?.close();trigger.current?.focus();}
 useEffect(()=>{const d=dialog.current;if(!d)return;const release=()=>{document.body.style.overflow='';};d.addEventListener('close',release);return ()=>{d.removeEventListener('close',release);release();};},[]);
 const list=<nav className="to-nav-list" aria-label={`${area} bölümleri`}>{links.map(x=><Link key={x.href} href={x.href} aria-current={active===x.href?'page':undefined} onClick={()=>{if(dialog.current?.open)close();}}>{x.label}</Link>)}</nav>;
 const logout=<form action="/api/auth/logout" method="post" className="mt-6 border-t border-[#E5E4E9] pt-4"><button className="min-h-11 text-sm font-semibold text-[#A8422B]">Çıkış Yap</button></form>;
 return <div className="to-shell"><aside className="to-sidebar"><Link href={primary[0]?.href??'/'}><TeknikOBrand/></Link><p className="mt-5 text-xs font-bold uppercase tracking-widest text-[#667085]">{area}</p>{isTest&&<p className="mt-2 text-xs text-[#71330f]">Test hesabı</p>}{list}{logout}</aside>
 <header className="to-topbar"><Link href={primary[0]?.href??'/'}><TeknikOBrand size="compact"/></Link><button ref={trigger} className="to-menu-button" aria-label="Menüyü aç" aria-haspopup="dialog" onClick={()=>{dialog.current?.showModal();document.body.style.overflow='hidden';}}><Icon index={3}/></button></header>
 <dialog ref={dialog} className="to-dialog" aria-label={`${area} menüsü`} onClick={e=>{if(e.target===e.currentTarget){const b=e.currentTarget.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right)close();}}}><div className="flex items-center justify-between gap-3"><TeknikOBrand size="compact"/><button className="to-menu-button text-xl" onClick={close} aria-label="Menüyü kapat">×</button></div><p className="mt-4 text-sm text-[#667085]">{area}</p>{list}{logout}</dialog>
 <main className="to-content">{children}</main><nav className="to-bottom" aria-label="Alt navigasyon">{primary.map((x,i)=><Link key={x.href} href={x.href} aria-current={active===x.href?'page':undefined}><Icon index={i}/><span>{x.label}</span></Link>)}</nav></div>;
}
