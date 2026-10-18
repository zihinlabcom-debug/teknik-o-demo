'use client';

export default function AdminError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
    <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-xl font-black text-red-700">!</div>
    <h1 className="mt-4 text-xl font-extrabold text-[#082B4C]">Yönetim ekranı yüklenemedi</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">Veriler alınırken bir sorun oluştu. Kayıtlar üzerinde herhangi bir işlem yapılmadı.</p>
    <button type="button" onClick={reset} className="mt-5 rounded-xl bg-[#C86B32] px-5 py-3 text-sm font-bold text-white">Tekrar dene</button>
  </section>;
}
