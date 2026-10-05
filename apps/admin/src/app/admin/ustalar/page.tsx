export const dynamic='force-dynamic';

import {EmptyPanelState,PanelCard,PanelHeading,RecordTypeBadge} from '@/components/operation-panel';
import {TechnicianAdminControls} from '@/components/technician-admin-controls';
import {adminTechnicianOverview} from '@/lib/technician-management';

export default async function AdminProviders(){
  const {technicians,categories,cities,districts}=await adminTechnicianOverview();
  return <><PanelHeading title="Ustalar" description="Usta onayı, aktiflik, hizmet kategorisi ve alanı yönetimi."/>
    <PanelCard title="Usta listesi">{!technicians.length?<EmptyPanelState>Henüz kayıtlı usta verisi bulunmuyor.</EmptyPanelState>
      :<div className="space-y-4">{technicians.map(technician=><section key={technician.id}
        className="rounded-xl border border-slate-200 p-4" aria-label={`${technician.name} usta kaydı`}>
        <div className="flex flex-wrap items-center gap-3"><h3 className="font-bold">{technician.name}</h3>
          <RecordTypeBadge kind={technician.is_test?'TEST':'GERÇEK'}/>
          <span className="text-sm text-slate-600">{technician.is_active?'Aktif':'Pasif'}</span>
          <span className="text-sm text-slate-600">Onay: {technician.profile?.approval_status??'Profil eksik'}</span>
          <span className="text-sm text-slate-600">{technician.profile?.is_available?'Müsait':'Müsait değil'}</span>
        </div>
        {technician.profile?.address_line&&<p className="mt-2 text-sm text-slate-700">Kayıt adresi: {cities.find(c=>c.id===technician.profile?.address_city_id)?.name??'İl'} / {districts.find(d=>d.id===technician.profile?.address_district_id)?.name??'İlçe'} — {technician.profile.address_line}</p>}
        {technician.profile?<TechnicianAdminControls technicianId={technician.id}
          approvalStatus={technician.profile.approval_status} isActive={technician.is_active}
          categories={categories} cities={cities} districts={districts}
          assignments={technician.categories} areas={technician.areas} documents={technician.documents}/>
          :<p className="mt-3 text-sm text-amber-800">Profil eksik; Stage 4 migration uygulanmalıdır.</p>}
      </section>)}</div>}</PanelCard></>;
}
