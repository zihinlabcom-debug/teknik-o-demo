export default function TechnicianLoading(){
  return <div role="status" aria-live="polite" className="space-y-4">
    <div className="h-40 animate-pulse rounded-[22px] bg-[#082B4C]/90"/>
    <div className="rounded-2xl border border-[#DEE5ED] bg-white p-4">
      <div className="h-5 w-36 animate-pulse rounded bg-slate-200"/>
      <div className="mt-5 space-y-3"><div className="h-16 animate-pulse rounded-xl bg-slate-100"/><div className="h-16 animate-pulse rounded-xl bg-slate-100"/></div>
    </div>
    <span className="sr-only">Usta ekranı yükleniyor</span>
  </div>;
}
