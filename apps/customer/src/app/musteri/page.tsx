import {statusLabel} from '@/lib/ui-labels';
import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {customerStage10Overview} from '@/lib/stage10-server';

export const dynamic='force-dynamic';
export default async function CustomerPanel(){
  const data=await customerStage10Overview();
  const active=data.requests.filter(item=>!['completed','cancelled','technician_unavailable'].includes(item.status));
  const pendingCosts=data.additionalCosts.filter(item=>item.status==='pending_customer');
  return <><PanelHeading title="Müşteri paneli" description="Taleplerinizin durumunu ve son işlemlerinizi buradan takip edebilirsiniz."/>
    <div className="grid gap-4 md:grid-cols-2">
      <PanelCard title="Aktif talep">{active.length?active.slice(0,5).map(item=><p key={item.id} className="border-b border-slate-100 py-2 text-sm">{item.category_name} · {statusLabel(item.status)}</p>):<EmptyPanelState>Henüz aktif talebiniz bulunmuyor.</EmptyPanelState>}</PanelCard>
      <PanelCard title="Gerekli işlemler">{pendingCosts.length?<p className="text-sm">{pendingCosts.length} ek maliyet talebi kararınızı bekliyor.</p>:<EmptyPanelState>Bekleyen işleminiz bulunmuyor.</EmptyPanelState>}</PanelCard>
    </div>
    <div className="mt-6 flex flex-wrap gap-3"><Link href="/musteri/taleplerim" className="inline-flex rounded-xl bg-[#B95236] px-4 py-2.5 text-sm font-bold text-white">Taleplerime git</Link>{pendingCosts.length>0&&<Link href="/musteri/ek-maliyet" className="inline-flex rounded-xl border border-[#B95236] px-4 py-2.5 text-sm font-bold text-[#A8422B]">Ek maliyeti değerlendir</Link>}</div>
  </>;
}
