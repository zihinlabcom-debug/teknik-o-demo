'use client';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {CustomerMobileHeader,CustomerBottomNavigation} from './customer-mobile-chrome';

export function CustomerShell({children}:{children:ReactNode}){
 const path=usePathname();
 const supportChild=['/musteri/garanti','/musteri/sikayetler','/musteri/ek-maliyet','/iletisim'].includes(path);
 return <div className="min-h-dvh bg-[#E7ECF2] font-sans text-[#17263B]">
  <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-[#F7F9FC] shadow-xl md:max-w-none lg:pl-64">
   <CustomerMobileHeader backHref={supportChild?'/musteri/destek':'/hizmetler'} responsive/>
   <main className="min-w-0 px-3.5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-8 lg:pb-8 lg:pt-8">{children}</main>
   <CustomerBottomNavigation responsive/>
  </div>
 </div>;
}
