import type {ReactNode} from 'react';
import {OperationPanelShell} from '@/components/operation-panel';
import {currentAccount} from '@/lib/account-supabase';
import {redirect} from 'next/navigation';

export default async function ProviderLayout({children}:{children:ReactNode}){
  const account=await currentAccount();
  if(account?.role!=='technician')redirect('/giris-usta');
  return <OperationPanelShell isTest={account.is_test}>{children}</OperationPanelShell>;
}
