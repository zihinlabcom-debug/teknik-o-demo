import type {ReactNode} from 'react';
import {OperationPanelShell} from '@/components/operation-panel';

const links=[
  {href:'/usta',label:'Ana panel'},
  {href:'/usta/yeni-isler',label:'Yeni işler'},
  {href:'/usta/aktif-isler',label:'Aktif işler'},
  {href:'/usta/ek-maliyet',label:'Ek maliyet talebi'},
] as const;

export default function ProviderLayout({children}:{children:ReactNode}){
  return <OperationPanelShell area="Usta paneli" subtitle="Operasyon alanı" links={links}>{children}</OperationPanelShell>;
}
