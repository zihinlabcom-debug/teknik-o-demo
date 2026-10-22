import {Mail,MapPin,Phone} from 'lucide-react';
import {CustomerShell} from '@/components/customer-shell';
import {HrApplicationForm} from '@/components/hr-application-form';

export default function ContactPage(){
  return <CustomerShell>
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
  </CustomerShell>;
}
