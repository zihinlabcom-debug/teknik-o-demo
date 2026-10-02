import {EmptyPanelState,EventTimelineEmpty,FieldOutline,PanelCard,PanelHeading} from '@/components/operation-panel';

export default function AdminRequestDetail(){
  return <><PanelHeading title="Talep detayı" description="Operasyon bilgileri gerçek bir talep kaydı bağlandığında görüntülenecek."/>
    <div className="space-y-4"><EmptyPanelState>Bu talep için görüntülenebilir bir kayıt bulunmuyor.</EmptyPanelState>
      <PanelCard title="Talep ve atama"><FieldOutline labels={['Müşteri','Hizmet','Fiyat','Adres','Usta','Durum']}/></PanelCard>
      <PanelCard title="Operasyon notu"><EmptyPanelState>Henüz operasyon notu bulunmuyor.</EmptyPanelState></PanelCard>
      <EventTimelineEmpty/>
      <PanelCard title="Ek maliyet"><EmptyPanelState>Henüz ek maliyet talebi bulunmuyor.</EmptyPanelState></PanelCard>
    </div></>;
}
