export const dynamic='force-dynamic';

import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {StatusBadge} from '@/components/technician-ui';
import {TechnicianCaseForm} from '@/components/stage10-technician-forms';
import {technicianStage10Overview} from '@/lib/stage10-server';

export default async function TechnicianComplaints(){
  const data=await technicianStage10Overview();
  const requests=[...new Map(data.jobs.map(job=>[job.service_request_id,{id:job.service_request_id,label:`Talep ${job.service_request_id.slice(0,8)}`}])).values()];
  return <><PanelHeading title="Şikâyet ve başvuru" description="İlişkili olduğunuz bir hizmet için başvuru oluşturun ve durumunu izleyin."/>
    <PanelCard title="Yeni başvuru"><TechnicianCaseForm kind="complaint" items={requests}/></PanelCard>
    <PanelCard title="Başvuru geçmişi">{data.complaints.length?<div className="space-y-3">{data.complaints.map(complaint=><article key={complaint.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#DEE5ED] p-3"><div><p className="font-extrabold text-[#082B4C]">Talep {complaint.service_request_id.slice(0,8)}</p><p className="mt-1 text-xs text-slate-500">Destek başvurusu</p></div><StatusBadge value={complaint.status}/></article>)}</div>:<EmptyPanelState>Henüz şikâyet başvurunuz bulunmuyor.</EmptyPanelState>}</PanelCard>
  </>;
}
