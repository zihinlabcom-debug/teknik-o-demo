export const dynamic='force-dynamic';

import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {formatMoney,StatusBadge,statusLabel} from '@/components/technician-ui';
import {technicianActiveJobs} from '@/lib/operation-server';

export default async function ProviderActiveJobs(){
  const jobs=await technicianActiveJobs();
  return <><PanelHeading title="Aktif işler" description="Atanan ve işlemdeki işlerinizi, randevu durumlarıyla birlikte takip edin."/>
    <PanelCard title={`Atanan ve işlemdeki işler (${jobs.length})`}>
      {!jobs.length?<EmptyPanelState>Henüz aktif işiniz bulunmuyor. Kabul ettiğiniz işler burada listelenecek.</EmptyPanelState>:<div className="space-y-3">
        {jobs.map(job=><Link key={job.id} href={`/usta/is/${job.id}`} className="block rounded-2xl border border-[#DEE5ED] bg-white p-4 shadow-sm transition hover:border-[#C86B32]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C86B32]">Aktif iş</p><h3 className="mt-1 text-lg font-extrabold text-[#082B4C]">İş {job.id.slice(0,8)}</h3></div><StatusBadge value={job.appointment_scheduling_expired?'cancelled':job.status}/></div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-[#F5F7FA] p-3"><dt className="text-xs text-slate-500">Ücret</dt><dd className="mt-1 font-extrabold text-[#082B4C]">{job.quote?formatMoney(job.quote.total_amount,job.quote.currency):'—'}</dd></div>
            <div className="rounded-xl bg-[#F5F7FA] p-3"><dt className="text-xs text-slate-500">Randevu</dt><dd className="mt-1 font-bold text-[#082B4C]">{job.appointment_scheduling_expired?'Süresi doldu':job.has_active_appointment?'Planlandı':'Bekleniyor'}</dd></div>
          </dl>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{statusLabel(job.status)}</span><span>Detayı aç →</span></div>
        </Link>)}
      </div>}
    </PanelCard>
  </>;
}
