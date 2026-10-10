import {statusLabel} from '@/lib/ui-labels';
export const dynamic='force-dynamic';

import Link from 'next/link';
import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';
import {TechnicianAvailabilityToggle} from '@/components/technician-availability-toggle';
import {TechnicianDocumentUpload} from '@/components/technician-document-upload';
import {ownTechnicianProfile} from '@/lib/technician-management';

export default async function ProviderPanel(){
  const details=await ownTechnicianProfile();
  const profile=details.profile;
  return <><PanelHeading title="Usta ana paneli" description="Yeni iş teklifleri ve aktif işleriniz için operasyon başlangıç alanı."/>
    <PanelCard title="Usta profilim">
      {!profile?<EmptyPanelState>Usta profili henüz oluşturulmamış.</EmptyPanelState>:<div className="space-y-2 text-sm">
        <p>Onay durumu: <strong>{statusLabel(profile.approval_status)}</strong></p>
        <p>Hesap: <strong>{details.isActive?'Aktif':'Pasif'}</strong></p>
        <p>Müsaitlik: <strong>{profile.is_available?'Açık':'Kapalı'}</strong></p>
        <p>Kategoriler: {details.categories.length?details.categories.map(category=>`${category.name} (${statusLabel(category.status)})`).join(', '):'Henüz atanmadı'}</p>
        <p>Hizmet alanları: {details.areas.length?details.areas.join(', '):'Henüz atanmadı'}</p>
        {details.categories.filter(category=>category.requiresDocument&&!category.hasVerifiedDocument&&!category.hasSubmittedDocument).map(category=><p key={category.id} className="rounded-lg bg-amber-50 p-2 text-amber-900">
          {category.name} hizmetinde onaylanabilmeniz için mesleki yeterlilik belgenizi en kısa sürede yükleyiniz.
        </p>)}
        {details.categories.filter(category=>category.requiresDocument&&!category.hasVerifiedDocument&&category.hasSubmittedDocument).map(category=><p key={category.id} className="rounded-lg bg-amber-50 p-2 text-amber-900">
          {category.name} belgeniz inceleniyor. Kategori onayı tamamlanana kadar bu alanda iş alamazsınız.
        </p>)}
        {details.documents.map(document=><p key={document.id}>Belge: <a className="underline" href={`/api/technician/documents/${document.id}`} target="_blank" rel="noopener noreferrer">{document.original_file_name??'Belgeyi aç'}</a> ({statusLabel(document.status)})</p>)}
        <TechnicianDocumentUpload categories={details.categories.map(category=>({id:category.id,name:category.name}))}/>
        {profile.approval_status==='approved'&&details.isActive
          ?<TechnicianAvailabilityToggle isAvailable={profile.is_available}/>
          :<p className="text-amber-800">Müsaitlik yalnız onaylı ve aktif ustalarda açılabilir.</p>}
      </div>}
    </PanelCard>
    <div className="grid gap-4 md:grid-cols-2">
      <PanelCard title="Yeni işler"><EmptyPanelState>Henüz size gösterilen yeni iş bulunmuyor.</EmptyPanelState></PanelCard>
      <PanelCard title="Aktif iş"><EmptyPanelState>Henüz aktif işiniz bulunmuyor.</EmptyPanelState></PanelCard>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href="/usta/yeni-isler" className="rounded-xl bg-[#B95236] px-4 py-2.5 text-sm font-bold text-white">Yeni işlere git</Link>
      <Link href="/usta/aktif-isler" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Aktif işlerime git</Link>
    </div>
  </>;
}
