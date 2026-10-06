import {Flame,Paintbrush,Home,Truck,Sofa,RectangleHorizontal} from 'lucide-react';
import {ACTIVE_SERVICE_CATEGORIES,type ServiceCategory} from '../lib/service-categories';
const icons={boiler:Flame,painting:Paintbrush,cleaning:Home,moving:Truck,sofa_cleaning:Sofa,carpet_cleaning:RectangleHorizontal};
export function ServiceCategoryCards({onSelect,selected}:{onSelect:(category:ServiceCategory)=>void;selected?:ServiceCategory|null}){
  return <div className="grid grid-cols-3 gap-1.5">{ACTIVE_SERVICE_CATEGORIES.map(item=>{
    const Icon=icons[item.id];return <button key={item.id} type="button" onClick={()=>onSelect(item.id)}
      aria-pressed={selected===item.id}
      className={`bg-white border border-slate-100 rounded-xl p-2 flex flex-col items-center gap-1.5 shadow-sm hover:border-orange-300 transition-all text-slate-700 active:scale-95 ${selected===item.id?'ring-1 ring-orange-300':''}`}>
      <div className="w-6 h-6 text-[#EE6C13] flex items-center justify-center"><Icon className="w-5 h-5" /></div>
      <span className="text-[9px] font-semibold text-center truncate w-full">{item.label}</span>
    </button>;
  })}</div>;
}
