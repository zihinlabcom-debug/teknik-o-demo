import {PanelHeading,PanelTable} from '@/components/operation-panel';

export default function ProviderNewJobs(){
  return <><PanelHeading title="Yeni işler" description="Size teklif edilen işler burada yer alacak. Kabul ve red işlemleri henüz etkin değil."/>
    <PanelTable title="İş teklifleri" columns={['Hizmet','Bölge','İş tutarı','Talep zamanı','Kabul / red']}
      empty="Henüz size gösterilen yeni iş bulunmuyor."/></>;
}
