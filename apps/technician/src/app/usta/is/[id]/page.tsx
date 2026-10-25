export const dynamic='force-dynamic';

import {notFound} from 'next/navigation';
import Link from 'next/link';
import {technicianT100State} from '@/lib/t100-server';
import {T100ServiceActions} from '@/components/t100-service-actions';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {OperationActionButton} from '@/components/operation-action-button';
import {TechnicianAppointmentForm} from '@/components/technician-appointment-form';
import {formatMoney,MetaItem,StatusBadge,statusLabel} from '@/components/technician-ui';
import {OperationError,technicianJobDetail} from '@/lib/operation-server';
import {technicianOperationContract} from '@/lib/stage10-server';

type TimelineEvent={at:string;label:string;detail:string};

export default async function ProviderJobDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  let d;
  let contract;

  try{
    d=await technicianJobDetail(id);
    contract=await technicianOperationContract(d.service_request_id);
  }catch(error){
    if(error instanceof OperationError&&error.status===404)notFound();
    throw error;
  }

  const lifecycle=await technicianT100State(d.service_request_id);
  const activeAppointment=d.appointments.find(appointment=>appointment.status==='scheduled'||appointment.status==='confirmed');
  const requestMode=d.request?.requested_service_mode;
  const requestedDate=d.request?.requested_service_date??null;
  const canCreateAppointment=d.status==='assigned'&&!activeAppointment&&!d.appointment_scheduling_expired;
  const scheduledCompletionReady=requestMode==='scheduled'&&Boolean(activeAppointment)&&d.scheduled_service_date_reached;
  const canComplete=(d.status==='in_progress'&&(requestMode!=='scheduled'||scheduledCompletionReady))||(d.status==='assigned'&&((requestMode==='immediate'&&!d.appointment_scheduling_expired)||scheduledCompletionReady));
  const timeline:TimelineEvent[]=[
    ...(d.assigned_at?[{at:d.assigned_at,label:'İş atandı',detail:'İş usta hesabınıza atandı.'}]:[]),
    ...d.appointments.map(appointment=>({at:appointment.starts_at,label:'Randevu',detail:statusLabel(appointment.status)})),
    ...(d.started_at?[{at:d.started_at,label:'İş başladı',detail:'Saha işlemi başlatıldı.'}]:[]),
    ...(d.completed_at?[{at:d.completed_at,label:'İş tamamlandı',detail:'Tamamlama işlemi kaydedildi.'}]:[]),
    ...(d.cancelled_at?[{at:d.cancelled_at,label:'İş iptal edildi',detail:'İptal işlemi kaydedildi.'}]:[]),
  ].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));

  return <><PanelHeading title="İş detayı" description="Atandığınız işin hizmet, randevu, ücret ve saha adımlarını yönetin."/>
    <PanelCard title="Müşteri ve hizmet">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">İş {d.id.slice(0,8)}</p><p className="mt-1 text-lg font-extrabold text-[#082B4C]">{d.category?.name||'Hizmet'}</p></div><StatusBadge value={d.request?.status==='technician_unavailable'?'cancelled':d.appointment_scheduling_expired?'cancelled':d.status}/></div>
      <dl className="grid grid-cols-2 gap-2">
        <MetaItem label="Durum">{d.request?.status==='technician_unavailable'?'Usta bulunamadı':d.appointment_scheduling_expired?'Randevu süresi doldu':statusLabel(d.status)}</MetaItem>
        <MetaItem label="Operasyon">{statusLabel(contract.stage)}</MetaItem>
        <MetaItem label="Ücret">{contract.effectiveTotal!==null?formatMoney(contract.effectiveTotal,contract.currency):'—'}</MetaItem>
        <MetaItem label="Hizmet tipi">{requestMode==='scheduled'?'Planlı hizmet':requestMode==='immediate'?'Hemen hizmet':'—'}</MetaItem>
        <div className="col-span-2"><MetaItem label="Adres">{d.address?.address_line||d.address?.label||'Adres bilgisi yok'}</MetaItem></div>
      </dl>
    </PanelCard>

    <PanelCard title="Saha adımları">
      <div className="grid gap-3">
        {canComplete&&!lifecycle.completion&&!lifecycle.finalization&&<OperationActionButton endpoint={`/api/operations/jobs/${d.id}/complete`} label="İşi Tamamladım" confirmText="Müşteriye tamamlanma bildirimi gönderilsin mi? Müşteri onayı veya bir saatlik yanıt süresi beklenecek."/>}
        {d.status==='assigned'&&d.appointment_scheduling_expired&&<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Randevu belirleme süresi doldu. Bu iş için artık işlem yapılamaz.</p>}
        {d.status==='assigned'&&requestMode==='scheduled'&&Boolean(activeAppointment)&&!d.scheduled_service_date_reached&&<p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">İş, müşterinin seçtiği hizmet tarihinden önce başlatılamaz veya tamamlanamaz.</p>}
        {['completed','cancelled'].includes(d.status)&&<p className="rounded-xl bg-[#F5F7FA] p-3 text-sm text-slate-600">Bu iş kapanmıştır.</p>}
      </div>
    </PanelCard>

    <PanelCard title="Randevu">
      <div className="space-y-4">
        {d.appointments.length?<div className="space-y-2">{d.appointments.map(appointment=><div key={appointment.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F7FA] p-3 text-sm"><span>{new Date(appointment.starts_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'})}</span><StatusBadge value={appointment.status}/></div>)}</div>:<EmptyPanelState>Henüz randevu bulunmuyor.</EmptyPanelState>}
        {canCreateAppointment&&requestMode==='scheduled'&&requestedDate&&<TechnicianAppointmentForm jobId={d.id} mode="scheduled" requestedDate={requestedDate} assignedAt={d.assigned_at}/>}
        {canCreateAppointment&&requestMode==='immediate'&&<TechnicianAppointmentForm jobId={d.id} mode="immediate" requestedDate={null} assignedAt={d.assigned_at}/>}
        {canCreateAppointment&&requestMode==='scheduled'&&!requestedDate&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">Müşterinin seçtiği hizmet tarihi bulunamadığı için randevu oluşturulamaz.</p>}
      </div>
    </PanelCard>

    <PanelCard title="İşlem geçmişi">
      {!timeline.length?<EmptyPanelState>Henüz işlem kaydı bulunmuyor.</EmptyPanelState>:<ol className="space-y-4">{timeline.map((event,index)=><li key={`${event.at}-${event.label}`} className="relative pl-8"><span className="absolute left-0 top-1 grid size-5 place-items-center rounded-full bg-[#C86B32] text-[10px] font-bold text-white">{index+1}</span>{index<timeline.length-1&&<span className="absolute bottom-[-18px] left-[9px] top-6 w-px bg-[#D8E1EB]"/>}<p className="text-sm font-extrabold text-[#082B4C]">{event.label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{new Date(event.at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'})} · {event.detail}</p></li>)}</ol>}
    </PanelCard>

    <T100ServiceActions key={JSON.stringify(lifecycle)} role="technician" requestId={d.service_request_id} jobId={id} initialState={lifecycle}/>
    <PanelCard title="Ek maliyet talebi"><p className="mb-3 text-sm leading-6 text-slate-600">Randevu oluşturulduktan sonra, hizmet kapanmadan önce gerekçeli talep oluşturabilirsiniz.</p><Link href="/usta/ek-maliyet" className="inline-flex w-full items-center justify-center rounded-xl bg-[#C86B32] px-4 py-3 text-sm font-bold text-white">Ek maliyet talebine git</Link></PanelCard>
  </>;
}
