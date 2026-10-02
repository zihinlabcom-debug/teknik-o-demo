'use client';

import {advanceApartmentCleaning} from '@/lib/cleaning-apartment';
import type {ServicePricePresentation} from '@/lib/service-presentation';
import {ServiceConfiguratorShell} from './service-configurator-shell';
import {ServiceResultCard} from './service-result';

export interface ApartmentSelection {
  floors:string;
  apartments:string;
  glass:string|null;
  elevator:boolean|null;
  materialsAvailable:boolean|null;
}
export const EMPTY_APARTMENT_SELECTION:ApartmentSelection={
  floors:'',apartments:'',glass:null,elevator:null,materialsAvailable:null,
};

// Read the accepted answer labels from the existing apartment motor.
const glassOptions=advanceApartmentCleaning('',{step:'glass',fields:{},answered:2}).options;
function validWhole(value:string,min:number,max:number){
  return /^\d+$/.test(value.trim())&&Number.isSafeInteger(Number(value))&&
    Number(value)>=min&&Number(value)<=max;
}
export function apartmentSelectionAnswers(selection:ApartmentSelection):string[]|null{
  if(!validWhole(selection.floors,1,1000)||!validWhole(selection.apartments,1,100000)||
    !selection.glass||!glassOptions.includes(selection.glass)||
    selection.elevator===null||selection.materialsAvailable===null)return null;
  return [selection.floors.trim(),selection.apartments.trim(),selection.glass,
    selection.elevator?'Evet':'Hayır',selection.materialsAvailable?'Evet':'Hayır'];
}

export function ApartmentServiceConfigurator({selection,onChange,onCalculate,ready,busy,finished,fieldsLocked=false,
  result,onRequestTechnician,onReject,errorText}:{
  selection:ApartmentSelection;
  onChange:(next:ApartmentSelection)=>void;
  onCalculate:(answers:string[])=>void;
  ready:boolean;busy:boolean;finished:boolean;fieldsLocked?:boolean;
  result:ServicePricePresentation|null;
  onRequestTechnician:()=>void;onReject:()=>void;errorText?:string|null;
}){
  const answers=apartmentSelectionAnswers(selection);
  const disabled=busy||finished;
  const inputDisabled=disabled||fieldsLocked;
  const set=<K extends keyof ApartmentSelection>(key:K,value:ApartmentSelection[K])=>onChange({...selection,[key]:value});
  const yesNo=(key:'elevator'|'materialsAvailable',value:boolean,label:string)=>
    <button type="button" aria-label={`${label}: ${value?'Evet':'Hayır'}`} aria-pressed={selection[key]===value}
      disabled={inputDisabled} onClick={()=>set(key,value)}
      className={`min-h-11 min-w-20 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${selection[key]===value?
        'border-[#EE6C13] bg-[#EE6C13] text-white':'border-slate-300 bg-white text-slate-800 hover:border-orange-400'}`}>
      {value?'Evet':'Hayır'}
    </button>;

  return <ServiceConfiguratorShell title="Apartman Temizliği"
    description="Apartman bilgilerini doldurun. Fiyat, tüm alanlar tamamlandıktan sonra mevcut hizmet motorunda hesaplanır."
    summary={<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Hizmet özeti">
      <h2 className="text-base font-bold text-[#0B1727]">Hizmet özeti</h2>
      <dl className="mt-3 space-y-3 text-sm text-slate-700">
        {[
          ['Kat sayısı',selection.floors||'—'],['Daire sayısı',selection.apartments||'—'],
          ['Cam tipi',selection.glass||'—'],['Asansör temizliği',selection.elevator===null?'—':selection.elevator?'Evet':'Hayır'],
          ['Yeterli temizlik malzemesi',selection.materialsAvailable===null?'—':selection.materialsAvailable?'Evet':'Hayır'],
        ].map(([label,value])=><div key={label} className="flex min-w-0 justify-between gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
          <dt className="min-w-0 break-words">{label}</dt><dd className="shrink-0 font-semibold">{value}</dd>
        </div>)}
      </dl>
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm font-medium text-slate-600">
        {finished?'Değerlendirme tamamlandı.':'Henüz fiyat hesaplanmadı.'}
      </p>
    </section>}
    action={<div className="min-w-0 space-y-2">
      {!answers&&<p role="status" className="text-sm font-medium text-slate-600">Fiyat için beş alanın tamamını doldurun.</p>}
      {errorText&&<p role="alert" className="text-sm font-medium text-red-700">{errorText}</p>}
      <button type="button" disabled={!answers||!ready||disabled} onClick={()=>{if(answers)onCalculate(answers);}}
        className="min-h-12 w-full rounded-xl bg-[#EE6C13] px-5 py-3 text-base font-bold text-white shadow-md shadow-orange-500/15 transition-colors hover:bg-[#D85E0E] disabled:cursor-not-allowed disabled:opacity-50">
        {busy?'Hesaplanıyor…':'Fiyatı Hesapla'}
      </button>
    </div>}
    result={<ServiceResultCard result={result} onRequestTechnician={onRequestTechnician} onReject={onReject} />}>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Apartman bilgileri">
      <h2 className="mb-4 text-lg font-bold text-[#0B1727]">Apartman bilgileri</h2>
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-semibold text-slate-800">
          <span className="mb-2 block">Apartman kaç katlı?</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" aria-label="Apartman kaç katlı?"
            value={selection.floors} onChange={event=>set('floors',event.target.value)} disabled={inputDisabled}
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none focus:border-[#EE6C13]" placeholder="Örn. 5" />
          <span className="mt-1 block text-xs font-normal text-slate-500">1–1000 kat</span>
        </label>
        <label className="min-w-0 text-sm font-semibold text-slate-800">
          <span className="mb-2 block">Toplam kaç daire var?</span>
          <input type="text" inputMode="numeric" pattern="[0-9]*" aria-label="Toplam kaç daire var?"
            value={selection.apartments} onChange={event=>set('apartments',event.target.value)} disabled={inputDisabled}
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none focus:border-[#EE6C13]" placeholder="Örn. 10" />
          <span className="mt-1 block text-xs font-normal text-slate-500">1–100000 daire</span>
        </label>
        <fieldset className="min-w-0 sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold text-slate-800">Her kattaki cam tipi nedir?</legend>
          <div className="flex min-w-0 flex-wrap gap-2" aria-label="Cam tipi seçenekleri">
            {glassOptions.map(option=><button key={option} type="button" aria-pressed={selection.glass===option}
              disabled={inputDisabled} onClick={()=>set('glass',option)}
              className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${selection.glass===option?
                'border-[#EE6C13] bg-[#EE6C13] text-white':'border-slate-300 bg-white text-slate-800 hover:border-orange-400'}`}>
              {option}
            </button>)}
          </div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold text-slate-800">Asansör temizlenecek mi?</legend>
          <div className="flex flex-wrap gap-2">{yesNo('elevator',true,'Asansör temizliği')}{yesNo('elevator',false,'Asansör temizliği')}</div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold text-slate-800">Yeterli temizlik malzemesi var mı?</legend>
          <div className="flex flex-wrap gap-2">{yesNo('materialsAvailable',true,'Temizlik malzemesi')}{yesNo('materialsAvailable',false,'Temizlik malzemesi')}</div>
        </fieldset>
      </div>
    </section>
  </ServiceConfiguratorShell>;
}
