export const dynamic='force-dynamic';

import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {StatusBadge} from '@/components/technician-ui';
import {WarrantyCorrectionAction} from '@/components/stage10-technician-forms';
import {technicianStage10Overview} from '@/lib/stage10-server';

export default async function Corrections(){
  const data=await technicianStage10Overview();
  return <><PanelHeading title="Garanti düzeltmeleri" description="Size teklif edilen veya yürüttüğünüz ücretsiz düzeltme işlerini yönetin."/>
    <PanelCard title="Düzeltme işleri">{data.corrections.length?<div className="space-y-3">{data.corrections.map(correction=><article key={correction.id} className="rounded-2xl border border-[#DEE5ED] p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-[#082B4C]">{correction.assignment_kind==='original_technician'?'İlk usta düzeltmesi':'Alternatif usta düzeltmesi'}</p><p className="mt-1 text-xs leading-5 text-slate-500">Maliyet sorumluluğu: {correction.cost_responsibility==='teknik_o'?'HizmetPey':'İlk usta'} · Müşteri ücreti: 0 TL</p></div><StatusBadge value={correction.status}/></div>
      <WarrantyCorrectionAction id={correction.id} status={correction.status}/>
    </article>)}</div>:<EmptyPanelState>Garanti düzeltme işi bulunmuyor.</EmptyPanelState>}</PanelCard>
  </>;
}
