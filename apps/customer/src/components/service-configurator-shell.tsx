import {ServiceBanner} from './customer-mobile-chrome';
import type {ReactNode} from 'react';

export function ServiceConfiguratorShell({title,description,children,summary,action,result}:{
  title:string;description:string;children:ReactNode;summary:ReactNode;action:ReactNode;result:ReactNode;
}){
  return <main className="w-full min-w-0 text-[#17263B]">
    <ServiceBanner title={title} description={description} image={title==='Boya'?'/service-categories/painting.jpg':title.includes('Koltuk')?'/service-categories/sofa-extraction.jpg':'/service-categories/cleaning.jpg'}/>

    <div className="grid min-w-0 gap-5">
      <div className="min-w-0 space-y-5">{children}</div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6" aria-label="Sipariş özeti ve sonuç">
        <details className="lg:hidden">
          <summary className="min-h-12 cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#082B4C] shadow-sm">Sipariş özetini göster</summary>
          <div className="mt-2">{summary}</div>
        </details>
        <div className="hidden lg:block">{summary}</div>
        {action}
        {result}
      </aside>
    </div>
  </main>;
}
