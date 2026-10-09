import type {ReactNode} from 'react';
import {OperationPanelShell} from '@/components/operation-panel';
import {currentAccount} from '@/lib/account-supabase';
import {redirect} from 'next/navigation';
import {connection} from 'next/server';

const links=[
  {href:'/admin',label:'Operasyon özeti'},
  {href:'/admin/talepler',label:'Talepler'},
  {href:'/admin/musteriler',label:'Müşteriler'},
  {href:'/admin/ustalar',label:'Ustalar'},
  {href:'/admin/ek-maliyet',label:'Ek maliyet talepleri'},
  {href:'/admin/sikayetler',label:'Şikâyetler'},
  {href:'/admin/garanti',label:'Garanti'},
  {href:'/admin/pilot-kpi',label:'Pilot / KPI'},
  {href:'/admin/kategoriler',label:'Kategori yönetimi'},
  {href:'/admin/ayarlar',label:'Sistem ayarları'},
  {href:'/admin/talep-havuzu',label:'Talep havuzu'},
  {href:'/admin/ik-havuzu',label:'İK havuzu'},
] as const;

export default async function AdminLayout({children}:{children:ReactNode}){
  await connection();
  const account=await currentAccount();
  if(account?.role!=='admin')redirect('/giris-admin');
  return <OperationPanelShell area="Yönetim paneli" subtitle="Veri entegrasyonu bekleniyor" links={links} isTest={account.is_test}>{children}</OperationPanelShell>;
}
