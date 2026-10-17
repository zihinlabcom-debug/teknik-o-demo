import Link from 'next/link';
import {PanelHeading} from '@/components/operation-panel';

const items=[
  {href:'/usta/ek-maliyet',title:'Ek maliyet',description:'Açık bir iş için gerekçeli ek maliyet talebi oluşturun.'},
  {href:'/usta/sikayetler',title:'Şikâyet ve başvuru',description:'İlişkili hizmetleriniz için başvuru oluşturun ve durumunu izleyin.'},
  {href:'/usta/garanti-duzeltmeleri',title:'Garanti düzeltmeleri',description:'Size teklif edilen ücretsiz düzeltme işlerini yönetin.'},
] as const;

export default function TechnicianSupportPage(){
  return <><PanelHeading title="Destek" description="Mevcut destek, başvuru ve ek maliyet işlemlerine güvenli biçimde ulaşın."/>
    <div className="space-y-3">{items.map(item=><Link key={item.href} href={item.href} className="block rounded-2xl border border-[#DEE5ED] bg-white p-4 shadow-sm transition hover:border-[#C86B32]">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold text-[#082B4C]">{item.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p></div><span className="text-xl text-[#C86B32]" aria-hidden="true">→</span></div>
    </Link>)}</div>
    <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">Müşteri–usta sohbeti bu uygulamada bulunmuyor. İşlemlerinizi mevcut destek akışlarından sürdürebilirsiniz.</p>
  </>;
}
