export const dynamic='force-dynamic';

import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {formatMoney,StatusBadge} from '@/components/technician-ui';
import {TechnicianCaseForm} from '@/components/stage10-technician-forms';
import {technicianStage10Overview} from '@/lib/stage10-server';

export default async function ProviderExtraCost(){
  const data=await technicianStage10Overview();
  const active=data.jobs.filter(job=>['assigned','in_progress'].includes(job.status)).map(job=>({id:job.id,label:`İş ${job.id.slice(0,8)}`}));
  return <><PanelHeading title="Ek maliyet talebi" description="Randevusu oluşturulmuş açık bir iş için gerekçeli talep oluşturun."/>
    <PanelCard title="Yeni talep"><TechnicianCaseForm kind="additional_cost" items={active}/></PanelCard>
    <PanelCard title="Talep geçmişi">{data.costs.length?<div className="space-y-3">{data.costs.map(cost=><article key={cost.id} className="rounded-xl border border-[#DEE5ED] p-3">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">Talep edilen fark</p><p className="mt-1 text-lg font-extrabold text-[#082B4C]">{formatMoney(cost.requested_amount,'TRY')}</p></div><StatusBadge value={cost.status}/></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{cost.reason}</p>
    </article>)}</div>:<EmptyPanelState>Ek maliyet talebi bulunmuyor.</EmptyPanelState>}</PanelCard>
  </>;
}
