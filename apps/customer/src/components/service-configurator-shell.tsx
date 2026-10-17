import type {ReactNode} from 'react';

export function ServiceConfiguratorShell({title,description,children,summary,action,result}:{
  title:string;description:string;children:ReactNode;summary:ReactNode;action:ReactNode;result:ReactNode;
}){
  return <main className="w-full min-w-0 text-[#17263B]">
    <header className="mb-6 rounded-[22px] bg-[#082B4C] p-5 text-white shadow-[0_14px_36px_rgba(8,43,76,0.16)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F0A270]">Hizmet yapılandırması</p>
      <h1 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-white sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">{description}</p>
    </header>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:items-start">
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
