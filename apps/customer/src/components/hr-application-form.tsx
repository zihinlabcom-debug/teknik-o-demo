import {Clock3} from 'lucide-react';

export function HrApplicationForm(){
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
