import type { Candidate } from '@/lib/diagnostic-state';

export function DiagnosticOutcome({ candidates }: { candidates: Candidate[] }) {
  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Olası arızalar">
    <h3 className="text-sm font-bold text-slate-900">Değerlendirilen olası arızalar</h3>
    <p className="mt-1 mb-3 text-xs text-slate-500">Yüzdeler, bu konuşmadaki gözlemlere göre adayların birbirlerine göre ağırlığını gösterir. Kesin teşhis veya ölçülmüş doğruluk oranı değildir.</p>
    {candidates.length ? <ul className="space-y-3">{[...candidates].sort((a,b)=>b.probability-a.probability).map(c=><li key={c.name}>
      <div className="flex justify-between gap-3 text-xs"><span>{c.name}</span><strong>%{c.probability}</strong></div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{width:`${c.probability}%`}} /></div>
    </li>)}</ul> : <p className="text-xs text-slate-600">Arıza adaylarını oranlamak için yeterli gözlem bulunmuyor.</p>}
    {candidates.length > 0 && <p className="mt-3 text-right text-xs font-semibold text-slate-600">Toplam %100</p>}
  </section>;
}
