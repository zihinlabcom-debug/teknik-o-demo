import {PanelHeading,PanelTable} from '@/components/operation-panel';

export default function AdminExtraCosts(){
  return <><PanelHeading title="Ek maliyet talepleri" description="Ek maliyet inceleme kuyruğu ileride buradan yönetilecek; karar verme henüz etkin değil."/>
    <PanelTable title="İnceleme kuyruğu" columns={['İş / talep','Usta','Gerekçe','İstenen fark','Fotoğraf kanıtı','Durum']}
      empty="Henüz incelemeyi bekleyen ek maliyet talebi bulunmuyor."/></>;
}
