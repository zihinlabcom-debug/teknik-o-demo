import {moneyLabel} from '@/lib/ui-labels';
export const dynamic = 'force-dynamic';

import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {OperationActionButton} from '@/components/operation-action-button';
import {technicianOffers} from '@/lib/operation-server';

export default async function ProviderNewJobs(){
  const offers=await technicianOffers();
  return <><PanelHeading title="Yeni işler" description="Size aktif olarak teklif edilen işler."/><PanelCard title="İş teklifleri">{!offers.length?<EmptyPanelState>Henüz size gösterilen yeni iş bulunmuyor.</EmptyPanelState>:<div className="space-y-3">{offers.map(o=><div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-bold">Talep {o.service_request_id.slice(0,8)}</p><p className="text-sm text-slate-600">{o.quote?moneyLabel(o.quote.total_amount,o.quote.currency):'Fiyat yok'}</p></div><OperationActionButton endpoint={`/api/operations/dispatches/${o.id}/accept`} label="İşi kabul et"/></div>)}</div>}</PanelCard></>;
}
