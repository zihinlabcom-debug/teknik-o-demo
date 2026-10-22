import type {SVGProps} from 'react';
import {TechnicianSupportNavigation} from '@/components/technician-mobile-chrome';

export default function TechnicianSupportPage(){
  return <><TechnicianSupportNavigation/>
    <header className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B85F2A]">Destek</p><h1 id="contact-heading" className="mt-1 text-[28px] font-bold tracking-[-0.035em] text-[#082B4C]">İletişim</h1><p className="mt-2 text-sm leading-6 text-slate-600">HizmetPey ekibine ulaşabileceğin kanallar.</p></header>
    <section className="relative rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(8,43,76,0.06)]" aria-labelledby="contact-heading">
      <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-[#C86B32]/10 text-[#B85F2A]"><Mail className="size-6" aria-hidden="true"/></div>
      <h2 className="text-lg font-bold text-[#082B4C]">HizmetPey Teknoloji Limited Şirketi</h2>
      <div className="mt-5 grid gap-3 text-sm">
        <p className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"><Phone className="mt-0.5 size-5 shrink-0 text-[#C86B32]" aria-hidden="true"/><span><strong className="block">Telefon</strong><a href="tel:+905468482643" className="mt-1 inline-block text-slate-700 underline-offset-2 hover:underline">+90 546 848 26 43</a></span></p>
        <p className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"><Mail className="mt-0.5 size-5 shrink-0 text-[#C86B32]" aria-hidden="true"/><span><strong className="block">E-posta</strong><a href="mailto:destek@hizmetpey.com" className="mt-1 inline-block break-all text-slate-700 underline-offset-2 hover:underline">destek@hizmetpey.com</a></span></p>
        <p className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"><MapPin className="mt-0.5 size-5 shrink-0 text-[#C86B32]" aria-hidden="true"/><span><strong className="block">Adres</strong><span className="mt-1 block text-slate-700">Kurtuluş Mahallesi, 16. Sokak (510), No: 73<br/>Nilüfer / Bursa</span></span></p>
      </div>
    </section>
    <HrApplicationForm/>
  </>;
}

function Mail(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>;}
function Phone(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}><path d="m8 3 3 5-3 3a15 15 0 0 0 5 5l3-3 5 3-2 5C10 22 2 14 3 5Z"/></svg>;}
function MapPin(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;}
function Clock3(props:SVGProps<SVGSVGElement>){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>;}

function HrApplicationForm(){
  return <section className="mt-5 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(8,43,76,0.06)]" aria-labelledby="hr-heading">
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-[#9A6013]"><Clock3 className="size-5" aria-hidden="true"/></span><div><h2 id="hr-heading" className="text-lg font-bold text-[#082B4C]">İnsan Kaynakları</h2><p className="mt-1 text-sm leading-6 text-slate-600">Çevrimiçi başvuru altyapısı henüz kullanıma açık değil.</p></div></div>
    <fieldset disabled className="mt-5 grid gap-3 opacity-70">
      <label className="text-sm font-semibold">İsim Soyisim<input className="mt-1 min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-100 px-4"/></label>
      <label className="text-sm font-semibold">E-posta Adresi<input type="email" className="mt-1 min-h-12 w-full rounded-2xl border border-slate-300 bg-slate-100 px-4"/></label>
      <label className="text-sm font-semibold">Tanıtım<textarea rows={4} className="mt-1 w-full rounded-2xl border border-slate-300 bg-slate-100 p-4"/></label>
      <button type="button" className="min-h-12 rounded-2xl bg-slate-300 px-4 text-sm font-bold text-slate-600">Başvuru şu anda kullanılamıyor</button>
    </fieldset>
  </section>;
}
