import type {ReactNode} from 'react';
import {CustomerShell} from '@/components/customer-shell';
import {currentAccount} from '@/lib/account-supabase';
import {redirect} from 'next/navigation';

export default async function CustomerPanelLayout({children}:{children:ReactNode}){
  const account=await currentAccount();
  if(account?.role!=='customer')redirect('/giris');
  return <CustomerShell>{children}</CustomerShell>;
}
