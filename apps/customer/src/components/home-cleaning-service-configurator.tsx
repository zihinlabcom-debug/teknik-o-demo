'use client';

import {advanceHomeCleaning,HOME_EXTRA_CHOICES,type HomeExtra} from '@/lib/cleaning-home';
import type {ServicePricePresentation} from '@/lib/service-presentation';
import {toggleHomeExtra} from './cleaning-input-selector';
import {ServiceConfiguratorShell} from './service-configurator-shell';
import {ServiceResultCard} from './service-result';

type ExtraKey=Exclude<HomeExtra,'pet'>;
export interface HomeCleaningSelection {
  areaM2:string;rooms:string; bathrooms:number|null;balconies:number|null;
  extras:ExtraKey[];noExtras:boolean;closetRooms:number|null;
  pet:boolean|null;materialsAvailable:boolean|null;equipmentAvailable:boolean|null;duration:string|null;
}
export const EMPTY_HOME_CLEANING_SELECTION:HomeCleaningSelection={
  areaM2:'',rooms:'',bathrooms:null,balconies:null,extras:[],noExtras:false,closetRooms:null,
  pet:null,materialsAvailable:null,equipmentAvailable:null,duration:null,
};

const roomSuggestions=advanceHomeCleaning('',{step:'rooms',fields:{},answered:1}).options;
const durationOptions=advanceHomeCleaning('',{step:'duration',fields:{},answered:8}).options;
const whole=(value:string,min:number,max:number)=>/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)>=min&&Number(value)<=max;
export function homeCleaningSelectionAnswers(selection:HomeCleaningSelection):string[]|null{
  const area=selection.areaM2.trim();
  if(!/^\d+(?:[.,]\d+)?$/.test(area)||!Number.isFinite(Number(area.replace(',','.')))||Number(area.replace(',','.'))<=0||
    !whole(selection.rooms,1,99)||selection.bathrooms===null||!Number.isSafeInteger(selection.bathrooms)||selection.bathrooms<1||selection.bathrooms>100||
    selection.balconies===null||!Number.isSafeInteger(selection.balconies)||selection.balconies<0||selection.balconies>100||
    selection.noExtras&&selection.extras.length>0||!selection.noExtras&&selection.extras.length===0||
    selection.extras.some(key=>!HOME_EXTRA_CHOICES.some(choice=>choice.key===key))||
    selection.extras.includes('roomClosets')&&(selection.closetRooms===null||!Number.isSafeInteger(selection.closetRooms)||selection.closetRooms<1||selection.closetRooms>100)||
    selection.pet===null||selection.materialsAvailable===null||selection.equipmentAvailable===null||
    !selection.duration||!durationOptions.includes(selection.duration))return null;
  const extraAnswer=selection.noExtras?'Yok':HOME_EXTRA_CHOICES.filter(extra=>selection.extras.includes(extra.key)).map(extra=>extra.answer).join(', ');
  return [area,`${selection.rooms}+1`,String(selection.bathrooms),String(selection.balconies),extraAnswer,
    ...(selection.extras.includes('roomClosets')?[String(selection.closetRooms)]:[]),
    selection.pet?'Evet':'Hayır',selection.materialsAvailable?'Evet':'Hayır',
    selection.equipmentAvailable?'Evet':'Hayır',selection.duration];
}

