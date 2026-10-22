import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight,Clock3,ShieldCheck,Sparkles,Flame,PaintRoller,SprayCan,Truck,Smile,Sofa,RectangleHorizontal} from 'lucide-react';
import {HizmetPeyBrand} from '@/components/brand/hizmetpey-brand';

const services=[
  {name:'Kombi',image:'/service-categories/boiler.jpg'},
  {name:'Boya',image:'/service-categories/painting.jpg'},
  {name:'Temizlik',image:'/service-categories/cleaning.jpg'},
] as const;

function MobileLanding(){
  return <main className="min-h-screen bg-[#E7ECF2] px-3 py-3 text-[#17263B] sm:px-5 sm:py-6 lg:px-0 lg:py-0">
    <div className="relative mx-auto min-h-[calc(100vh-1.5rem)] max-w-[430px] overflow-hidden rounded-[30px] bg-[#F8FAFC] shadow-[0_24px_70px_rgba(8,43,76,0.18)] sm:min-h-[calc(100vh-3rem)] lg:grid lg:min-h-dvh lg:w-full lg:max-w-none lg:grid-cols-[0.9fr_1.1fr] lg:rounded-none lg:shadow-none">
      <section className="relative isolate overflow-hidden bg-[#082B4C] px-5 pb-10 pt-6 text-white lg:min-w-0 lg:px-12 lg:py-12">
        <Image src="/service-categories/painting.jpg" alt="" fill sizes="(min-width: 1024px) 48vw, 430px" className="-z-20 object-cover opacity-35" priority/>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(150deg,rgba(5,35,63,0.99)_8%,rgba(8,43,76,0.92)_62%,rgba(8,43,76,0.68)_100%)]"/>
        <HizmetPeyBrand size="hero"/>
        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F0A270]">Hizmette netlik</p>
        <h1 className="mt-3 text-[34px] font-bold leading-[1.07] tracking-[-0.04em]">Sürprizlere değil,<br/>hizmete yer var.</h1>
        <p className="mt-4 max-w-[320px] text-[15px] font-medium leading-6 text-white/85">Ne ödeyeceğini bil, hizmetini al.</p>
        <Link href="/kayit" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#C86B32] px-5 text-sm font-bold text-white shadow-lg shadow-black/15 transition hover:bg-[#B85F2A]">Hemen Başla <ArrowRight className="size-4" aria-hidden="true"/></Link>
      </section>

      <section className="min-w-0 px-5 py-6 lg:px-12 lg:py-12" aria-labelledby="services-heading">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#B85F2A]">Popüler hizmetler</p><h2 id="services-heading" className="mt-1 text-xl font-bold text-[#082B4C]">İhtiyacını seç</h2></div><Link href="/giris" className="text-xs font-bold text-[#2463AA]">Giriş Yap</Link></div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {services.map(service=><article key={service.name} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="relative aspect-square"><Image src={service.image} alt="" fill sizes="(min-width: 1024px) 17vw, 130px" className="object-cover"/></div><p className="px-2 py-3 text-center text-xs font-bold text-[#082B4C]">{service.name}</p></article>)}
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

const desktopServices=[
 {name:'Kombi',image:'/service-categories/boiler.jpg',description:'Kombi bakım, onarım ve montaj hizmetleri.',icon:Flame,href:'/dashboard?category=boiler'},
 {name:'Boya',image:'/service-categories/painting.jpg',description:'Ev ve iş yeri boya badana hizmetleri.',icon:PaintRoller,href:'/dashboard?category=painting'},
 {name:'Temizlik',image:'/service-categories/cleaning.jpg',description:'Ev, ofis ve detaylı temizlik hizmetleri.',icon:SprayCan,href:'/temizlik'},
 {name:'Nakliye',image:'/service-categories/moving.jpg',description:'Ev ve ofis taşımacılığı hizmetleri.',icon:Truck,href:null},
 {name:'Koltuk Yıkama',image:'/service-categories/sofa-extraction.jpg',description:'Koltuk ve yatak yıkama hizmetleri.',icon:Sofa,href:'/dashboard?category=sofa_cleaning'},
 {name:'Halı Yıkama',image:'/service-categories/carpet-extraction.jpg',description:'Halı, perde ve ev tekstili yıkama hizmetleri.',icon:RectangleHorizontal,href:'/dashboard?category=carpet_cleaning'},
] as const;
const steps=['İhtiyacın olan hizmeti seç.','Detaylarını paylaş, fiyat ve süreci önceden gör.','Sana uygun hizmeti güvenle al.'];
const benefits=[{icon:ShieldCheck,text:'Doğrulanmış hizmet akışı'},{icon:Clock3,text:'Hızlı değerlendirme ve takip'},{icon:Smile,text:'Açık fiyat ve sade deneyim'}];

