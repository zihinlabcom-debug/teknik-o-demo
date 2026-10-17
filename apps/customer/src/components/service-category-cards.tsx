import {Flame,Paintbrush,Home,Truck,Sofa,RectangleHorizontal} from 'lucide-react';
import {ACTIVE_SERVICE_CATEGORIES,type ServiceCategory} from '../lib/service-categories';
const icons={boiler:Flame,painting:Paintbrush,cleaning:Home,moving:Truck,sofa_cleaning:Sofa,carpet_cleaning:RectangleHorizontal};
export function ServiceCategoryCards({onSelect,selected}:{onSelect:(category:ServiceCategory)=>void;selected?:ServiceCategory|null}){
  return <div className="grid grid-cols-3 gap-1.5">{ACTIVE_SERVICE_CATEGORIES.map(item=>{
    const Icon=icons[item.id];const unavailable=item.id==='moving';return <button key={item.id} type="button" disabled={unavailable} onClick={()=>onSelect(item.id)}
      aria-pressed={selected===item.id}
      className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-all hover:border-[#C86B32]/50 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-65 ${selected===item.id?'ring-2 ring-[#C86B32]/30':''}`}>
      <div className="flex size-8 items-center justify-center rounded-xl bg-[#C86B32]/10 text-[#B85F2A]"><Icon className="size-4" /></div>
      <span className="w-full truncate text-center text-[10px] font-bold">{item.label}</span>{unavailable&&<span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Yakında</span>}
    </button>;
  })}</div>;
}
