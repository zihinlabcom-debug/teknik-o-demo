export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {customerRequestList} from '@/lib/operation-server';

export default async function CustomerRequests(){
  const rows=await customerRequestList();
  return <><PanelHeading title="Taleplerim" description="Aktif ve geçmiş hizmet talepleriniz."/>
    <PanelCard title="Hizmet talepleri">{!rows.length?<EmptyPanelState>Henüz hizmet talebiniz bulunmuyor.</EmptyPanelState>:
      <div className="overflow-x-auto"><table className="w-full min-w-max text-left text-sm"><thead><tr className="border-b">{['Talep','Hizmet','Durum','Tarih','Fiyat'].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>
        {rows.map(r=><tr key={r.id} className="border-b border-slate-100"><td className="px-3 py-3"><Link className="font-bold text-[#B75D17]" href={`/musteri/taleplerim/${r.id}`}>{r.id.slice(0,8)}</Link></td><td className="px-3 py-3">{r.category_name}</td><td className="px-3 py-3">{r.operation_status.label}</td><td className="px-3 py-3">{new Date(r.created_at).toLocaleString('tr-TR')}</td><td className="px-3 py-3">{r.price?`${r.price.total_amount} ${r.price.currency}`:'—'}</td></tr>)}
      </tbody></table></div>}</PanelCard></>;
}