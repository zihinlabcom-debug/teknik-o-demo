export const dynamic = 'force-dynamic';

import {notFound} from 'next/navigation';
import {EmptyPanelState,PanelCard,PanelHeading,RecordTypeBadge} from '@/components/operation-panel';
import {adminRequestDetail,OperationError} from '@/lib/operation-server';
import {assessmentDetailRows} from '@/lib/service-request-assessment-display';

function exclusionReason(reason:string){
  if(reason==='appointment_timeout')return 'Randevu süresi doldu';
  if(reason==='declined')return 'Teklifi reddetti';
  return reason;
}

export default async function AdminRequestDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params; let d;
  try{d=await adminRequestDetail(id);}catch(error){if(error instanceof OperationError&&error.status===404)notFound(); throw error;}
  const assessmentRows=assessmentDetailRows(d.assessment_snapshot);
  return <><PanelHeading title="Talep detayı" description="Talep, fiyat, dağıtım döngüsü ve gerçek iş özeti."/><div className="space-y-4">
    <PanelCard title="Talep"><div className="flex flex-wrap gap-4 text-sm"><span><b>Müşteri:</b> {d.customer?.name||'—'}</span><span><b>Kategori:</b> {d.category?.name||'—'}</span><span><b>Durum:</b> {d.status}</span><RecordTypeBadge kind={d.customer?.is_test?'TEST':'GERÇEK'}/></div></PanelCard>
    <PanelCard title="Talep özeti"><p className="whitespace-pre-wrap text-sm text-slate-700">{d.problem_description||'Özet bulunmuyor.'}</p></PanelCard>
    <PanelCard title="Değerlendirme detayları">{assessmentRows.length?<dl className="space-y-2 text-sm">
      {assessmentRows.map((row,index)=><div key={`${row.label}-${index}`} className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
        <dt className="font-semibold text-slate-700">{row.label}:</dt><dd className="text-slate-900">{row.value}</dd>
      </div>)}
    </dl>:<EmptyPanelState>Yapılandırılmış değerlendirme bulunmuyor.</EmptyPanelState>}</PanelCard>
    <PanelCard title="Fiyatlar">{d.quotes.length?d.quotes.map(q=><p key={q.id} className="text-sm">v{q.version} Â· {q.status} Â· {q.total_amount} {q.currency}</p>):<EmptyPanelState>Fiyat yok.</EmptyPanelState>}</PanelCard>

    <PanelCard title="Dağıtım döngüleri">{d.cycles.length?<div className="space-y-3">{d.cycles.map(c=><div key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
      <p><b>{c.id.slice(0,8)}</b> Â· {c.status} Â· Tur {c.current_round}/3</p>
      <p className="mt-1 text-slate-600">Başlangıç: {new Date(c.started_at).toLocaleString('tr-TR')}</p>
      {c.next_round_at&&<p className="text-slate-600">Sonraki tur: {new Date(c.next_round_at).toLocaleString('tr-TR')}</p>}
      {c.source_job_id&&<p className="text-slate-600">Yeniden dağıtım kaynağı iş: {c.source_job_id.slice(0,8)}</p>}
    </div>)}</div>:<EmptyPanelState>Dağıtım döngüsü yok.</EmptyPanelState>}</PanelCard>

    <PanelCard title="Dağıtım">{d.dispatches.length?<div className="space-y-2">{d.dispatches.map(x=><p key={x.id} className="text-sm">{x.id.slice(0,8)} Â· {x.round_no?`Tur ${x.round_no} Â· `:''}{x.status}{x.expires_at?` Â· Son: ${new Date(x.expires_at).toLocaleString('tr-TR')}`:''}</p>)}</div>:<EmptyPanelState>Dispatch yok.</EmptyPanelState>}</PanelCard>

    <PanelCard title="İşler ve randevular">{d.jobs.length?<div className="space-y-3">{d.jobs.map(x=><div key={x.id} className="rounded-xl border border-slate-200 p-3 text-sm">
      <p><b>{x.id.slice(0,8)}</b> Â· {x.status} Â· {x.technician?.name||x.technician_id?.slice(0,8)||'Usta yok'}</p>
      {x.appointments.length?<div className="mt-2 space-y-1 text-slate-600">{x.appointments.map(a=><p key={a.id}>Randevu: {a.status} Â· {new Date(a.starts_at).toLocaleString('tr-TR')}</p>)}</div>:<p className="mt-2 text-slate-500">Randevu yok.</p>}
    </div>)}</div>:<EmptyPanelState>Job yok.</EmptyPanelState>}</PanelCard>

    <PanelCard title="Dışlanan ustalar">{d.exclusions.length?<div className="space-y-2">{d.exclusions.map(x=><p key={`${x.technician_id}-${x.created_at}`} className="text-sm">{x.technician?.name||x.technician_id.slice(0,8)} Â· {exclusionReason(x.reason)} Â· {new Date(x.created_at).toLocaleString('tr-TR')}</p>)}</div>:<EmptyPanelState>Dışlanan usta yok.</EmptyPanelState>}</PanelCard>

    <PanelCard title="Olay geçmişi">{d.events.length?d.events.map(e=><p key={e.id} className="text-sm">{new Date(e.occurred_at).toLocaleString('tr-TR')} Â· {e.event_type}</p>):<EmptyPanelState>Olay yok.</EmptyPanelState>}</PanelCard>
  </div></>;
}