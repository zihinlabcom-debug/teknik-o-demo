export const dynamic = 'force-dynamic';

import {notFound} from 'next/navigation';
import {EmptyPanelState,ExtraCostPlaceholder,PanelCard,PanelHeading} from '@/components/operation-panel';
import {OperationActionButton} from '@/components/operation-action-button';
import {TechnicianAppointmentForm} from '@/components/technician-appointment-form';
import {OperationError,technicianJobDetail} from '@/lib/operation-server';

export default async function ProviderJobDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  let d;

  try{
    d=await technicianJobDetail(id);
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
    && !activeAppointment;

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
            <dd>{d.status}</dd>
          </div>

          <div>
            <dt className="font-bold">Adres</dt>
            <dd>{d.address?.address_line||d.address?.label||'—'}</dd>
          </div>

          <div>
            <dt className="font-bold">Fiyat</dt>
            <dd>{d.quote?`${d.quote.total_amount} ${d.quote.currency}`:'—'}</dd>
          </div>
        </dl>
      </PanelCard>

      <PanelCard title="Saha adımları">
        <div className="flex gap-3">

          {(d.status==='in_progress'||(d.status==='assigned'&&(requestMode==='immediate'||(requestMode==='scheduled'&&Boolean(activeAppointment)))))&&
            <OperationActionButton
              endpoint={`/api/operations/jobs/${d.id}/complete`}
              label="İşi tamamla"
              confirmText="İş tamamlandı olarak işaretlensin mi?"
            />}

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
                  {appointment.status} — {new Date(appointment.starts_at).toLocaleString('tr-TR')}
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

      <ExtraCostPlaceholder/>
    </div>
  </>;
}
