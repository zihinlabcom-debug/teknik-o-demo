import type {ReactNode} from 'react';
import {PanelNavigation} from './panel-navigation';
const primary=[{href:'/hizmetler',label:'Ana Sayfa'},{href:'/kategoriler',label:'Hizmetler'},{href:'/musteri/taleplerim',label:'Taleplerim'},{href:'/musteri',label:'Panelim'}];
const links=[...primary,{href:'/musteri/ek-maliyet',label:'Ek maliyetler'},{href:'/musteri/sikayetler',label:'Şikâyet'},{href:'/musteri/garanti',label:'Garanti Talebi'},{href:'/iletisim',label:'İletişim'}];
export function CustomerShell({children}:{children:ReactNode}){return <PanelNavigation area="Müşteri paneli" links={links} primary={primary}>{children}</PanelNavigation>;}
