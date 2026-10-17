'use client';

export default function TechnicianError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <section role="alert" className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
    <p className="text-[11px] font-extrabold tracking-[0.16em] text-red-700">İŞLEM TAMAMLANAMADI</p>
    <h1 className="mt-2 text-2xl font-extrabold text-[#082B4C]">Ekran yüklenemedi</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">Bağlantınızı kontrol edip yeniden deneyin. Devam eden bir işlem varsa sonucu doğrulamadan tekrar göndermeyin.</p>
    <button type="button" onClick={reset} className="mt-5 w-full rounded-xl bg-[#C86B32] px-4 py-3 font-bold text-white">Yeniden dene</button>
  </section>;
}
