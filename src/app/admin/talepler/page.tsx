export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading,RecordTypeBadge} from '@/components/operation-panel';
import {adminRequestList} from '@/lib/operation-server';

export default async function AdminRequests(){
  const rows=await adminRequestList();
  return <><PanelHeading title="Talepler" description="Gerçek operasyon talepleri."/><PanelCard title="Talep listesi">{!rows.length?<EmptyPanelState>Henüz görüntülenecek talep yok.</EmptyPanelState>:<div className="overflow-x-auto"><table className="w-full min-w-max text-left text-sm"><thead><tr className="border-b">{['Talep','Tarih','Müşteri','Kategori','Durum','Fiyat','TEST / GERÇEK'].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-b border-slate-100"><td className="px-3 py-3"><Link className="font-bold text-[#B75D17]" href={`/admin/talepler/${r.id}`}>{r.id.slice(0,8)}</Link></td><td className="px-3 py-3">{new Date(r.created_at).toLocaleString('tr-TR')}</td><td className="px-3 py-3">{r.customer?.name||'—'}</td><td className="px-3 py-3">{r.category?.name||'—'}</td><td className="px-3 py-3">{r.status}</td><td className="px-3 py-3">{r.quote?`${r.quote.total_amount} ${r.quote.currency}`:'—'}</td><td className="px-3 py-3"><RecordTypeBadge kind={r.customer?.is_test?'TEST':'GERÇEK'}/></td></tr>)}</tbody></table></div>}</PanelCard></>;
}
