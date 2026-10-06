import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';

export default function CustomerPanel(){
  return <><PanelHeading title="Müşteri paneli" description="Taleplerinizin durumunu ve son işlemlerinizi buradan takip edebileceksiniz."/>
    <div className="grid gap-4 md:grid-cols-2">
      <PanelCard title="Aktif talep"><EmptyPanelState>Henüz aktif talebiniz bulunmuyor.</EmptyPanelState></PanelCard>
      <PanelCard title="Son işlemler"><EmptyPanelState>Henüz görüntülenecek işlem bulunmuyor.</EmptyPanelState></PanelCard>
    </div>
    <Link href="/musteri/taleplerim" className="mt-6 inline-flex rounded-xl bg-[#D97724] px-4 py-2.5 text-sm font-bold text-white">Taleplerime git</Link>
  </>;
}
