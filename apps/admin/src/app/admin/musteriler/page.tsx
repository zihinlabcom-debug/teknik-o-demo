import {PanelHeading,PanelTable} from '@/components/operation-panel';

export default function AdminCustomers(){
  return <><PanelHeading title="Müşteriler" description="Müşteri kayıtları ve hizmet kullanım bilgileri veri bağlantısından sonra listelenecek."/>
    <PanelTable title="Müşteri listesi" columns={['Müşteri','Telefon','E-posta','Şehir','İlçe','Adres','Kayıt tarihi','Hesap durumu','Toplam talep','Tamamlanan iş','Tekrar kullanım','TEST / GERÇEK']}
      empty="Henüz kayıtlı müşteri verisi bulunmuyor."/></>;
}
