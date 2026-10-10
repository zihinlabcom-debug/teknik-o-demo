import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';

const cards=[
  {title:'Açık talepler',href:'/admin/talepler'},
  {title:'Eşleşme bekleyen',href:'/admin/talepler'},
  {title:'Aktif işler',href:'/admin/talepler'},
  {title:'Tamamlanan işler',href:'/admin/talepler'},
] as const;

export default function AdminPanel(){
  return <><PanelHeading title="Operasyon özeti" description="Gerçek talepler, iş atamaları ve pilot ölçümleri veri entegrasyonu tamamlandığında burada görünecek."/>
    <p role="note" className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">Veri entegrasyonu bekleniyor. Bu sayfada örnek kayıt veya hesaplanmış metrik gösterilmiyor.</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=><PanelCard key={card.title} title={card.title}>
      <EmptyPanelState>Henüz görüntülenecek operasyon verisi bulunmuyor.</EmptyPanelState>
      <Link href={card.href} className="mt-3 inline-block text-sm font-bold text-[#B75D17]">Taleplere git →</Link>
    </PanelCard>)}</div>
  </>;
}