export default function LandingPage(){
 return <><div className="md:hidden"><MobileLanding/></div>
  <main className="hidden min-h-dvh bg-[#FCFDFE] text-[#082B4C] md:grid lg:grid-cols-[45%_55%]">
   <section className="relative isolate flex min-w-0 flex-col overflow-hidden bg-[#062C4E] px-8 py-10 text-white lg:px-[clamp(2rem,4.9vw,6rem)] lg:py-[clamp(2.5rem,4.8vw,5.5rem)]">
    <Image src="/service-categories/painting.jpg" alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="-z-30 object-cover object-center opacity-50 lg:opacity-90" priority/>
    <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[linear-gradient(105deg,rgba(3,39,70,0.98),rgba(3,39,70,0.87)_55%,rgba(3,39,70,0.60))] lg:bg-[linear-gradient(100deg,rgba(3,39,70,0.96)_0%,rgba(3,39,70,0.88)_30%,rgba(3,39,70,0.52)_60%,rgba(3,39,70,0.18)_100%)]"/>
    <div aria-hidden="true" className="pointer-events-none absolute -left-44 -top-64 -z-10 size-[430px] rounded-full bg-[#147BC0]/35"/>
    <div aria-hidden="true" className="pointer-events-none absolute -bottom-72 -right-72 -z-10 size-[620px] rounded-full border-[90px] border-[#0967B1]/25"/>
    <Link href="/" aria-label="HizmetPey ana sayfa" className="inline-flex w-fit max-w-full items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
     <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-white xl:size-24"><Image src="/brand/hizmetpey-resmi.png" alt="" width={202} height={202} className="absolute -left-[44px] -top-[32px] size-[168px] max-w-none xl:-left-[53px] xl:-top-[38px] xl:size-[202px]" priority/></span>
     <span className="text-[clamp(2rem,3.6vw,4.25rem)] font-extrabold tracking-[-0.055em]">Hizmet<span className="text-[#F17B29]">Pey</span></span>
    </Link>
    <figure className="mt-6 hidden lg:block lg:mix-blend-lighten" aria-label="İlk hizmete özel yüzde 30 indirim tasarım önizlemesi">
     <Image src="/campaigns/first-service-30-preview.png" alt="İlk Hizmete Özel %30 İndirim; turuncu indirim etiketi ve megafon" width={700} height={440} sizes="(min-width: 1024px) 35vw, 1px" className="h-auto w-full max-w-[620px]" style={{maskImage:'linear-gradient(to right, transparent, black 4%, black 96%, transparent), linear-gradient(to bottom, transparent, black 4%, black 96%, transparent)',maskComposite:'intersect'}}/>
     <figcaption className="sr-only">Tasarım önizlemesidir; fiyatlara indirim uygulanmaz.</figcaption>
    </figure>
    <section className="mt-8 border-b border-[#2775A1]/40 pb-7 xl:mt-10 lg:hidden" aria-labelledby="how-title">
     <h2 id="how-title" className="text-xl font-extrabold xl:text-2xl">Nasıl çalışır?</h2>
     <ol className="relative mt-4 space-y-3 before:absolute before:bottom-4 before:left-4 before:top-4 before:border-l before:border-dashed before:border-[#2796D8]/60">{steps.map((step,index)=><li key={step} className="relative flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#168EE1] to-[#075084] text-sm font-bold shadow-sm">{index+1}</span><span className="text-sm leading-6 text-white/95 xl:text-base">{step}</span></li>)}</ol>
    </section>
    <div className="mt-7 lg:mt-[1.26rem]">
     <p className="text-sm font-extrabold uppercase tracking-[0.17em] text-[#FF8A27] lg:text-[0.63rem]">HİZMETTE NETLİK</p>
     <h1 className="mt-4 text-[clamp(2.4rem,3.8vw,4.5rem)] font-extrabold leading-[1.08] tracking-[-0.045em] lg:mt-[0.72rem] lg:text-[clamp(1.728rem,2.736vw,3.24rem)]">Sürprizlere değil,<br/>hizmete yer var.</h1>
     <p className="mt-5 text-lg leading-7 text-white/95 lg:mt-[0.9rem] lg:text-[0.81rem] lg:leading-[1.26rem] xl:text-[1.08rem]">Ne ödeyeceğini bil, hizmetini al.</p>
     <Link href="/kayit" className="mt-7 inline-flex min-h-14 items-center justify-center gap-6 rounded-[20px] bg-gradient-to-r from-[#F58027] to-[#CF6425] px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:mt-[1.26rem] lg:min-h-[2.52rem] lg:gap-[1.08rem] lg:rounded-[14.4px] lg:px-[1.44rem] lg:py-[0.72rem] lg:text-[0.81rem] lg:leading-[1.26rem]">Hemen Başla <ArrowRight className="size-6 lg:size-[1.08rem]" aria-hidden="true"/></Link>
    </div>
    <div className="mt-auto grid grid-cols-3 gap-3 pt-12" aria-label="HizmetPey avantajları">{benefits.map(({icon:Icon,text})=><div key={text} className="flex min-w-0 items-center gap-3 border-r border-white/10 pr-2 last:border-r-0"><Icon className="size-8 shrink-0 text-white/95" strokeWidth={1.5} aria-hidden="true"/><span className="text-xs leading-5 text-white/90 xl:text-sm">{text}</span></div>)}</div>
   </section>
   <section className="min-w-0 px-8 pb-10 pt-6 lg:px-[clamp(1.5rem,2.6vw,3.5rem)]" aria-labelledby="desktop-services-title">
    <nav className="flex justify-end gap-3" aria-label="Hesap işlemleri"><Link href="/giris" className="inline-flex min-h-12 min-w-36 items-center justify-center rounded-xl border border-[#ED7128] px-6 text-sm font-bold text-[#D55B1F] transition hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C86B32]">Giriş Yap</Link><Link href="/kayit" className="inline-flex min-h-12 min-w-36 items-center justify-center rounded-xl bg-gradient-to-r from-[#E87B2E] to-[#CF6425] px-6 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C86B32]">Kayıt Ol</Link></nav>
    <header className="mt-6 lg:mt-[14px]">
     <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#E9631B]">POPÜLER HİZMETLER</p>
     <h2 id="desktop-services-title" className="mt-1 text-[clamp(2.25rem,3vw,3.5rem)] font-extrabold leading-tight tracking-[-0.045em] text-[var(--hizmetpey-navy)]">İhtiyacını seç</h2>
     <p className="mt-1 max-w-xl text-base leading-7 text-[#526D94] xl:text-lg">Evine, ofisine veya iş yerine ihtiyacın olan hizmeti seç,<br className="hidden xl:block"/> fiyatını öğren güvenle hizmetini al.</p>
    </header>
    <section aria-labelledby="service-banner-title" className="mt-5 hidden h-[172px] w-full items-center gap-4 rounded-2xl bg-[var(--hizmetpey-navy)] px-4 py-4 text-white lg:flex xl:px-6">
     <div className="min-w-0 flex-1">
      <p className="flex items-center gap-2 text-[12px] font-extrabold leading-4 tracking-[0.06em] text-[var(--hizmetpey-copper)] xl:text-[16px]"><ShieldCheck className="size-5 shrink-0 xl:size-6" aria-hidden="true"/>HİZMETPEY İLE HİZMETTE NETLİK</p>
      <h3 id="service-banner-title" className="mt-2 text-[clamp(1.125rem,1.6vw,2rem)] font-extrabold leading-tight"><span>Hizmetini seç,</span>{' '}<span className="text-[var(--hizmetpey-copper)]">fiyatını önceden bil.</span></h3>
      <p className="mt-2 text-pretty text-[14px] leading-5 text-white/90 xl:text-[17px] xl:leading-6">Sürpriz ücretlerle karşılaşma. İhtiyacın olan hizmetin fiyatını öğren, sana uygun usta <span className="whitespace-nowrap">kapına gelsin.</span></p>
     </div>
    </section>
    <div className="mt-6 grid grid-cols-2 gap-4 xl:gap-5 lg:mx-auto lg:w-[80%] lg:grid-cols-3 lg:gap-[0.8rem] xl:gap-4">{desktopServices.map(({name,image,description,icon:Icon,href})=>{
     const card=<><div className="relative aspect-[1.9] overflow-hidden rounded-xl lg:aspect-[1.25] lg:rounded-[12.8px]"><Image src={image} alt="" fill sizes="(min-width: 1024px) 13.6vw, 45vw" className="object-cover lg:object-contain"/></div><div className="relative px-3 pb-4 pt-7 lg:px-[0.6rem] lg:pb-[0.8rem] lg:pt-[1.4rem]"><span className="absolute -top-8 left-3 grid size-14 place-items-center rounded-2xl border-2 border-white bg-[#FFF0E5] text-[#EC6C24] lg:-top-[1.008rem] lg:left-[0.378rem] lg:size-[1.764rem] lg:rounded-[8.064px]"><Icon className="size-7 lg:size-[0.98rem]" strokeWidth={1.8} aria-hidden="true"/></span><div className="flex items-start justify-between gap-2 lg:flex-wrap"><div className="min-w-0 lg:w-full lg:break-words"><h3 className="text-xl font-extrabold tracking-tight lg:text-[0.9rem]">{name}</h3><p className="mt-1 text-sm leading-5 text-[#5C769A] lg:mt-[0.175rem] lg:text-[0.7rem] lg:leading-[1.2rem]">{description}</p>{!href&&<span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900 lg:mt-[0.35rem] lg:px-[0.35rem] lg:py-[0.175rem] lg:text-xs">Yakında</span>}</div><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#FFF0E5] text-[#EC6C24] lg:size-[1.4rem]"><ArrowRight className="size-6 lg:size-[0.84rem]"/></span></div></div></>;
     const style='min-w-0 lg:rounded-2xl lg:p-[0.4rem] rounded-2xl border border-[#ECF1F6] bg-white p-1 shadow-[0_3px_10px_rgba(8,43,76,0.06)]';
     return href?<Link key={name} href={href} className={style+' transition hover:border-[#ED7128]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C86B32]'}>{card}</Link>:<article key={name} aria-label="Nakliye — yakında, henüz hizmete açık değil" className={style}>{card}</article>;
    })}</div>
   </section>
  </main>
 </>;
}
