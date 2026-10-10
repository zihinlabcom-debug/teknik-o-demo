import {statusLabel,moneyLabel} from '@/lib/ui-labels';
export const dynamic = 'force-dynamic';

import {notFound} from 'next/navigation';
import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {OperationActionButton} from '@/components/operation-action-button';
import {TechnicianAppointmentForm} from '@/components/technician-appointment-form';
import {OperationError,technicianJobDetail} from '@/lib/operation-server';
import {technicianOperationContract} from '@/lib/stage10-server';

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

  const activeAppointment=d.appointments.find(
    appointment=>appointment.status==='scheduled'||appointment.status==='confirmed'
  );

  const requestMode=d.request?.requested_service_mode;
  const requestedDate=d.request?.requested_service_date??null;

  const canCreateAppointment=
    d.status==='assigned'
    && !activeAppointment
    && !d.appointment_scheduling_expired;

  const scheduledCompletionReady=
    requestMode==='scheduled'
    && Boolean(activeAppointment)
    && d.scheduled_service_date_reached;

  const canComplete=
    (d.status==='in_progress'&&(requestMode!=='scheduled'||scheduledCompletionReady))
    ||(
      d.status==='assigned'
      &&(
        (requestMode==='immediate'&&!d.appointment_scheduling_expired)
        ||scheduledCompletionReady
      )
    );

  return <>
    <PanelHeading
      title="İş detayı"
      description="Atandığınız işin operasyon bilgileri."
    />

    <div className="space-y-4">
      <PanelCard title="Müşteri ve hizmet">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="font-bold">Hizmet</dt>
            <dd>{d.category?.name||'Hizmet'}</dd>
          </div>

          <div>
            <dt className="font-bold">Durum</dt>
            <dd>{d.request?.status==='technician_unavailable'?'Usta bulunamadı':d.appointment_scheduling_expired?'Randevu süresi doldu':statusLabel(d.status)}</dd>
          </div>
          <div><dt className="font-bold">Operasyon aşaması</dt><dd>{statusLabel(contract.stage)}</dd></div>

          <div>
            <dt className="font-bold">Adres</dt>
            <dd>{d.address?.address_line||d.address?.label||'—'}</dd>
          </div>

          <div>
            <dt className="font-bold">Fiyat</dt>
            <dd>{contract.effectiveTotal!==null?moneyLabel(contract.effectiveTotal,contract.currency):'—'}</dd>
          </div>
        </dl>
      </PanelCard>

      <PanelCard title="Saha adımları">
        <div className="flex flex-wrap gap-3">
          {canComplete&&
            <OperationActionButton
              endpoint={`/api/operations/jobs/${d.id}/complete`}
              label="İşi tamamla"
              confirmText="İş tamamlandı olarak işaretlensin mi?"
            />}

          {d.status==='assigned'&&d.appointment_scheduling_expired&&
            <p role="status" className="text-sm font-semibold text-amber-800">
              Randevu belirleme süresi doldu. Bu iş için artık işlem yapılamaz.
            </p>}

          {d.status==='assigned'
            && requestMode==='scheduled'
            && Boolean(activeAppointment)
            && !d.scheduled_service_date_reached
            && <p role="status" className="text-sm text-slate-600">
              İş, müşterinin seçtiği hizmet tarihinden önce tamamlanamaz.
            </p>}

          {['completed','cancelled'].includes(d.status)&&
            <p className="text-sm text-slate-600">
              Bu iş kapanmıştır.
            </p>}
        </div>
      </PanelCard>

      <PanelCard title="Randevu">
        <div className="space-y-4">
          {d.appointments.length
            ?<div className="space-y-2">
              {d.appointments.map(appointment=>
                <p key={appointment.id} className="text-sm">
                  {statusLabel(appointment.status)} — {new Date(appointment.starts_at).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
            :<EmptyPanelState>Henüz randevu yok.</EmptyPanelState>}

          {canCreateAppointment
            && requestMode==='scheduled'
            && requestedDate
            && <TechnicianAppointmentForm
              jobId={d.id}
              mode="scheduled"
              requestedDate={requestedDate}
              assignedAt={d.assigned_at}
            />}

          {canCreateAppointment
            && requestMode==='immediate'
            && <TechnicianAppointmentForm
              jobId={d.id}
              mode="immediate"
              requestedDate={null}
              assignedAt={d.assigned_at}
            />}

          {canCreateAppointment
            && requestMode==='scheduled'
            && !requestedDate
            && <p role="alert" className="text-sm font-semibold text-red-700">
              Müşterinin seçtiği hizmet tarihi bulunamadığı için randevu oluşturulamaz.
            </p>}
        </div>
      </PanelCard>

      <PanelCard title="Ek maliyet talebi"><p className="mb-3 text-sm text-slate-600">Randevu oluşturulduktan sonra, hizmet kapanmadan önce gerekçeli talep oluşturabilirsiniz.</p><Link href="/usta/ek-maliyet" className="inline-flex rounded-xl bg-[#B95236] px-4 py-2.5 text-sm font-bold text-white">Ek maliyet talebine git</Link></PanelCard>
    </div>
  </>;
}
