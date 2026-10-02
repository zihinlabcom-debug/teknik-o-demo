import {EmptyPanelState,EventTimelineEmpty,FieldOutline,PanelCard,PanelHeading} from '@/components/operation-panel';

export default function CustomerRequestDetail(){
  return <><PanelHeading title="Talep detayı" description="Talep bilgileri gerçek hizmet kaydı bağlandığında burada görüntülenecek."/>
    <div className="space-y-4"><EmptyPanelState>Bu talep için görüntülenebilir bir kayıt bulunmuyor.</EmptyPanelState>
      <PanelCard title="Talep bilgileri"><FieldOutline labels={['Hizmet / kategori','Talep durumu','Oluşturulma zamanı','Fiyat','Atanan usta','Hizmet adresi']}/></PanelCard>
      <EventTimelineEmpty/>
    </div></>;
}
