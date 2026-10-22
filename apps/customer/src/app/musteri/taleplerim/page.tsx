export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {customerRequestList} from '@/lib/operation-server';

function statusTone(code:string){
 const tones:Record<string,string>={
  distributing:'bg-amber-100 text-amber-900',redistributing:'bg-amber-100 text-amber-900',
  assigned:'bg-blue-100 text-blue-900',in_progress:'bg-cyan-100 text-cyan-900',
  completed:'bg-emerald-100 text-emerald-900',cancelled:'bg-red-100 text-red-900',
  technician_unavailable:'bg-orange-100 text-orange-900',admin_review:'bg-violet-100 text-violet-900',
  payment_pending:'bg-yellow-100 text-yellow-900',payment_failed:'bg-rose-100 text-rose-900',
  payment_reconciliation:'bg-indigo-100 text-indigo-900',payment_closed:'bg-slate-200 text-slate-800',
  request_open:'bg-slate-100 text-slate-800',
 };
 return tones[code]??'bg-slate-100 text-slate-800';
}

export default async function CustomerRequests(){
  const rows=await customerRequestList();
  // Request lifecycle closure is independent of payment lifecycle closure.
  const isPast=(row:(typeof rows)[number])=>['completed','cancelled','technician_unavailable'].includes(row.status)||row.operation_status.code==='completed';
  const groups=[{title:'Aktif Talepler',items:rows.filter(row=>!isPast(row)),empty:'Aktif talebiniz bulunmuyor.'},{title:'Geçmiş Talepler',items:rows.filter(isPast),empty:'Geçmiş talebiniz bulunmuyor.'}];
  return <><PanelHeading title="Taleplerim" description="Aktif ve geçmiş hizmet talepleriniz."/>
    <div className="space-y-6">{groups.map(group=><PanelCard key={group.title} title={group.title}>{!group.items.length?<EmptyPanelState>{group.empty}</EmptyPanelState>:
      <div className="overflow-x-auto"><table className="w-full min-w-max text-left text-sm"><thead><tr className="border-b">{['Talep','Hizmet','Durum','Tarih','Fiyat'].map(x=><th key={x} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>
        {group.items.map(r=><tr key={r.id} className="border-b border-slate-100"><td className="px-3 py-3"><Link className="font-bold text-[#B75D17]" href={`/musteri/taleplerim/${r.id}`}>{r.id.slice(0,8)}</Link></td><td className="px-3 py-3">{r.category_name}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(r.operation_status.code)}`}>{r.operation_status.label}</span></td><td className="px-3 py-3">{new Date(r.created_at).toLocaleString('tr-TR')}</td><td className="px-3 py-3">{r.price?`${r.price.total_amount} ${r.price.currency}`:'—'}</td></tr>)}
      </tbody></table></div>}</PanelCard>)}</div></>;
}