import type {ReactNode} from 'react';
import {CustomerShell} from '@/components/customer-shell';
import {PanelSubNav} from '@/components/operation-panel';
import {currentAccount} from '@/lib/account-supabase';
import {redirect} from 'next/navigation';

const links=[{href:'/musteri',label:'Müşteri paneli'},{href:'/musteri/taleplerim',label:'Taleplerim'}] as const;

export default async function CustomerPanelLayout({children}:{children:ReactNode}){
  const account=await currentAccount();
  if(account?.role!=='customer')redirect(account?'/'+(account.role==='admin'?'admin':'usta'):'/giris');
  return <CustomerShell><PanelSubNav links={links}/>{children}</CustomerShell>;
}
