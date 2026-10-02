import type {ReactNode} from 'react';
import {OperationPanelShell} from '@/components/operation-panel';

const links=[
  {href:'/admin',label:'Operasyon özeti'},
  {href:'/admin/talepler',label:'Talepler'},
  {href:'/admin/musteriler',label:'Müşteriler'},
  {href:'/admin/ustalar',label:'Ustalar'},
  {href:'/admin/ek-maliyet',label:'Ek maliyet talepleri'},
  {href:'/admin/pilot-kpi',label:'Pilot / KPI'},
  {href:'/admin/kategoriler',label:'Kategori yönetimi'},
  {href:'/admin/ayarlar',label:'Sistem ayarları'},
  {href:'/admin/talep-havuzu',label:'Talep havuzu'},
  {href:'/admin/ik-havuzu',label:'İK havuzu'},
] as const;

export default function AdminLayout({children}:{children:ReactNode}){
  return <OperationPanelShell area="Yönetim paneli" subtitle="Veri entegrasyonu bekleniyor" links={links}>{children}</OperationPanelShell>;
}
