'use client';

import {CARPET_PRODUCTS,type CarpetKey} from '@/lib/cleaning-carpet';
import type {ServicePricePresentation} from '@/lib/service-presentation';
import {MinimumOrderNotice,ServiceResultCard} from './service-result';
import {ServiceConfiguratorShell} from './service-configurator-shell';
import {carpetSelectionAnswer,carpetSelectionMissing,type CarpetSelection} from './cleaning-carpet-input-selector';

const groups=[
  {name:'Halılar',products:CARPET_PRODUCTS.slice(0,10)},
  {name:'Perdeler',products:CARPET_PRODUCTS.slice(10,12)},
  {name:'Yorgan / Battaniye',products:CARPET_PRODUCTS.slice(12)},
];

export function CarpetServiceConfigurator({selection,onQuantityChange,onAreaChange,onCalculate,ready,busy,finished,
  result,onRequestTechnician,onReject,errorText,minimumOrderMessage}:{
  selection:CarpetSelection;
  onQuantityChange:(key:CarpetKey,delta:number)=>void;
  onAreaChange:(key:CarpetKey,index:number,value:string)=>void;
  onCalculate:(answer:string)=>void;
  ready:boolean;busy:boolean;finished:boolean;
  result:ServicePricePresentation|null;minimumOrderMessage?:string|null;
  onRequestTechnician:()=>void;onReject:()=>void;errorText?:string|null;
}){
  const missing=carpetSelectionMissing(selection);
  const answer=missing?null:carpetSelectionAnswer(selection);
  const selected=CARPET_PRODUCTS.filter(product=>(selection[product.key]?.quantity??0)>0);
  const totalCount=selected.reduce((total,product)=>total+(selection[product.key]?.quantity??0),0);
  const disabled=busy||finished;

  return <ServiceConfiguratorShell title="Halı, Perde ve Ev Tekstili Yıkama"
    description="Ürünleri ve adetlerini seçin. Halı ve perdelerin her biri için ayrı m² ölçüsü girin."
    summary={<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Sipariş özeti">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#111827]">Sipariş özeti</h2>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#C6520D]">{totalCount} ürün</span>
      </div>
      {selected.length===0?<p className="mt-3 text-sm text-slate-500">Henüz ürün seçilmedi.</p>:
        <ul className="mt-3 space-y-3 text-sm text-slate-700">
          {selected.map(product=>{
            const item=selection[product.key]!;
            return <li key={product.key} className="min-w-0 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
              <div className="flex min-w-0 justify-between gap-3"><span className="min-w-0 break-words font-semibold">{product.label}</span><span className="shrink-0">{item.quantity} adet</span></div>
              {product.unit==='m2'&&<div className="mt-1 break-words text-xs text-slate-500">
                {item.areas.map((area,index)=><span key={index} className="mr-2 inline-block">{index+1}. ürün: {area.trim()?`${area.trim()} m²`:'m² bekleniyor'}</span>)}
              </div>}
            </li>;
          })}
        </ul>}
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm font-medium text-slate-600">
        {finished?'Değerlendirme tamamlandı.':'Henüz fiyat hesaplanmadı.'}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-600">Ürünler en geç 24 saat içinde teslim/alım sürecine alınır. Geri teslim yoğunluğa göre değişebilir; en fazla 7 gün sürer.</p>
    </section>}
    action={<div className="min-w-0 space-y-2">
      {missing&&<p role="status" className="text-sm font-medium text-slate-600">{missing}</p>}
      {errorText&&<p role="alert" className="text-sm font-medium text-red-700">{errorText}</p>}
      <button type="button" disabled={!answer||!ready||disabled} onClick={()=>{if(answer)onCalculate(answer);}}
        className="min-h-12 w-full rounded-xl bg-[#EE6C13] px-5 py-3 text-base font-bold text-white shadow-md shadow-orange-500/15 transition-colors hover:bg-[#D85E0E] disabled:cursor-not-allowed disabled:opacity-50">
        {busy?'Hesaplanıyor…':'Fiyatı Hesapla'}
      </button>
    </div>}
    result={<><MinimumOrderNotice message={minimumOrderMessage??null} />
      <ServiceResultCard result={result} onRequestTechnician={onRequestTechnician} onReject={onReject} /></>}>
    {groups.map(group=><section key={group.name} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={group.name}>
      <h2 className="mb-4 text-lg font-bold text-[#111827]">{group.name}</h2>
      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        {group.products.map(product=>{
          const item=selection[product.key]??{quantity:0,areas:[]};
          return <div key={product.key} className="min-w-0 rounded-xl border border-slate-200 bg-[#F8F6F3] p-3">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-bold text-slate-800">{product.label}</h3>
                <p className="text-xs text-slate-500">Birim: {product.unit==='m2'?'m²':'adet'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2" aria-label={`${product.label} adet seçimi`}>
                <button type="button" aria-label={`${product.label} azalt`} disabled={disabled||item.quantity===0}
                  onClick={()=>onQuantityChange(product.key,-1)} className="flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold disabled:opacity-40">−</button>
                <output aria-label={`${product.label} adet`} className="w-7 text-center font-bold tabular-nums">{item.quantity}</output>
                <button type="button" aria-label={`${product.label} artır`} disabled={disabled||item.quantity>=100}
                  onClick={()=>onQuantityChange(product.key,1)} className="flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold disabled:opacity-40">+</button>
              </div>
            </div>
            {product.unit==='m2'&&item.areas.length>0&&<div className="mt-3 grid min-w-0 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2">
              {item.areas.map((area,index)=><label key={index} className="min-w-0 text-xs font-semibold text-slate-700">
                <span className="mb-1 block">{group.name==='Perdeler'?'Perde':'Halı'} {index+1} ölçüsü</span>
                <span className="flex min-w-0 items-center rounded-lg border border-slate-300 bg-white focus-within:border-[#EE6C13]">
                  <input type="text" inputMode="decimal" aria-label={`${product.label} ${index+1}. ürün m²`}
                    value={area} disabled={disabled} onChange={event=>onAreaChange(product.key,index,event.target.value)}
                    className="min-h-11 w-full min-w-0 rounded-l-lg bg-transparent px-3 text-base font-normal text-slate-900 outline-none" placeholder="Örn. 4,2" />
                  <span className="shrink-0 pr-3 text-sm text-slate-500">m²</span>
                </span>
              </label>)}
            </div>}
          </div>;
        })}
      </div>
    </section>)}
  </ServiceConfiguratorShell>;
}
