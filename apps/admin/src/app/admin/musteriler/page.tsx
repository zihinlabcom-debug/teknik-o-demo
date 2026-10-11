export const dynamic='force-dynamic';

import {EmptyPanelState,PanelCard,PanelHeading,RecordTypeBadge} from '@/components/operation-panel';
import {adminCustomerOverview} from '@/lib/profile-admin';

export default async function AdminCustomers(){
  const customers=await adminCustomerOverview();
  return <><PanelHeading title="Müşteriler" description="Kayıt, profil, adres ve hizmet kullanım bilgileri."/>
    <PanelCard title="Müşteri listesi">{!customers.length?<EmptyPanelState>Henüz kayıtlı müşteri verisi bulunmuyor.</EmptyPanelState>:
      <div className="space-y-4">{customers.map(customer=><section key={customer.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {customer.avatarUrl?<img src={customer.avatarUrl} alt="" className="size-12 rounded-full object-cover"/>:
            <div className="grid size-12 place-items-center rounded-full bg-orange-100 font-black text-[#D97724]">{customer.name.slice(0,1).toLocaleUpperCase('tr-TR')}</div>}
          <div><h3 className="font-bold">{customer.name}</h3><p className="text-sm text-slate-600">{customer.phone??'Telefon yok'} · {customer.email??'E-posta yok'}</p></div>
          <RecordTypeBadge kind={customer.is_test?'TEST':'GERÇEK'}/>
          <span className="text-sm text-slate-600">{customer.is_active?'Aktif':'Pasif'}</span>
        </div>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
          {customer.addresses.map(address=><p key={address.profile_slot??address.label} className="rounded-lg bg-slate-50 p-3"><strong>{address.label??'Adres'}:</strong> {address.city??''} / {address.district??''}<br/>{address.address_line??''}</p>)}
        </div>
        <p className="mt-3 text-sm text-slate-600">Kayıt: {new Date(customer.created_at).toLocaleDateString('tr-TR')} · Toplam talep: {customer.totalRequests} · Tamamlanan: {customer.completedRequests}</p>
      </section>)}</div>}</PanelCard></>;
}
