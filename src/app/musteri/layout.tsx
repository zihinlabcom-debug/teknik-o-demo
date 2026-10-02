import type {ReactNode} from 'react';
import {CustomerShell} from '@/components/customer-shell';
import {PanelSubNav} from '@/components/operation-panel';

const links=[{href:'/musteri',label:'Müşteri paneli'},{href:'/musteri/taleplerim',label:'Taleplerim'}] as const;

export default function CustomerPanelLayout({children}:{children:ReactNode}){
  return <CustomerShell><PanelSubNav links={links}/>{children}</CustomerShell>;
}
