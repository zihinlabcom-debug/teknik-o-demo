import {statusLabel,moneyLabel,eventLabel} from '@/lib/ui-labels';
export const dynamic = 'force-dynamic';

import {notFound} from 'next/navigation';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {OperationActionButton} from '@/components/operation-action-button';
import {customerRequestDetail,OperationError} from '@/lib/operation-server';
import {customerOperationContract} from '@/lib/stage10-server';

export default async function CustomerRequestDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params; let d;
  let contract;try{[d,contract]=await Promise.all([customerRequestDetail(id),customerOperationContract(id)]);}catch(error){if(error instanceof OperationError&&error.status===404)notFound(); throw error;}
  const accepted=d.quotes.find(q=>q.status==='accepted');
  const offered=d.quotes.find(q=>q.status==='offered'&&(!q.expires_at||new Date(q.expires_at)>new Date()));
  const technicianFallback=
    d.operation_status.code==='redistributing'
      ?'Yeniden atanıyor'
      :d.operation_status.code==='technician_unavailable'
        ?'Usta bulunamadı'
        :d.operation_status.code==='admin_review'
          ?'Atama bekleniyor'
          :'Henüz atanmadı';

  return <><PanelHeading title="Talep detayı" description="Talep, fiyat ve atama durumunuz."/><div className="space-y-4">
    <PanelCard title="Talep bilgileri"><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="font-bold">Hizmet</dt><dd>{d.category_name}</dd></div><div><dt className="font-bold">Durum</dt><dd>{d.operation_status.label}</dd></div><div><dt className="font-bold">Operasyon aşaması</dt><dd>{statusLabel(contract.stage)}</dd></div><div><dt className="font-bold">Randevu durumu</dt><dd>{statusLabel(contract.appointmentState)}</dd></div><div><dt className="font-bold">Oluşturulma</dt><dd>{new Date(d.created_at).toLocaleString('tr-TR')}</dd></div><div><dt className="font-bold">Adres</dt><dd>{d.address?.address_line||d.address?.label||'—'}</dd></div><div><dt className="font-bold">Usta</dt><dd>{d.technician?.name||technicianFallback}</dd></div><div><dt className="font-bold">Fiyat</dt><dd>{contract.effectiveTotal!==null?moneyLabel(contract.effectiveTotal,contract.currency):offered?moneyLabel(offered.total_amount,offered.currency):'—'}</dd></div></dl></PanelCard>
    {offered&&!accepted&&<PanelCard title="Fiyat teklifi"><p className="mb-4 text-sm">{offered.total_amount} {offered.currency}</p><OperationActionButton endpoint={`/api/operations/quotes/${offered.id}/accept`} label="Teklifi kabul et" confirmText="Bu fiyat teklifini kabul ediyor musunuz?"/></PanelCard>}
    <PanelCard title="Randevu">{d.appointments.length?d.appointments.map(a=><p key={a.id} className="text-sm">{statusLabel(a.status)} — {new Date(a.starts_at).toLocaleString('tr-TR')}</p>):<EmptyPanelState>Henüz randevu yok.</EmptyPanelState>}</PanelCard>
    <PanelCard title="Durum zaman çizelgesi">{d.events.length?d.events.map(e=><p key={e.id} className="text-sm">{new Date(e.occurred_at).toLocaleString('tr-TR')} · {eventLabel(e.event_type)}</p>):<EmptyPanelState>Henüz olay kaydı yok.</EmptyPanelState>}</PanelCard>
  </div></>;
}
