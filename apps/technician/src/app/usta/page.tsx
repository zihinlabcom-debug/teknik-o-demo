export const dynamic='force-dynamic';

import Link from 'next/link';
import {EmptyPanelState,PanelCard} from '@/components/operation-panel';
import {StatusBadge,statusLabel,TechnicianPageHero} from '@/components/technician-ui';
import {TechnicianAvailabilityToggle} from '@/components/technician-availability-toggle';
import {ownTechnicianProfile} from '@/lib/technician-management';
import {technicianActiveJobs,technicianOffers} from '@/lib/operation-server';

export default async function ProviderPanel(){
  const [details,offers,jobs]=await Promise.all([ownTechnicianProfile(),technicianOffers(),technicianActiveJobs()]);
  const profile=details.profile;
  const missingDocuments=details.categories.filter(category=>category.requiresDocument&&!category.hasVerifiedDocument);
  const canChangeAvailability=profile?.approval_status==='approved'&&details.isActive;

  return <><TechnicianPageHero eyebrow="HİZMETPEY" title="Ustanın hakkı, emeğin güvencesi." description="Büyük bir özveriyle, gece gündüz demeden çalışan ustalarımızın haklarını korumayı en büyük sorumluluğumuz biliyoruz. Alın terinin ve nitelikli iş gücünün her zaman yanındayız."/>
    <section aria-label="İş özeti" className="mb-4 grid grid-cols-2 gap-3 md:mb-0">
      <Link href="/usta/yeni-isler" className="rounded-2xl bg-[#C86B32] p-4 text-white shadow-[0_8px_20px_rgba(200,107,50,0.2)]">
        <span className="text-3xl font-extrabold">{offers.length}</span><span className="mt-1 block text-xs font-bold text-white/85">Yeni iş teklifi</span>
      </Link>
      <Link href="/usta/aktif-isler" className="rounded-2xl bg-[#082B4C] p-4 text-white shadow-[0_8px_20px_rgba(8,43,76,0.18)]">
        <span className="text-3xl font-extrabold">{jobs.length}</span><span className="mt-1 block text-xs font-bold text-white/80">Aktif iş</span>
      </Link>
    </section>

    <div className="md:mt-5 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
    <PanelCard title="Hesap ve müsaitlik" headerAction={profile?<TechnicianAvailabilityToggle key={String(profile.is_available)} isAvailable={profile.is_available===true} disabled={!canChangeAvailability}/>:undefined}>
      {!profile?<EmptyPanelState>Usta profili henüz oluşturulmamış.</EmptyPanelState>:<div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F5F7FA] p-3">
          <div><p className="text-xs font-bold text-slate-500">Hesap onayı</p><p className="mt-1 text-sm font-extrabold text-[#082B4C]">{statusLabel(profile.approval_status)}</p></div>
          <StatusBadge value={details.isActive?'approved':'rejected'} tone={details.isActive?'success':'danger'}/>
        </div>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="font-bold text-[#082B4C]">Hizmet kategorileri</dt><dd className="mt-1 leading-6 text-slate-600">{details.categories.length?details.categories.map(category=>`${category.name} (${statusLabel(category.status)})`).join(', '):'Henüz atanmadı'}</dd></div>
          <div><dt className="font-bold text-[#082B4C]">Hizmet alanları</dt><dd className="mt-1 leading-6 text-slate-600">{details.areas.length?details.areas.join(', '):'Henüz atanmadı'}</dd></div>
        </dl>
        {missingDocuments.map(category=><p key={category.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {category.name} belgeniz {category.hasSubmittedDocument?'incelemede':'henüz yüklenmedi'}. Onay tamamlanana kadar bu kategoride iş alamazsınız.
        </p>)}
        {details.documents.length>0&&<div className="space-y-2">{details.documents.map(document=><p key={document.id} className="rounded-xl bg-[#F5F7FA] p-3 text-sm"><a className="font-bold text-[#082B4C] underline" href={`/api/technician/documents/${document.id}`} target="_blank" rel="noopener noreferrer">{document.original_file_name??'Belgeyi aç'}</a><span className="text-slate-500"> · {statusLabel(document.status)}</span></p>)}</div>}
        {!canChangeAvailability&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Müsaitlik yalnız onaylı ve aktif ustalarda değiştirilebilir.</p>}
      </div>}
    </PanelCard>

    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
      <Link href="/usta/yeni-isler" className="flex items-center justify-between rounded-2xl border border-[#DEE5ED] bg-white p-4 text-sm font-extrabold text-[#082B4C] shadow-sm"><span>Yeni iş tekliflerini incele</span><span aria-hidden="true">→</span></Link>
      <Link href="/usta/aktif-isler" className="flex items-center justify-between rounded-2xl border border-[#DEE5ED] bg-white p-4 text-sm font-extrabold text-[#082B4C] shadow-sm"><span>Aktif işlere git</span><span aria-hidden="true">→</span></Link>
    </div>
    </div>
  </>;
}
