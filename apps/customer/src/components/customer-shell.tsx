'use client';
import type {ReactNode} from 'react';
import {CustomerMobileHeader,CustomerBottomNavigation} from './customer-mobile-chrome';
export function CustomerShell({children}:{children:ReactNode}){return <div className="min-h-dvh bg-[#E7ECF2] font-sans text-[#17263B]"><div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-[#F7F9FC] shadow-xl"><CustomerMobileHeader backHref="/hizmetler"/><main className="min-w-0 px-3.5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">{children}</main><CustomerBottomNavigation/></div></div>;}
