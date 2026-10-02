import {PanelHeading,PanelTable} from '@/components/operation-panel';

export default function AdminRequests(){
  return <><PanelHeading title="Talepler" description="Hizmet talepleri gerçek kayıt entegrasyonundan sonra burada izlenecek."/>
    <section aria-label="Talep filtreleri" className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      {['Durum','Kategori','TEST / GERÇEK'].map(label=><label key={label} className="min-w-0 flex-1 text-sm font-semibold sm:min-w-40">{label}
        <select disabled aria-label={label} className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-slate-500"><option>Veri bağlantısı bekleniyor</option></select>
      </label>)}
    </section>
    <PanelTable title="Talep listesi" columns={['Talep ID','Tarih','Müşteri','Kategori','Durum','Fiyat','Usta','TEST / GERÇEK']}
      empty="Henüz görüntülenecek hizmet talebi bulunmuyor."/></>;
}
