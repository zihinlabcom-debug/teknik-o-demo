import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';

export default function ProviderPanel(){
  return <><PanelHeading title="Usta ana paneli" description="Yeni iş teklifleri ve aktif işleriniz için operasyon başlangıç alanı."/>
    <div className="grid gap-4 md:grid-cols-2">
      <PanelCard title="Yeni işler"><EmptyPanelState>Henüz size gösterilen yeni iş bulunmuyor.</EmptyPanelState></PanelCard>
      <PanelCard title="Aktif iş"><EmptyPanelState>Henüz aktif işiniz bulunmuyor.</EmptyPanelState></PanelCard>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href="/usta/yeni-isler" className="rounded-xl bg-[#D97724] px-4 py-2.5 text-sm font-bold text-white">Yeni işlere git</Link>
      <Link href="/usta/aktif-isler" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Aktif işlerime git</Link>
    </div>
  </>;
}
