import Link from 'next/link';

export default function TechnicianNotFound(){
  return <section className="rounded-2xl border border-[#DEE5ED] bg-white p-5 text-center shadow-sm">
    <p className="text-[11px] font-extrabold tracking-[0.16em] text-[#C86B32]">KAYIT BULUNAMADI</p>
    <h1 className="mt-2 text-2xl font-extrabold text-[#082B4C]">İş bilgisine ulaşılamadı</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">Bu iş kaldırılmış, kapanmış veya hesabınıza ait olmayabilir.</p>
    <Link href="/usta/aktif-isler" className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#082B4C] px-4 py-3 font-bold text-white">Aktif işlere dön</Link>
  </section>;
}
