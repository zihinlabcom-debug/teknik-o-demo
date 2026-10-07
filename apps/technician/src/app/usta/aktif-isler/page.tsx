export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {technicianActiveJobs} from '@/lib/operation-server';

export default async function ProviderActiveJobs(){
  const jobs=await technicianActiveJobs();
  return <><PanelHeading title="Aktif işler" description="Atanan ve işlemdeki işleriniz."/><PanelCard title="Atanan / işlemde">{!jobs.length?<EmptyPanelState>Henüz aktif işiniz bulunmuyor.</EmptyPanelState>:<div className="space-y-3">{jobs.map(j=><Link key={j.id} href={`/usta/is/${j.id}`} className="block rounded-xl border p-4 hover:border-orange-400"><p className="font-bold">İş {j.id.slice(0,8)}</p><p className="text-sm text-slate-600">{j.appointment_scheduling_expired?'Randevu süresi doldu':j.status} Â· {j.quote?`${j.quote.total_amount} ${j.quote.currency}`:'—'}</p></Link>)}</div>}</PanelCard></>;
}