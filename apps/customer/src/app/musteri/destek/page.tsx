import Link from 'next/link';
import {ChevronRight,FileWarning,Headphones,Mail,ShieldCheck} from 'lucide-react';
import {PanelHeading} from '@/components/operation-panel';

const supportLinks=[
  {href:'/musteri/sikayetler',title:'Şikâyetler',description:'Bir hizmetle ilgili başvuru oluştur ve geçmişini izle.',icon:FileWarning},
  {href:'/musteri/garanti',title:'Garanti',description:'Tamamlanan hizmetlerin garanti başvurularını yönet.',icon:ShieldCheck},
  {href:'/iletisim',title:'İletişim',description:'HizmetPey iletişim bilgilerine ve destek kanallarına ulaş.',icon:Mail},
] as const;

export default function SupportCenter(){
  return <><PanelHeading title="Destek Merkezi" description="İhtiyacına uygun destek başlığını seç. Müşteri–usta mesajlaşması bu merkezde sunulmaz."/>
    <div className="space-y-3">{supportLinks.map(({href,title,description,icon:Icon})=><Link key={href} href={href} className="group flex min-h-24 items-center gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(8,43,76,0.06)] transition hover:border-[#C86B32]/50">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#C86B32]/10 text-[#B85F2A]"><Icon className="size-6" aria-hidden="true"/></span>
      <span className="min-w-0 flex-1"><strong className="block text-base text-[#082B4C]">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span>
      <ChevronRight className="size-5 shrink-0 text-slate-400 transition group-hover:text-[#B85F2A]" aria-hidden="true"/>
    </Link>)}</div>
    <p className="mt-5 flex items-center gap-2 rounded-2xl bg-[#082B4C] p-4 text-xs leading-5 text-white/85"><Headphones className="size-5 shrink-0 text-[#E38245]" aria-hidden="true"/> Sürprizlere değil, hizmete yer var.</p>
  </>;
}
