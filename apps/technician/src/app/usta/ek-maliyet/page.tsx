import {statusLabel,moneyLabel} from '@/lib/ui-labels';
export const dynamic='force-dynamic';
import {PanelCard,PanelHeading,EmptyPanelState} from '@/components/operation-panel';
import {TechnicianCaseForm} from '@/components/stage10-technician-forms';
import {technicianStage10Overview} from '@/lib/stage10-server';

export default async function ProviderExtraCost(){const data=await technicianStage10Overview();const active=data.jobs.filter(j=>['assigned','in_progress'].includes(j.status)).map(j=>({id:j.id,label:`İş ${j.id.slice(0,8)}`}));return <><PanelHeading title="Ek maliyet talebi" description="Randevusu oluşturulmuş açık iş için gerekçeli ek maliyet talebi oluşturun."/><div className="grid gap-4 lg:grid-cols-2"><PanelCard title="Yeni talep"><TechnicianCaseForm kind="additional_cost" items={active}/></PanelCard><PanelCard title="Talep geçmişi">{data.costs.length?data.costs.map(c=><p key={c.id} className="border-b border-slate-100 py-3 text-sm">{moneyLabel(c.requested_amount)} · {statusLabel(c.status)} · {c.reason}</p>):<EmptyPanelState>Ek maliyet talebi bulunmuyor.</EmptyPanelState>}</PanelCard></div></>}
