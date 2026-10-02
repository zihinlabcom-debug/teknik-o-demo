import {EmptyPanelState,PanelCard,PanelHeading} from '@/components/operation-panel';

export default function AdminSettings(){
  return <><PanelHeading title="Sistem ayarları" description="Operasyon kuralları için ayrılan alan; mevcut fiyat ve hizmet kuralları bu ekrandan değiştirilemez."/>
    <div className="grid gap-4 md:grid-cols-2">{['Operasyon ayarları','Minimum ücretler','Bölge ayarları','Diğer platform kuralları'].map(title=><PanelCard key={title} title={title}>
      <EmptyPanelState>Bu ayar alanı henüz etkin değil.</EmptyPanelState>
    </PanelCard>)}</div>
  </>;
}
