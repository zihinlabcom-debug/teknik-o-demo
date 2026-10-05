import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';

const kpis=[
  'Toplam hizmet talebi','Tamamlanan işler','Talep → tamamlanma oranı','Benzersiz müşteri',
  'Tekrar kullanan müşteri oranı','Ortalama sipariş tutarı','GMV','Teknik-O geliri',
  'İş başı Teknik-O geliri','İş başı katkı kârı','Usta kabul oranı','Ortalama usta kabul süresi',
  'Usta tamamlanma oranı','Ortalama iş tamamlanma süresi','İptal oranı',
  'Ek maliyet talep oranı','Kategori bazında talep / işlem hacmi',
] as const;

export default function AdminPilotKpi(){
  return <><PanelHeading title="Pilot / KPI" description="Pilot dönem metrikleri yalnız gerçek operasyon verileri bağlandığında hesaplanacak."/>
    <div className="mb-5"><EmptyPanelState>Pilot verileri toplandığında burada görüntülenecek.</EmptyPanelState></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{kpis.map(kpi=><PanelCard key={kpi} title={kpi}>
      <p className="text-sm text-slate-500">Veri entegrasyonu bekleniyor</p>
    </PanelCard>)}</div>
  </>;
}
