import Link from 'next/link';
import {ArrowRight, House} from 'lucide-react';
import {CustomerShell} from '@/components/customer-shell';
import {TeknikOBrand} from '@/components/brand/teknik-o-brand';

export default function ServiceHomePage(){
  return <CustomerShell>
    <section className="relative rounded-[2rem] bg-[#D97724]/[0.06] px-6 py-10 md:px-10 md:py-14" aria-labelledby="home-heading">
      <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
        <div className="min-w-0 max-w-xl">
          <div className="mb-7 sm:hidden"><TeknikOBrand size="standard"/></div>
          <div className="mb-7 hidden sm:block"><TeknikOBrand size="showcase"/></div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#D97724] sm:text-xs">Teknik hizmetin akıllı platformu</p>
          <h1 id="home-heading" className="mt-4 text-[clamp(2rem,7.5vw,4.4rem)] font-black leading-[1.06] tracking-[-0.05em]">İhtiyacını yaz,<br/><span className="text-[#D97724]">maliyetini öğren.</span></h1>
          <p className="mt-4 text-base font-bold md:text-lg">Sürpriz yok, doğru hizmet var.</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">İhtiyacın olan hizmeti seç, detayları paylaş, maliyetini öğren ve güvenle hizmet al.</p>
          <Link href="/kategoriler" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#D97724] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#D97724]/20 transition hover:brightness-95">Kategorileri incele <ArrowRight className="size-4" aria-hidden="true"/></Link>
        </div>
        <div className="flex size-40 shrink-0 items-center justify-center rounded-[2rem] border border-[#D97724]/10 bg-white shadow-xl lg:size-60" aria-hidden="true"><TeknikOBrand size="showcase" showWordmark={false}/></div>
      </div>
    </section>
    <section className="relative mt-10 rounded-[1.5rem] border border-slate-200 p-6 md:p-8" aria-labelledby="service-heading">
      <div className="flex items-center gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#D97724]/10 text-[#D97724]"><House className="size-6" aria-hidden="true"/></span><div><h2 id="service-heading" className="text-xl font-black">Hizmete kolayca ulaş</h2><p className="mt-1 text-sm text-slate-600">Kategoriler sayfasından hizmetini seçerek mevcut sohbet akışına geçebilirsin.</p></div></div>
    </section>
  </CustomerShell>;
}
