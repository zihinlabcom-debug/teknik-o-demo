import {EmptyPanelState,ExtraCostPlaceholder,FieldOutline,PanelCard,PanelHeading} from '@/components/operation-panel';

export default function ProviderJobDetail(){
  return <><PanelHeading title="İş detayı" description="İş bilgileri ve saha adımları gerçek kayıt bağlandığında burada görünecek."/>
    <div className="space-y-4"><EmptyPanelState>Bu iş için görüntülenebilir bir kayıt bulunmuyor.</EmptyPanelState>
      <PanelCard title="Müşteri ve hizmet"><FieldOutline labels={['Müşteri','Hizmet','Hizmet adresi','Fiyat','Durum','Kabul zamanı']}/></PanelCard>
      <PanelCard title="Saha adımları"><p className="text-sm text-slate-600">İş başlatma ve tamamlama aksiyonları henüz etkin değil.</p></PanelCard>
      <ExtraCostPlaceholder/>
    </div></>;
}
