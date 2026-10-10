import {Mail,MapPin,Phone} from 'lucide-react';
import {CustomerShell} from '@/components/customer-shell';
import {HrApplicationForm} from '@/components/hr-application-form';

export default function ContactPage(){
  return <CustomerShell>
    <section className="relative rounded-[1.5rem] border border-slate-200 bg-white p-6 md:p-9" aria-labelledby="contact-heading">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#B95236]/10 text-[#B95236]"><Mail className="size-7" aria-hidden="true"/></div>
      <h1 id="contact-heading" className="text-3xl font-black tracking-tight md:text-4xl">İletişim</h1>
      <p className="mt-3 text-lg font-bold">Teknik-O Teknoloji Limited Şirketi</p>
      <div className="mt-7 grid gap-4 text-sm sm:grid-cols-2">
        <p className="flex items-start gap-3 rounded-xl bg-[#F8F6F3] p-4"><Phone className="mt-0.5 size-5 shrink-0 text-[#B95236]" aria-hidden="true"/><span><strong className="block">Telefon</strong><a href="tel:+905468482643" className="mt-1 inline-block text-slate-700 underline-offset-2 hover:underline">+90 546 848 26 43</a></span></p>
        <p className="flex items-start gap-3 rounded-xl bg-[#F8F6F3] p-4"><Mail className="mt-0.5 size-5 shrink-0 text-[#B95236]" aria-hidden="true"/><span><strong className="block">E-posta</strong><a href="mailto:smdkaracaa@gmail.com" className="mt-1 inline-block break-all text-slate-700 underline-offset-2 hover:underline">smdkaracaa@gmail.com</a></span></p>
        <p className="flex items-start gap-3 rounded-xl bg-[#F8F6F3] p-4 sm:col-span-2"><MapPin className="mt-0.5 size-5 shrink-0 text-[#B95236]" aria-hidden="true"/><span><strong className="block">Adres</strong><span className="mt-1 block text-slate-700">Kurtuluş Mahallesi, 16. Sokak (510), No: 73<br/>Nilüfer / Bursa</span></span></p>
      </div>
    </section>
    <HrApplicationForm/>
  </CustomerShell>;
}
