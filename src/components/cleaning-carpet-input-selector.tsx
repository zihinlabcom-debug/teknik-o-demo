'use client';

import {useState} from 'react';
import {CARPET_PRODUCTS,type CarpetKey} from '@/lib/cleaning-carpet';

export type CarpetSelection=Partial<Record<CarpetKey,{areas:string[];quantity:number}>>;
export function changeCarpetQuantity(selection:CarpetSelection,key:CarpetKey,delta:number):CarpetSelection {
  const product=CARPET_PRODUCTS.find(item=>item.key===key)!;
  const current=selection[key]??{areas:[],quantity:0};
  const quantity=Math.max(0,Math.min(100,current.quantity+delta));
  return {...selection,[key]:{quantity,areas:product.unit==='m2'?
    quantity>current.quantity?[...current.areas,'']:current.areas.slice(0,quantity):[]}};
}
export function setCarpetArea(selection:CarpetSelection,key:CarpetKey,index:number,value:string):CarpetSelection {
  const current=selection[key];
  if(!current||index<0||index>=current.areas.length)return selection;
  const areas=[...current.areas];areas[index]=value;
  return {...selection,[key]:{...current,areas}};
}
export function carpetSelectionMissing(selection:CarpetSelection):string|null {
  const selected=CARPET_PRODUCTS.filter(product=>(selection[product.key]?.quantity??0)>0);
  if(!selected.length)return 'Sepette en az bir ürün seçin.';
  for(const product of selected){
    if(product.unit!=='m2')continue;
    const item=selection[product.key]!;
    for(let index=0;index<item.quantity;index++){
      const text=item.areas[index]?.trim()??'';
      const area=/^\d+(?:[.,]\d+)?$/.test(text)?Number(text.replace(',','.')):NaN;
      if(!Number.isFinite(area)||area<=0)return `${product.label} — ${index+1}. ürünün m² bilgisi gerekli.`;
    }
  }
  return null;
}
export function carpetSelectionAnswer(selection:CarpetSelection):string|null {
  if(carpetSelectionMissing(selection))return null;
  return CARPET_PRODUCTS.filter(product=>(selection[product.key]?.quantity??0)>0).map(product=>{
    const item=selection[product.key]!;
    return `${product.label}: ${product.unit==='m2'?
      item.areas.map(area=>`${Number(area.replace(',','.'))} m²`).join(' + '):
      `${item.quantity} adet`}`;
  }).join('; ');
}

export function CleaningCarpetInputSelector({disabled,onContinue}:{disabled:boolean;onContinue:(answer:string)=>void}){
  const [selection,setSelection]=useState<CarpetSelection>({});
  const missing=carpetSelectionMissing(selection),answer=carpetSelectionAnswer(selection);
  const groups=[
    {name:'Halı',products:CARPET_PRODUCTS.slice(0,10)},
    {name:'Perde',products:CARPET_PRODUCTS.slice(10,12)},
    {name:'Yorgan / Battaniye',products:CARPET_PRODUCTS.slice(12)},
  ];
  return <div className="mt-3 min-w-0 space-y-4 rounded-2xl border border-orange-200 bg-orange-50/60 p-3 sm:p-4" aria-label="Halı, perde ve ev tekstili seçimi">
    {groups.map(group=><section key={group.name}>
      <h3 className="mb-2 text-sm font-bold text-slate-900">{group.name}</h3>
      <div className="grid min-w-0 gap-2 lg:grid-cols-2">
        {group.products.map(product=>{
          const item=selection[product.key]??{quantity:0,areas:[]};
          return <div key={product.key} className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words text-sm font-semibold text-slate-800">{product.label}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" aria-label={`${product.label} azalt`} disabled={disabled||!item.quantity}
                  onClick={()=>setSelection(current=>changeCarpetQuantity(current,product.key,-1))}
                  className="flex size-11 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold disabled:opacity-40">−</button>
                <output aria-label={`${product.label} adet`} className="w-6 text-center text-base font-bold tabular-nums">{item.quantity}</output>
                <button type="button" aria-label={`${product.label} artır`} disabled={disabled||item.quantity>=100}
                  onClick={()=>setSelection(current=>changeCarpetQuantity(current,product.key,1))}
                  className="flex size-11 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold">+</button>
              </div>
            </div>
            {product.unit==='m2'&&item.areas.map((area,index)=>{
              const number=Number(area.replace(',','.'));
              return <label key={index} className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                <span>{group.name==='Perde'?'Perde':'Halı'} {index+1} m²</span>
                <input type="text" inputMode="decimal" aria-label={`${product.label} ${index+1}. ürün m²`}
                  value={area} disabled={disabled} onChange={event=>setSelection(current=>setCarpetArea(current,product.key,index,event.target.value))}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-base focus:border-[#EE6C13] focus:outline-none" placeholder="Örn. 4,2" />
                {Number.isFinite(number)&&number>0&&<span>Fiyatlandırılan {Math.ceil(number)} m²</span>}
              </label>;
            })}
          </div>;
        })}
      </div>
    </section>)}
    <p className="text-xs leading-5 text-slate-600">Ürünler en geç 24 saat içinde teslim/alım sürecine alınır. Geri teslim yoğunluğa göre değişebilir; en fazla 7 gün sürer.</p>
    {missing&&<p role="status" className="text-xs font-semibold text-slate-700">{missing}</p>}
    {answer&&<p className="break-words text-xs text-slate-700">Sepet: {answer}</p>}
    <button type="button" disabled={disabled||!answer} onClick={()=>{if(answer)onContinue(answer);}}
      className="min-h-11 w-full rounded-xl bg-[#EE6C13] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">Devam Et</button>
  </div>;
}
