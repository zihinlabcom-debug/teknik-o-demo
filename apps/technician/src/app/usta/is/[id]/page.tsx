export const dynamic = 'force-dynamic';

import {notFound} from 'next/navigation';
import {EmptyPanelState,ExtraCostPlaceholder,PanelCard,PanelHeading} from '@/components/operation-panel';
import {OperationActionButton} from '@/components/operation-action-button';
import {OperationError,technicianJobDetail} from '@/lib/operation-server';

export default async function ProviderJobDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params; let d;
  try{d=await technicianJobDetail(id);}catch(error){if(error instanceof OperationError&&error.status===404)notFound(); throw error;}
  return <><PanelHeading title="İş detayı" description="Atandığınız işin operasyon bilgileri."/><div className="space-y-4">
    <PanelCard title="Müşteri ve hizmet"><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="font-bold">Hizmet</dt><dd>{d.category?.name||'Hizmet'}</dd></div><div><dt className="font-bold">Durum</dt><dd>{d.status}</dd></div><div><dt className="font-bold">Adres</dt><dd>{d.address?.address_line||d.address?.label||'—'}</dd></div><div><dt className="font-bold">Fiyat</dt><dd>{d.quote?`${d.quote.total_amount} ${d.quote.currency}`:'—'}</dd></div></dl></PanelCard>
    <PanelCard title="Saha adımları"><div className="flex gap-3">{d.status==='assigned'&&<OperationActionButton endpoint={`/api/operations/jobs/${d.id}/start`} label="İşi başlat"/>}{d.status==='in_progress'&&<OperationActionButton endpoint={`/api/operations/jobs/${d.id}/complete`} label="İşi tamamla" confirmText="İş tamamlandı olarak işaretlensin mi?"/>}{['completed','cancelled'].includes(d.status)&&<p className="text-sm text-slate-600">Bu iş kapanmıştır.</p>}</div></PanelCard>
    <PanelCard title="Randevu">{d.appointments.length?d.appointments.map(a=><p key={a.id} className="text-sm">{a.status} — {new Date(a.starts_at).toLocaleString('tr-TR')}</p>):<EmptyPanelState>Henüz randevu yok.</EmptyPanelState>}</PanelCard><ExtraCostPlaceholder/>
  </div></>;
}
