export const dynamic = 'force-dynamic';

import {notFound} from 'next/navigation';
import {EmptyPanelState,PanelCard,PanelHeading,RecordTypeBadge} from '@/components/operation-panel';
import {adminRequestDetail,OperationError} from '@/lib/operation-server';

export default async function AdminRequestDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params; let d;
  try{d=await adminRequestDetail(id);}catch(error){if(error instanceof OperationError&&error.status===404)notFound(); throw error;}
  return <><PanelHeading title="Talep detayı" description="Talep, fiyat, dispatch ve job özeti."/><div className="space-y-4">
    <PanelCard title="Talep"><div className="flex flex-wrap gap-4 text-sm"><span><b>Müşteri:</b> {d.customer?.name||'—'}</span><span><b>Kategori:</b> {d.category?.name||'—'}</span><span><b>Durum:</b> {d.status}</span><RecordTypeBadge kind={d.customer?.is_test?'TEST':'GERÇEK'}/></div></PanelCard>
    <PanelCard title="Fiyatlar">{d.quotes.length?d.quotes.map(q=><p key={q.id} className="text-sm">v{q.version} · {q.status} · {q.total_amount} {q.currency}</p>):<EmptyPanelState>Fiyat yok.</EmptyPanelState>}</PanelCard>
    <PanelCard title="Dağıtım">{d.dispatches.length?d.dispatches.map(x=><p key={x.id} className="text-sm">{x.id.slice(0,8)} · {x.status}</p>):<EmptyPanelState>Dispatch yok.</EmptyPanelState>}</PanelCard>
    <PanelCard title="İşler">{d.jobs.length?d.jobs.map(x=><p key={x.id} className="text-sm">{x.id.slice(0,8)} · {x.status}</p>):<EmptyPanelState>Job yok.</EmptyPanelState>}</PanelCard>
    <PanelCard title="Olay geçmişi">{d.events.length?d.events.map(e=><p key={e.id} className="text-sm">{new Date(e.occurred_at).toLocaleString('tr-TR')} · {e.event_type}</p>):<EmptyPanelState>Olay yok.</EmptyPanelState>}</PanelCard>
  </div></>;
}
