import type {ReactNode} from 'react';
import {OperationPanelShell} from '@/components/operation-panel';
import {currentAccount} from '@/lib/account-supabase';
import {redirect} from 'next/navigation';
import {connection} from 'next/server';

const links=[
  {href:'/admin',label:'Operasyon özeti',group:'Genel'},
  {href:'/admin/pilot-kpi',label:'Pilot / KPI',group:'Genel'},
  {href:'/admin/talepler',label:'Talepler',group:'Operasyon'},
  {href:'/admin/ek-maliyet',label:'Ek maliyet talepleri',group:'Operasyon'},
  {href:'/admin/sikayetler',label:'Şikâyetler',group:'Operasyon'},
  {href:'/admin/garanti',label:'Garanti',group:'Operasyon'},
  {href:'/admin/musteriler',label:'Müşteriler',group:'Kullanıcılar'},
  {href:'/admin/ustalar',label:'Ustalar',group:'Kullanıcılar'},
  {href:'/admin/ik-havuzu',label:'İK havuzu',group:'Kullanıcılar'},
  {href:'/admin/kategoriler',label:'Kategori yönetimi',group:'Yapılandırma'},
  {href:'/admin/talep-havuzu',label:'Talep havuzu',group:'Yapılandırma'},
  {href:'/admin/ayarlar',label:'Sistem ayarları',group:'Yapılandırma'},
] as const;

export default async function AdminLayout({children}:{children:ReactNode}){
  await connection();
  const account=await currentAccount();
  if(account?.role!=='admin')redirect('/giris-admin');
  return <OperationPanelShell area="Yönetim paneli" subtitle="Veri entegrasyonu bekleniyor" links={links} isTest={account.is_test}>{children}</OperationPanelShell>;
}
