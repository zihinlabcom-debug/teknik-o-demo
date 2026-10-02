import {PanelHeading,PanelTable} from '@/components/operation-panel';

export default function AdminCategories(){
  return <><PanelHeading title="Kategori yönetimi" description="Kategori durumu ve pilot kapsamı ileride bu alandan yönetilecek. Mevcut kategori kuralları burada değiştirilmez."/>
    <PanelTable title="Kategori kayıtları" columns={['Kategori adı','Aktif / pasif','Pilot / test durumu']}
      empty="Kategori yönetimi için veri bağlantısı henüz etkin değil."/></>;
}
