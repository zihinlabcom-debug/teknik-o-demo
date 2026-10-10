import type {ReactNode} from 'react';

export function ServiceConfiguratorShell({title,description,children,summary,action,result}:{
  title:string;description:string;children:ReactNode;summary:ReactNode;action:ReactNode;result:ReactNode;
}){
  return <main className="w-full min-w-0">
    <header className="mb-6">
      <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </header>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:items-start">
      <div className="min-w-0 space-y-5">{children}</div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-6" aria-label="Sipariş özeti ve sonuç">
        <details className="lg:hidden">
          <summary className="min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#111827]">Sipariş özetini göster</summary>
          <div className="mt-2">{summary}</div>
        </details>
        <div className="hidden lg:block">{summary}</div>
        {action}
        {result}
      </aside>
    </div>
  </main>;
}
