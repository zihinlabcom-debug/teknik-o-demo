export default function AdminLoading(){
  return <div role="status" aria-label="Yönetim ekranı yükleniyor" className="animate-pulse space-y-5">
    <div className="space-y-3"><div className="h-3 w-36 rounded bg-slate-200"/><div className="h-8 w-64 max-w-full rounded bg-slate-200"/><div className="h-4 w-[32rem] max-w-full rounded bg-slate-100"/></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map(item=><div key={item} className="h-36 rounded-2xl border border-slate-200 bg-white shadow-sm"/>)}</div>
    <span className="sr-only">Yükleniyor…</span>
  </div>;
}
