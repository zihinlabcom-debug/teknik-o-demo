import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight,Clock3,ShieldCheck,Sparkles} from 'lucide-react';
import {HizmetPeyBrand} from '@/components/brand/hizmetpey-brand';

const services=[
  {name:'Kombi',image:'/service-categories/boiler.jpg'},
  {name:'Boya',image:'/service-categories/painting.jpg'},
  {name:'Temizlik',image:'/service-categories/cleaning.jpg'},
] as const;

export default function LandingPage(){
  return <main className="min-h-screen bg-[#E7ECF2] px-3 py-3 text-[#17263B] sm:px-5 sm:py-6">
    <div className="relative mx-auto min-h-[calc(100vh-1.5rem)] max-w-[430px] overflow-hidden rounded-[30px] bg-[#F8FAFC] shadow-[0_24px_70px_rgba(8,43,76,0.18)] sm:min-h-[calc(100vh-3rem)]">
      <section className="relative isolate overflow-hidden bg-[#082B4C] px-5 pb-10 pt-6 text-white">
        <Image src="/service-categories/painting.jpg" alt="" fill sizes="430px" className="-z-20 object-cover opacity-35" priority/>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(150deg,rgba(5,35,63,0.99)_8%,rgba(8,43,76,0.92)_62%,rgba(8,43,76,0.68)_100%)]"/>
        <HizmetPeyBrand size="hero"/>
        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F0A270]">Hizmette netlik</p>
        <h1 className="mt-3 text-[34px] font-bold leading-[1.07] tracking-[-0.04em]">Sürprizlere değil,<br/>hizmete yer var.</h1>
        <p className="mt-4 max-w-[320px] text-[15px] font-medium leading-6 text-white/85">Ne ödeyeceğini bil, hizmetini al.</p>
        <Link href="/kayit" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#C86B32] px-5 text-sm font-bold text-white shadow-lg shadow-black/15 transition hover:bg-[#B85F2A]">Hemen Başla <ArrowRight className="size-4" aria-hidden="true"/></Link>
      </section>

      <section className="px-5 py-6" aria-labelledby="services-heading">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B85F2A]">Popüler hizmetler</p><h2 id="services-heading" className="mt-1 text-xl font-bold text-[#082B4C]">İhtiyacını seç</h2></div><Link href="/giris" className="text-xs font-bold text-[#2463AA]">Giriş Yap</Link></div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {services.map(service=><article key={service.name} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="relative aspect-square"><Image src={service.image} alt="" fill sizes="130px" className="object-cover"/></div><p className="px-2 py-3 text-center text-xs font-bold text-[#082B4C]">{service.name}</p></article>)}
        </div>
        <div className="mt-5 grid gap-2.5" aria-label="HizmetPey avantajları">
          <p className="flex items-center gap-3 rounded-2xl bg-white p-3 text-xs font-semibold shadow-sm"><ShieldCheck className="size-5 text-[#C86B32]" aria-hidden="true"/> Doğrulanmış hizmet akışı</p>
          <p className="flex items-center gap-3 rounded-2xl bg-white p-3 text-xs font-semibold shadow-sm"><Clock3 className="size-5 text-[#C86B32]" aria-hidden="true"/> Hızlı değerlendirme ve takip</p>
          <p className="flex items-center gap-3 rounded-2xl bg-white p-3 text-xs font-semibold shadow-sm"><Sparkles className="size-5 text-[#C86B32]" aria-hidden="true"/> Açık fiyat ve sade deneyim</p>
        </div>
        <nav className="mt-6 grid grid-cols-2 gap-3" aria-label="Hesap işlemleri"><Link href="/kayit" className="flex min-h-12 items-center justify-center rounded-2xl bg-[#C86B32] px-3 text-sm font-bold text-white">Kayıt Ol</Link><Link href="/giris" className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-[#C86B32] bg-white px-3 text-sm font-bold text-[#A65326]">Giriş Yap</Link></nav>
      </section>
    </div>
  </main>;
}
