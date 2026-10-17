export const dynamic='force-dynamic';

import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {OperationActionButton} from '@/components/operation-action-button';
import {formatMoney,StatusBadge} from '@/components/technician-ui';
import {technicianOffers} from '@/lib/operation-server';

export default async function ProviderNewJobs(){
  const offers=await technicianOffers();
  return <><PanelHeading title="Yeni işler" description="Size teklif edilen işleri ve doğrulanmış ücret bilgisini inceleyin."/>
    <PanelCard title={`İş teklifleri (${offers.length})`}>
      {!offers.length?<EmptyPanelState>Şu anda size gösterilen yeni iş bulunmuyor. Yeni teklifler geldiğinde bu bölümde görünecek.</EmptyPanelState>:<div className="space-y-3">
        {offers.map(offer=><article key={offer.id} className="rounded-2xl border border-[#DEE5ED] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C86B32]">Yeni teklif</p><h3 className="mt-1 truncate text-lg font-extrabold text-[#082B4C]">Talep {offer.service_request_id.slice(0,8)}</h3></div><StatusBadge value="offered"/></div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-[#F5F7FA] p-3"><dt className="text-xs text-slate-500">Teklif ücreti</dt><dd className="mt-1 font-extrabold text-[#082B4C]">{offer.quote?formatMoney(offer.quote.total_amount,offer.quote.currency):'Fiyat bilgisi yok'}</dd></div>
            <div className="rounded-xl bg-[#F5F7FA] p-3"><dt className="text-xs text-slate-500">Talep zamanı</dt><dd className="mt-1 font-bold text-[#082B4C]">{offer.request?.created_at?new Date(offer.request.created_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'}):'—'}</dd></div>
          </dl>
          <div className="mt-4"><OperationActionButton endpoint={`/api/operations/dispatches/${offer.id}/accept`} label="İşi kabul et" confirmText="Bu iş teklifini kabul etmek istediğinize emin misiniz?"/></div>
        </article>)}
      </div>}
    </PanelCard>
  </>;
}
