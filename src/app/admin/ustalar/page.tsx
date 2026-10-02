import {PanelHeading,PanelTable} from '@/components/operation-panel';

export default function AdminProviders(){
  return <><PanelHeading title="Ustalar" description="Usta uygunluğu ve iş performansı gerçek kayıtlar bağlandığında izlenecek."/>
    <PanelTable title="Usta listesi" columns={['Usta','Kategori','Bölge','Aktif / müsait','Gösterilen iş','Kabul edilen','Tamamlanan','TEST / GERÇEK']}
      empty="Henüz kayıtlı usta verisi bulunmuyor."/></>;
}
