import Link from 'next/link';
import {adminFinancialDetail} from '@/lib/t111-admin-read';
import {AdminFinanceSummary} from '@/components/t111-admin-finance-summary';
export const dynamic = 'force-dynamic';

import {notFound} from 'next/navigation';
import {T100AdminFinanceActions} from '@/components/t100-admin-finance-actions';
import {adminT100State} from '@/lib/t100-server';
import {T100ServiceActions} from '../../../../../../../src/components/t100-service-actions';
import {EmptyPanelState,PanelCard,PanelHeading,RecordTypeBadge} from '@/components/operation-panel';
import {adminRequestDetail,adminManualAssignmentReady,adminManualAssignmentCandidates,OperationError} from '@/lib/operation-server';
import {assessmentDetailRows} from '@/lib/service-request-assessment-display';
import {ManualAssignmentPanel} from '@/components/manual-assignment-panel';
import {Stage10OperationIntervention} from '@/components/stage10-operation-intervention';
import {adminOperationContract} from '@/lib/stage10-server';
import {assignmentSourceLabel,formatOperationDateTime,operationStatusLabel} from '@/lib/operation-presentation';

export default async function AdminRequestDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params; let d;
  let contract;try{[d,contract]=await Promise.all([adminRequestDetail(id),adminOperationContract(id)]);}catch(error){if(error instanceof OperationError&&error.status===404)notFound(); throw error;}
  const [lifecycle,finance]=await Promise.all([adminT100State(id),adminFinancialDetail(id)]);
  const assessmentRows=assessmentDetailRows(d.assessment_snapshot);
  const canManualAssign=d.status!=='technician_unavailable'&&await adminManualAssignmentReady(id);
  const candidates=canManualAssign
    ?await adminManualAssignmentCandidates(id)
    :[];
  return <><PanelHeading title="Talep detayı" description="Güncel hizmet, sorumlu usta ve finans özeti."/><div className="space-y-4">
    <PanelCard title="Talep"><div className="flex flex-wrap gap-4 text-sm"><span><b>Müşteri:</b> {d.customer?.name||'—'}</span><span><b>Kategori:</b> {d.category?.name||'—'}</span><span><b>Durum:</b> {operationStatusLabel(d.status)}</span><span><b>Operasyon:</b> {operationStatusLabel(contract.stage)}</span><span><b>Atama kaynağı:</b> {assignmentSourceLabel(contract.assignmentSource)}</span><RecordTypeBadge kind={d.customer?.is_test?'TEST':'GERÇEK'}/></div></PanelCard>
    <PanelCard title="Güncel hizmet"><p>Usta: {finance.request.technician_name??'Atama yok'}</p><p>Randevu: {formatOperationDateTime(finance.request.appointment_at)}</p><p>Operasyon: {operationStatusLabel(finance.request.operation_status)}</p><Link className="mt-3 inline-block font-bold text-[#A94D18]" href={'/admin/talepler/'+id+'/gecmis'}>Ayrıntılı operasyon geçmişi ve inceleme →</Link></PanelCard>
    <AdminFinanceSummary data={finance}/>
    <PanelCard title="Talep özeti"><p className="whitespace-pre-wrap text-sm text-slate-700">{d.problem_description||'Özet bulunmuyor.'}</p></PanelCard>
    <PanelCard title="Değerlendirme detayları">{assessmentRows.length?<dl className="space-y-2 text-sm">
      {assessmentRows.map((row,index)=><div key={`${row.label}-${index}`} className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
        <dt className="font-semibold text-slate-700">{row.label}:</dt><dd className="text-slate-900">{row.value}</dd>
      </div>)}
    </dl>:<EmptyPanelState>Yapılandırılmış değerlendirme bulunmuyor.</EmptyPanelState>}</PanelCard>
    {lifecycle.jobId&&lifecycle.finalization&&['unknown','blocked','failed'].includes(lifecycle.finalization.state)&&<T100AdminFinanceActions jobId={lifecycle.jobId} state={lifecycle.finalization.state}/>}
    {(lifecycle.completion||lifecycle.review||lifecycle.finalization)&&<T100ServiceActions role="admin" requestId={id} initialState={lifecycle}/>}
    <PanelCard title="Fiyatlar">{d.quotes.length?d.quotes.map(q=><p key={q.id} className="text-sm">v{q.version} · {operationStatusLabel(q.status)} · {q.total_amount} {q.currency}</p>):<EmptyPanelState>Fiyat yok.</EmptyPanelState>}</PanelCard>

    {canManualAssign&&<PanelCard title="Manuel usta ataması">
      <p className="mb-3 text-sm text-slate-600">
        Otomatik dağıtım tamamlandı. Uygun ustalardan birini doğrudan atayabilirsiniz.
      </p>
      <ManualAssignmentPanel requestId={id} candidates={candidates}/>
    </PanelCard>}

    <PanelCard title="Operasyon müdahalesi"><p className="mb-3 text-sm text-slate-600">Yönetim yetkisi yalnız hizmet iptali ve mevcut ustayı değiştirme işlemleriyle sınırlıdır.</p><Stage10OperationIntervention requestId={id} currentJobId={contract.currentJobId as string|null} closed={contract.terminal}/></PanelCard>

  </div></>;
}