export function HomeCleaningServiceConfigurator({selection,onChange,onCalculate,ready,busy,finished,fieldsLocked=false,
  result,onRequestTechnician,onReject,errorText}:{
  selection:HomeCleaningSelection;onChange:(next:HomeCleaningSelection)=>void;onCalculate:(answers:string[])=>void;
  ready:boolean;busy:boolean;finished:boolean;fieldsLocked?:boolean;result:ServicePricePresentation|null;
  onRequestTechnician:()=>void;onReject:()=>void;errorText?:string|null;
}){
  const answers=homeCleaningSelectionAnswers(selection);
  const disabled=busy||finished;
  const inputDisabled=disabled||fieldsLocked;
  const set=<K extends keyof HomeCleaningSelection>(key:K,value:HomeCleaningSelection[K])=>onChange({...selection,[key]:value});
  const step=(key:'bathrooms'|'balconies'|'closetRooms',delta:number,min:number)=>{
    const current=selection[key];
    const next=current===null?(delta>0?Math.max(1,min):min):Math.max(min,Math.min(100,current+delta));
    set(key,next);
  };
  const quantity=(key:'bathrooms'|'balconies'|'closetRooms',label:string,min:number)=>
    <div className="flex min-w-0 items-center gap-2" aria-label={`${label} seçimi`}>
      <button type="button" aria-label={`${label} azalt`} disabled={inputDisabled||selection[key]!==null&&selection[key]<=min||selection[key]===null&&min>0}
        onClick={()=>step(key,-1,min)} className="flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold disabled:opacity-40">−</button>
      <output aria-label={`${label} adet`} className="min-w-8 text-center text-base font-bold tabular-nums">{selection[key]??'—'}</output>
      <button type="button" aria-label={`${label} artır`} disabled={inputDisabled||selection[key]!==null&&selection[key]>=100}
        onClick={()=>step(key,1,min)} className="flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold disabled:opacity-40">+</button>
    </div>;
  const toggle=(key:ExtraKey|'none')=>{
    const next=toggleHomeExtra({selected:selection.extras,none:selection.noExtras},key);
    onChange({...selection,extras:next.selected,noExtras:next.none,
      closetRooms:next.selected.includes('roomClosets')?selection.closetRooms:null});
  };
  const yesNo=(key:'pet'|'materialsAvailable'|'equipmentAvailable',value:boolean,label:string)=>
    <button type="button" aria-label={`${label}: ${value?'Evet':'Hayır'}`} aria-pressed={selection[key]===value}
      disabled={inputDisabled} onClick={()=>set(key,value)}
      className={`min-h-11 min-w-20 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${selection[key]===value?
        'border-[#EE6C13] bg-[#EE6C13] text-white':'border-slate-300 bg-white text-slate-800 hover:border-orange-400'}`}>
      {value?'Evet':'Hayır'}
    </button>;
  const extraLabels=selection.noExtras?'Yok':HOME_EXTRA_CHOICES.filter(item=>selection.extras.includes(item.key)).map(item=>item.label).join(', ')||'—';
  const yesNoText=(value:boolean|null)=>value===null?'—':value?'Evet':'Hayır';
  const summary:[string,string][]=[
    ['Evin büyüklüğü',selection.areaM2?`${selection.areaM2} m²`:'—'],['Ev tipi',selection.rooms?`${selection.rooms}+1`:'—'],
    ['Banyo',selection.bathrooms===null?'—':String(selection.bathrooms)],['Balkon',selection.balconies===null?'—':String(selection.balconies)],
    ['Ek işler',extraLabels],
    ...(selection.extras.includes('roomClosets')?[['Oda dolabı',selection.closetRooms===null?'—':String(selection.closetRooms)] as [string,string]]:[]),
    ['Evcil hayvan',yesNoText(selection.pet)],['Temizlik malzemesi',yesNoText(selection.materialsAvailable)],
    ['Temel ekipman',yesNoText(selection.equipmentAvailable)],['Süre tercihi',selection.duration??'—'],
  ];

  return <ServiceConfiguratorShell title="Ev Temizliği"
    description="Ev bilgilerini ve istediğiniz ek işleri seçin. Fiyat, mevcut hizmet motorunda hesaplanır."
    summary={<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Hizmet özeti">
      <h2 className="text-base font-bold text-[#111827]">Hizmet özeti</h2>
      <dl className="mt-3 space-y-3 text-sm text-slate-700">
        {summary.map(([label,value])=><div key={label} className="flex min-w-0 justify-between gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
          <dt className="min-w-0 break-words">{label}</dt><dd className="max-w-[55%] break-words text-right font-semibold">{value}</dd>
        </div>)}
      </dl>
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm font-medium text-slate-600">
        {finished?'Değerlendirme tamamlandı.':'Henüz fiyat hesaplanmadı.'}
      </p>
    </section>}
    action={<div className="min-w-0 space-y-2">
      {!answers&&<p role="status" className="text-sm font-medium text-slate-600">Fiyat için gerekli alanları tamamlayın.</p>}
      {errorText&&<p role="alert" className="text-sm font-medium text-red-700">{errorText}</p>}
      <button type="button" disabled={!answers||!ready||disabled} onClick={()=>{if(answers)onCalculate(answers);}}
        className="min-h-12 w-full rounded-xl bg-[#EE6C13] px-5 py-3 text-base font-bold text-white shadow-md shadow-orange-500/15 transition-colors hover:bg-[#D85E0E] disabled:cursor-not-allowed disabled:opacity-50">
        {busy?'Hesaplanıyor…':'Fiyatı Hesapla'}
      </button>
    </div>}
    result={<ServiceResultCard result={result} onRequestTechnician={onRequestTechnician} onReject={onReject} />}>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Ev Bilgileri">
      <h2 className="mb-4 text-lg font-bold text-[#111827]">Ev Bilgileri</h2>
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-semibold text-slate-800">
          <span className="mb-2 block">Eviniz kaç metrekare?</span>
          <input type="text" inputMode="decimal" aria-label="Eviniz kaç metrekare?" value={selection.areaM2}
            onChange={event=>set('areaM2',event.target.value)} disabled={inputDisabled}
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none focus:border-[#EE6C13]" placeholder="Örn. 80" />
        </label>
        <div className="min-w-0">
          <label htmlFor="home-room-count" className="mb-2 block text-sm font-semibold text-slate-800">Ev tipi nedir?</label>
          <div className="flex min-w-0 items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#EE6C13]">
            <input id="home-room-count" type="text" inputMode="numeric" pattern="[0-9]*" aria-label="Ev tipi oda sayısı"
              value={selection.rooms} onChange={event=>set('rooms',event.target.value)} disabled={inputDisabled}
              className="min-h-12 w-full min-w-0 rounded-l-xl bg-transparent px-3 text-base text-slate-900 outline-none" placeholder="Örn. 3" />
            <span className="shrink-0 pr-3 text-base font-semibold text-slate-600">+1</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">{roomSuggestions.map(option=><button key={option} type="button"
            aria-pressed={`${selection.rooms}+1`===option} disabled={inputDisabled}
            onClick={()=>set('rooms',option.split('+')[0])}
            className={`min-h-11 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50 ${`${selection.rooms}+1`===option?
              'border-[#EE6C13] bg-orange-50 text-[#C6520D]':'border-slate-300 bg-white text-slate-700'}`}>{option}</button>)}</div>
        </div>
        <div className="min-w-0"><p className="mb-2 text-sm font-semibold text-slate-800">Kaç banyo temizlenecek?</p>{quantity('bathrooms','Banyo',1)}</div>
        <div className="min-w-0"><p className="mb-2 text-sm font-semibold text-slate-800">Kaç balkon var?</p>{quantity('balconies','Balkon',0)}</div>
      </div>
    </section>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Ek Hizmetler">
      <h2 className="mb-4 text-lg font-bold text-[#111827]">Ek Hizmetler</h2>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold text-slate-800">Hangi ek işleri istersiniz?</legend>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {HOME_EXTRA_CHOICES.map(item=><button key={item.key} type="button" aria-pressed={selection.extras.includes(item.key)}
            disabled={inputDisabled} onClick={()=>toggle(item.key)}
            className={`min-h-11 min-w-0 break-words rounded-xl border px-3 py-2 text-left text-sm font-semibold disabled:opacity-50 ${selection.extras.includes(item.key)?
              'border-[#EE6C13] bg-[#EE6C13] text-white':'border-slate-300 bg-white text-slate-800 hover:border-orange-400'}`}>{item.label}</button>)}
          <button type="button" aria-pressed={selection.noExtras} disabled={inputDisabled} onClick={()=>toggle('none')}
            className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold disabled:opacity-50 ${selection.noExtras?
              'border-[#EE6C13] bg-[#EE6C13] text-white':'border-slate-300 bg-white text-slate-800'}`}>Yok</button>
        </div>
      </fieldset>
      {selection.extras.includes('roomClosets')&&<div className="mt-5 min-w-0">
        <p className="mb-2 text-sm font-semibold text-slate-800">Kaç oda dolabının içi temizlenecek?</p>
        {quantity('closetRooms','Oda dolabı',1)}
      </div>}
      <fieldset className="mt-5 min-w-0">
        <legend className="mb-2 text-sm font-semibold text-slate-800">Evde evcil hayvan var mı?</legend>
        <div className="flex flex-wrap gap-2">{yesNo('pet',true,'Evcil hayvan')}{yesNo('pet',false,'Evcil hayvan')}</div>
      </fieldset>
    </section>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Malzeme ve Ekipman">
      <h2 className="mb-4 text-lg font-bold text-[#111827]">Malzeme ve Ekipman</h2>
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold text-slate-800">Temizlik malzemeleri evde mevcut mu?</legend>
          <div className="flex flex-wrap gap-2">{yesNo('materialsAvailable',true,'Temizlik malzemesi')}{yesNo('materialsAvailable',false,'Temizlik malzemesi')}</div></fieldset>
        <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold text-slate-800">Elektrik süpürgesi ve temel ekipman mevcut mu?</legend>
          <div className="flex flex-wrap gap-2">{yesNo('equipmentAvailable',true,'Temel ekipman')}{yesNo('equipmentAvailable',false,'Temel ekipman')}</div></fieldset>
      </div>
    </section>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Süre Tercihi">
      <h2 className="mb-4 text-lg font-bold text-[#111827]">Süre Tercihi</h2>
      <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold text-slate-800">Tamamlanma süresi tercihiniz nedir?</legend>
        <div className="flex min-w-0 flex-wrap gap-2">{durationOptions.map(option=><button key={option} type="button"
          aria-pressed={selection.duration===option} disabled={inputDisabled} onClick={()=>set('duration',option)}
          className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${selection.duration===option?
            'border-[#EE6C13] bg-[#EE6C13] text-white':'border-slate-300 bg-white text-slate-800 hover:border-orange-400'}`}>{option}</button>)}</div>
      </fieldset>
    </section>
  </ServiceConfiguratorShell>;
}
