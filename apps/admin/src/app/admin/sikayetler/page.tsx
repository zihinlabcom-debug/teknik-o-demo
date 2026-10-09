export const dynamic='force-dynamic';
import Link from 'next/link';
import {PanelHeading,PanelCard,EmptyPanelState} from '@/components/operation-panel';
import {ComplaintAdminAction,ComplaintDecisionCorrection,ComplaintInfoRequest} from '@/components/stage10-admin-actions';
import {adminStage10Overview} from '@/lib/stage10-server';
import {normalizeComplaintPage} from '@/lib/stage10-pagination';

export default async function Complaints({searchParams}:{searchParams:Promise<{openPage?:string;resolvedPage?:string}>}){
  const params=await searchParams;const openPage=normalizeComplaintPage(params.openPage),resolvedPage=normalizeComplaintPage(params.resolvedPage);
  const data=await adminStage10Overview({openPage,resolvedPage});
  const render=(items:typeof data.complaints,actions:boolean)=>items.length?items.map(c=><div key={c.id} className="border-b border-slate-100 py-4 text-sm"><p className="font-bold">Talep {c.service_request_id.slice(0,8)} · {c.applicant_role} · {c.status}</p><p className="mt-2 whitespace-pre-wrap text-slate-700">{c.description}</p>{data.evidence.filter(e=>e.complaint_id===c.id).map(e=><a key={e.id} href={`/api/admin/stage10/evidence/${e.id}`} className="mr-3 mt-2 inline-block font-bold text-[#B75D17]">{e.original_file_name}</a>)}{c.ai_category&&<p className="mt-2 text-slate-500">AI ön değerlendirme: {c.ai_category} · {c.ai_priority??'normal'}</p>}{actions?<><ComplaintInfoRequest id={c.id}/><ComplaintAdminAction id={c.id} version={c.version}/></>:<ComplaintDecisionCorrection id={c.id}/>}</div>):<EmptyPanelState>Kayıt bulunmuyor.</EmptyPanelState>;
  const pager=(kind:'open'|'resolved',page:number,hasNext:boolean)=><div className="mt-4 flex gap-2">{page>1&&<Link className="rounded-lg border px-3 py-2 text-sm font-bold" href={`/admin/sikayetler?openPage=${kind==='open'?page-1:openPage}&resolvedPage=${kind==='resolved'?page-1:resolvedPage}`}>Önceki</Link>}{hasNext&&<Link className="rounded-lg border px-3 py-2 text-sm font-bold" href={`/admin/sikayetler?openPage=${kind==='open'?page+1:openPage}&resolvedPage=${kind==='resolved'?page+1:resolvedPage}`}>Sonraki</Link>}</div>;
  return <><PanelHeading title="Şikâyet yönetimi" description="Açık başvurular en eskiden başlayarak işlenir; nihai kararı yetkili admin verir."/><div className="space-y-4"><PanelCard title="İncelenen Şikâyetler">{render(data.openComplaints,true)}{pager('open',openPage,data.complaintPagination.openHasNext)}</PanelCard><PanelCard title="Sonuçlanan Şikâyetler">{render(data.resolvedComplaints,false)}{pager('resolved',resolvedPage,data.complaintPagination.resolvedHasNext)}</PanelCard></div></>;
}
