import Link from 'next/link';

export default function AdminNotFound(){
  return <section className="mx-auto max-w-xl rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#C86B32]">Kayıt bulunamadı</p>
    <h1 className="mt-3 text-2xl font-extrabold text-[#082B4C]">Aradığınız yönetim kaydı mevcut değil</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">Kayıt kaldırılmış, taşınmış veya bu bağlantı artık geçerli olmayabilir.</p>
    <Link href="/admin/talepler" className="mt-5 inline-flex items-center rounded-xl bg-[#082B4C] px-5 py-3 text-sm font-bold text-white">Talep listesine dön</Link>
  </section>;
}
