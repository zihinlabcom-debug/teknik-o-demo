export const dynamic='force-dynamic';

import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {StatusBadge,statusLabel} from '@/components/technician-ui';
import {TechnicianAvailabilityToggle} from '@/components/technician-availability-toggle';
import {ownTechnicianProfile} from '@/lib/technician-management';
import {technicianActiveJobs,technicianOffers} from '@/lib/operation-server';

const promotions=[
  {id:'protect-work',message:'Emeğinizi alın terinizi koruyoruz'},
] as const;

export default async function ProviderPanel(){
  const [details,offers,jobs]=await Promise.all([ownTechnicianProfile(),technicianOffers(),technicianActiveJobs()]);
  const profile=details.profile;
  const missingDocuments=details.categories.filter(category=>category.requiresDocument&&!category.hasVerifiedDocument);
  const canChangeAvailability=profile?.approval_status==='approved'&&details.isActive;

  return <><PanelHeading title="Ana Sayfa" description="Yeni tekliflerinizi, aktif işlerinizi ve hesap uygunluğunuzu tek ekrandan takip edin."/>
    <section aria-label="İş özeti" className="mb-4 grid grid-cols-2 gap-3">
      <Link href="/usta/yeni-isler" className="rounded-2xl bg-[#C86B32] p-4 text-white shadow-[0_8px_20px_rgba(200,107,50,0.2)]">
        <span className="text-3xl font-extrabold">{offers.length}</span><span className="mt-1 block text-xs font-bold text-white/85">Yeni iş teklifi</span>
      </Link>
      <Link href="/usta/aktif-isler" className="rounded-2xl bg-[#082B4C] p-4 text-white shadow-[0_8px_20px_rgba(8,43,76,0.18)]">
        <span className="text-3xl font-extrabold">{jobs.length}</span><span className="mt-1 block text-xs font-bold text-white/80">Aktif iş</span>
      </Link>
    </section>

    <section aria-label="Tanıtımlar" className="mb-4 min-w-0 overflow-hidden rounded-2xl">
      <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {promotions.map(promotion=><article key={promotion.id} className="relative min-h-32 w-full shrink-0 snap-start overflow-hidden rounded-2xl bg-[#082B4C] p-5 text-white shadow-[0_10px_28px_rgba(8,43,76,0.18)]">
          <span aria-hidden="true" className="absolute -right-7 -top-10 size-32 rounded-full border-[22px] border-[#C86B32]/30"/>
          <span aria-hidden="true" className="absolute -bottom-10 right-16 size-24 rounded-full bg-white/5"/>
          <p className="relative max-w-[75%] text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#F0A36D]">HizmetPey</p>
          <h2 className="relative mt-3 max-w-[78%] text-2xl font-extrabold leading-tight tracking-[-0.03em]">{promotion.message}</h2>
        </article>)}
      </div>
    </section>

    <PanelCard title="Hesap ve müsaitlik" headerAction={profile?<TechnicianAvailabilityToggle key={String(profile.is_available)} isAvailable={profile.is_available===true} disabled={!canChangeAvailability}/>:undefined}>
      {!profile?<EmptyPanelState>Usta profili henüz oluşturulmamış.</EmptyPanelState>:<div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F5F7FA] p-3">
          <div><p className="text-xs font-bold text-slate-500">Hesap onayı</p><p className="mt-1 text-sm font-extrabold text-[#082B4C]">{statusLabel(profile.approval_status)}</p></div>
          <StatusBadge value={details.isActive?'approved':'rejected'} tone={details.isActive?'success':'danger'}/>
        </div>
        <dl className="grid gap-3 text-sm">
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

    <div className="grid gap-3">
      <Link href="/usta/yeni-isler" className="flex items-center justify-between rounded-2xl border border-[#DEE5ED] bg-white p-4 text-sm font-extrabold text-[#082B4C] shadow-sm"><span>Yeni iş tekliflerini incele</span><span aria-hidden="true">→</span></Link>
      <Link href="/usta/aktif-isler" className="flex items-center justify-between rounded-2xl border border-[#DEE5ED] bg-white p-4 text-sm font-extrabold text-[#082B4C] shadow-sm"><span>Aktif işlere git</span><span aria-hidden="true">→</span></Link>
    </div>
  </>;
}
