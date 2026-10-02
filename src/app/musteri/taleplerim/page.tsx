import {PanelHeading,PanelTable} from '@/components/operation-panel';

export default function CustomerRequests(){
  return <><PanelHeading title="Taleplerim" description="Aktif, tamamlanan ve iptal edilen hizmet talepleriniz burada listelenecek."/>
    <PanelTable title="Hizmet talepleri" columns={['Talep','Hizmet','Durum','Oluşturulma zamanı','Fiyat']}
      empty="Henüz hizmet talebiniz bulunmuyor."/></>;
}
