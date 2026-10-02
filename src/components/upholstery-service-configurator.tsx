'use client';

import {UPHOLSTERY_PRODUCTS,type UpholsteryKey} from '@/lib/cleaning-upholstery';
import type {ServicePricePresentation} from '@/lib/service-presentation';
import {upholsterySelectionAnswer} from './cleaning-input-selector';
import {ServiceConfiguratorShell} from './service-configurator-shell';
import {ServiceResultCard} from './service-result';

export type UpholsterySelection=Partial<Record<UpholsteryKey,number>>;

export function UpholsteryServiceConfigurator({selection,onQuantityChange,onCalculate,ready,busy,finished,
  result,onRequestTechnician,onReject,errorText}:{
  selection:UpholsterySelection;
  onQuantityChange:(key:UpholsteryKey,delta:number)=>void;
  onCalculate:(answer:string)=>void;
  ready:boolean;busy:boolean;finished:boolean;
  result:ServicePricePresentation|null;
  onRequestTechnician:()=>void;onReject:()=>void;errorText?:string|null;
}){
  const selected=UPHOLSTERY_PRODUCTS.filter(product=>(selection[product.key]??0)>0);
  const totalCount=selected.reduce((total,product)=>total+(selection[product.key]??0),0);
  const answer=upholsterySelectionAnswer(selection);
  const disabled=busy||finished;

  return <ServiceConfiguratorShell title="Koltuk / Yatak Yıkama"
    description="Yıkanacak ürünleri ve adetlerini seçin. Birden fazla ürünü aynı siparişe ekleyebilirsiniz."
    summary={<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Sipariş özeti">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[#0B1727]">Sipariş özeti</h2>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[#C6520D]">{totalCount} ürün</span>
      </div>
      {selected.length===0?<p className="mt-3 text-sm text-slate-500">Henüz ürün seçilmedi.</p>:
        <ul className="mt-3 space-y-3 text-sm text-slate-700">
          {selected.map(product=><li key={product.key} className="flex min-w-0 justify-between gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
            <span className="min-w-0 break-words font-semibold">{product.label}</span>
            <span className="shrink-0">{selection[product.key]} adet</span>
          </li>)}
        </ul>}
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm font-medium text-slate-600">
        {finished?'Değerlendirme tamamlandı.':'Henüz fiyat hesaplanmadı.'}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-600">1 oturma grubu = 2 adet 3’lü koltuk + 1 berjer. Takım ve ayrıca eklediğiniz ürünler bağımsız sipariş satırlarıdır.</p>
    </section>}
    action={<div className="min-w-0 space-y-2">
      {!answer&&<p role="status" className="text-sm font-medium text-slate-600">Sepette en az bir ürün seçin.</p>}
      {errorText&&<p role="alert" className="text-sm font-medium text-red-700">{errorText}</p>}
      <button type="button" disabled={!answer||!ready||disabled} onClick={()=>{if(answer)onCalculate(answer);}}
        className="min-h-12 w-full rounded-xl bg-[#EE6C13] px-5 py-3 text-base font-bold text-white shadow-md shadow-orange-500/15 transition-colors hover:bg-[#D85E0E] disabled:cursor-not-allowed disabled:opacity-50">
        {busy?'Hesaplanıyor…':'Fiyatı Hesapla'}
      </button>
    </div>}
    result={<ServiceResultCard result={result} onRequestTechnician={onRequestTechnician} onReject={onReject} />}>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Yıkanacak ürünler">
      <h2 className="mb-4 text-lg font-bold text-[#0B1727]">Yıkanacak ürünler</h2>
      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        {UPHOLSTERY_PRODUCTS.map(product=>{
          const quantity=selection[product.key]??0;
          return <div key={product.key} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-bold text-slate-800">{product.key==='sofa_set'?'Koltuk takımı / oturma grubu':product.label}</h3>
                <p className="text-xs text-slate-500">Birim: adet</p>
              </div>
              <div className="flex shrink-0 items-center gap-2" aria-label={`${product.label} adet seçimi`}>
                <button type="button" aria-label={`${product.label} azalt`} disabled={disabled||quantity===0}
                  onClick={()=>onQuantityChange(product.key,-1)} className="flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold disabled:opacity-40">−</button>
                <output aria-label={`${product.label} adet`} className="w-7 text-center font-bold tabular-nums">{quantity}</output>
                <button type="button" aria-label={`${product.label} artır`} disabled={disabled||quantity>=100}
                  onClick={()=>onQuantityChange(product.key,1)} className="flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold disabled:opacity-40">+</button>
              </div>
            </div>
          </div>;
        })}
      </div>
    </section>
  </ServiceConfiguratorShell>;
}
