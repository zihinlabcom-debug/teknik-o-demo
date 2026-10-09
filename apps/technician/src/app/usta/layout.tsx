import type {ReactNode} from 'react';
import {OperationPanelShell} from '@/components/operation-panel';
import {currentAccount} from '@/lib/account-supabase';
import {redirect} from 'next/navigation';

const links=[
  {href:'/usta',label:'Ana panel'},
  {href:'/usta/yeni-isler',label:'Yeni işler'},
  {href:'/usta/aktif-isler',label:'Aktif işler'},
  {href:'/usta/ek-maliyet',label:'Ek maliyet talebi'},
  {href:'/usta/sikayetler',label:'Şikâyet'},
  {href:'/usta/garanti-duzeltmeleri',label:'Garanti düzeltmeleri'},
] as const;

export default async function ProviderLayout({children}:{children:ReactNode}){
  const account=await currentAccount();
  if(account?.role!=='technician')redirect('/giris-usta');
  return <OperationPanelShell area="Usta paneli" subtitle="Operasyon alanı" links={links} isTest={account.is_test}>{children}</OperationPanelShell>;
}
