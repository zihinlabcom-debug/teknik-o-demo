import {PanelHeading,PanelTable} from '@/components/operation-panel';

export default function ProviderActiveJobs(){
  return <><PanelHeading title="Aktif işler" description="Atanan ve işlemdeki işler burada takip edilecek."/>
    <PanelTable title="Atanan / işlemde" columns={['İş','Hizmet','Bölge','Durum','Tutar']}
      empty="Henüz aktif işiniz bulunmuyor."/></>;
}
