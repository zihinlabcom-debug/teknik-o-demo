import {BellOff} from 'lucide-react';
import {PanelHeading} from '@/components/operation-panel';

export default function NotificationsPage(){
  return <><PanelHeading title="Bildirimler" description="Talep ve hesap hareketlerinin bildirim merkezi."/>
    <section className="rounded-[22px] border border-slate-200 bg-white p-6 text-center shadow-[0_10px_28px_rgba(8,43,76,0.06)]">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500"><BellOff className="size-7" aria-hidden="true"/></span>
      <h2 className="mt-4 text-lg font-bold text-[#082B4C]">Bildirim merkezi kullanılamıyor</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Bildirim altyapısı henüz devrede değil. Bu ekranda gerçek bildirim veya okunma işlemi gösterilmez.</p>
    </section>
  </>;
}
