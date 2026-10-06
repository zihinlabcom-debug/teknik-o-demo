import {EmptyPanelState,ExtraCostPlaceholder,PanelHeading} from '@/components/operation-panel';

export default function ProviderExtraCost(){
  return <><PanelHeading title="Ek maliyet talebi" description="İşle ilişkili ek maliyet gerekçesi ve kanıtı için ayrılan alan."/>
    <div className="space-y-4"><EmptyPanelState>Ek maliyet talebi oluşturulabilecek aktif iş bulunmuyor.</EmptyPanelState><ExtraCostPlaceholder/></div></>;
}
