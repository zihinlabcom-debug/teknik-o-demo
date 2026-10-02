'use client';

import type {DyoColor} from '@/lib/painting-color-catalog-dyo';
import type {PaintingFields,RepairStatus,ScopeType,ColorTone} from '@/lib/painting-types';
import type {PaintingType} from '@/lib/painting-price-data';
import type {ServicePricePresentation} from '@/lib/service-presentation';
import {PaintingColorCatalog} from './painting-color-catalog';
import {ServiceConfiguratorShell} from './service-configurator-shell';
import {ServiceResultCard} from './service-result';

type Surface=NonNullable<PaintingFields['surfaceType']>;
type ColorSource='dyo_catalog'|'manual';
type SurfaceChoice='walls'|'ceiling'|'both';
export interface PaintingSelection {
  serviceType:string|null;scopeType:ScopeType|null;netAreaM2:string;paintedRoomCount:number|null;
  furnished:boolean|null;ceilingHeightMode:'standard'|'custom'|null;customCeilingHeight:string;
  surfaces:SurfaceChoice|null;surfaceType:Surface|null;repairStatus:RepairStatus|null;extraPuttyM2:string;
  oldColorTone:ColorTone|null;newColorTone:ColorTone|null;paintType:PaintingType|null;
  colorSelectionSource:ColorSource|null;selectedDyoColor:DyoColor|null;paintBrand:string;colorCode:string;
}
export const EMPTY_PAINTING_SELECTION:PaintingSelection={
  serviceType:null,scopeType:null,netAreaM2:'',paintedRoomCount:null,furnished:null,
  ceilingHeightMode:null,customCeilingHeight:'',surfaces:null,surfaceType:null,repairStatus:null,
  extraPuttyM2:'',oldColorTone:null,newColorTone:null,paintType:null,
  colorSelectionSource:null,selectedDyoColor:null,paintBrand:'',colorCode:'',
};
export type PaintingSubmissionStep={answer:string;expectedDelta:0|1;kind?:'catalog_choice'|'manual_choice'|'dyo_code'};

// These are the accepted answer labels in the server-only painting-engine prompt.
// The tests compare their sequence and surface compatibility with that engine.
export const PAINTING_UI_OPTIONS={
  scope:[{value:'complete_home',label:'Komple ev'},{value:'specific_area',label:'Belirli oda/odalar'}] as const,
  surfaces:[{value:'walls',label:'Yalnız duvarlar'},{value:'ceiling',label:'Yalnız tavan'},{value:'both',label:'Duvarlar ve tavan'}] as const,
  surface:[{value:'old_painted',label:'Eski boyalı'},{value:'new_plaster',label:'Yeni sıvalı'},
    {value:'satin_plaster_drywall',label:'Saten alçılı / alçıpan'}] as const,
  repair:[{value:'none',label:'Yok'},{value:'wide_putty',label:'Geniş alan macun düzeltmesi var'},
    {value:'serious_plaster_damage',label:'Ciddi sıva / derin hasar var'}] as const,
  tone:[{value:'light',label:'Açık'},{value:'dark',label:'Koyu'}] as const,
};
const paintLabels:Record<PaintingType,string>={
  white_lime:'Beyaz kireç badana',silicone_matte:'Silikonlu mat',plastic_matte:'Plastik mat',
  silicone_silk_matte:'Silikonlu ipek mat',silicone_semi_matte:'Silikonlu yarı mat',
  antibacterial_silicone_matte:'Antibakteriyel silikonlu mat',
  antibacterial_silicone_silk_matte:'Antibakteriyel silikonlu ipek mat',
  antibacterial_plastic_matte:'Antibakteriyel plastik mat',synthetic_gloss:'Sentetik parlak',
  synthetic_matte:'Sentetik mat',silicone_soft_matte:'Silikonlu soft mat',ceiling_water_based:'Tavan boyası',
};
const paintTypesBySurface:Record<Surface,PaintingType[]>={
  old_painted:['white_lime','silicone_matte','plastic_matte','silicone_silk_matte','silicone_semi_matte',
    'antibacterial_silicone_matte','antibacterial_silicone_silk_matte','antibacterial_plastic_matte',
    'synthetic_gloss','synthetic_matte'],
  new_plaster:['silicone_matte','silicone_soft_matte','plastic_matte'],
  satin_plaster_drywall:['silicone_soft_matte','plastic_matte'],
};
export const paintingPaintOptions=(surface:Surface|null)=>surface?
  paintTypesBySurface[surface].map(value=>({value,label:paintLabels[value]})):[];
const number=(value:string,min:number,max:number)=>{
  const trimmed=value.trim();
  if(!/^\d+(?:[.,]\d+)?$/.test(trimmed))return null;
  const parsed=Number(trimmed.replace(',','.'));
  return Number.isFinite(parsed)&&parsed>=min&&parsed<=max?parsed:null;
};
const choiceLabel=<T extends string>(options:readonly {value:T;label:string}[],value:T|null)=>
  options.find(option=>option.value===value)?.label??null;

export function paintingSelectionSteps(selection:PaintingSelection):PaintingSubmissionStep[]|null{
  if(selection.serviceType!=='Duvar Boyama'||!selection.scopeType||
    number(selection.netAreaM2,Number.EPSILON,100000)===null||
    selection.paintedRoomCount===null||!Number.isSafeInteger(selection.paintedRoomCount)||
    selection.paintedRoomCount<0||selection.paintedRoomCount>500||selection.furnished===null||
    !selection.ceilingHeightMode||!selection.surfaces)return null;
  const height=selection.ceilingHeightMode==='standard'?2.5:number(selection.customCeilingHeight,1.5,30);
  if(height===null)return null;
  const steps:PaintingSubmissionStep[]=[
    {answer:choiceLabel(PAINTING_UI_OPTIONS.scope,selection.scopeType)!,expectedDelta:1},
    {answer:`${selection.netAreaM2.trim()} m²`,expectedDelta:1},
    {answer:String(selection.paintedRoomCount),expectedDelta:1},
    {answer:selection.furnished?'Eşyalı':'Boş',expectedDelta:1},
    {answer:`${height.toString().replace('.',',')} metre`,expectedDelta:1},
    {answer:choiceLabel(PAINTING_UI_OPTIONS.surfaces,selection.surfaces)!,expectedDelta:1},
  ];
  if(selection.surfaces==='ceiling')return steps;
  if(!selection.surfaceType||!selection.repairStatus)return null;
  steps.push({answer:choiceLabel(PAINTING_UI_OPTIONS.surface,selection.surfaceType)!,expectedDelta:1},
    {answer:choiceLabel(PAINTING_UI_OPTIONS.repair,selection.repairStatus)!,expectedDelta:1});
  if(selection.repairStatus==='serious_plaster_damage')return steps;
  if(selection.repairStatus==='wide_putty'){
    if(number(selection.extraPuttyM2,Number.EPSILON,100000)===null)return null;
    steps.push({answer:`${selection.extraPuttyM2.trim()} m²`,expectedDelta:1});
  }
  if(!selection.oldColorTone||!selection.newColorTone||!selection.paintType||
    !paintTypesBySurface[selection.surfaceType].includes(selection.paintType)||!selection.colorSelectionSource)return null;
  steps.push(
    {answer:choiceLabel(PAINTING_UI_OPTIONS.tone,selection.oldColorTone)!,expectedDelta:1},
    {answer:choiceLabel(PAINTING_UI_OPTIONS.tone,selection.newColorTone)!,expectedDelta:1},
    {answer:paintLabels[selection.paintType],expectedDelta:1},
  );
  if(selection.colorSelectionSource==='dyo_catalog'){
    if(!selection.selectedDyoColor)return null;
    steps.push({answer:'DYO renk kataloğundan seç',expectedDelta:0,kind:'catalog_choice'},
      {answer:`DYO renk kodu: ${selection.selectedDyoColor.colorCode}`,expectedDelta:1,kind:'dyo_code'});
  }else{
    const brand=selection.paintBrand.trim(),code=selection.colorCode.trim();
    if(!brand||!code||brand.length>80||code.length>80)return null;
    steps.push({answer:'Marka ve renk kodunu kendim yazacağım',expectedDelta:0,kind:'manual_choice'},
      {answer:`Marka: ${brand}, renk kodu: ${code}`,expectedDelta:1});
  }
  return steps;
}

export function PaintingServiceConfigurator({selection,onChange,serviceOptions,onSelectService,onCalculate,
  onSelectColorSource,onConfirmColor,onChangeColor,ready,busy,finished,fieldsLocked=false,awaitingColorConfirmation=false,
  awaitingCatalogColor=false,allowFinalColorEdit=false,unavailableText,resultExplanation,result,
  onRequestTechnician,onReject,errorText}:{
  selection:PaintingSelection;onChange:(next:PaintingSelection)=>void;serviceOptions:string[];
  onSelectService:(label:string)=>void;onCalculate:(steps:PaintingSubmissionStep[])=>void;
  onSelectColorSource:(source:ColorSource)=>void;onConfirmColor:()=>void;onChangeColor:()=>void;
  ready:boolean;busy:boolean;finished:boolean;fieldsLocked?:boolean;
  awaitingColorConfirmation?:boolean;awaitingCatalogColor?:boolean;allowFinalColorEdit?:boolean;
  unavailableText?:string|null;resultExplanation?:string|null;result:ServicePricePresentation|null;
  onRequestTechnician:()=>void;onReject:()=>void;errorText?:string|null;
}){
  const steps=paintingSelectionSteps(selection);
  const fieldDisabled=busy||finished||fieldsLocked;
  const colorDisabled=busy||finished||awaitingColorConfirmation;
  const colorInputDisabled=fieldDisabled&&!allowFinalColorEdit;
  const walls=selection.surfaces!==null&&selection.surfaces!=='ceiling';
  const stopForReview=selection.repairStatus==='serious_plaster_damage';
  const set=<K extends keyof PaintingSelection>(key:K,value:PaintingSelection[K])=>onChange({...selection,[key]:value});
  const card=(selected:boolean)=>`min-h-11 min-w-0 break-words rounded-xl border px-3 py-2 text-left text-sm font-semibold disabled:opacity-50 ${selected?
    'border-[#EE6C13] bg-[#EE6C13] text-white':'border-slate-300 bg-white text-slate-800 hover:border-orange-400'}`;
  const choices=<T extends string>(options:readonly {value:T;label:string}[],selected:T|null,onSelect:(value:T)=>void,disabled=fieldDisabled)=>
    <div className="flex min-w-0 flex-wrap gap-2">{options.map(option=><button key={option.value} type="button"
      aria-pressed={selected===option.value} disabled={disabled} onClick={()=>onSelect(option.value)}
      className={card(selected===option.value)}>{option.label}</button>)}</div>;
  const yesNo=(value:boolean,label:string)=> <button type="button" disabled={fieldDisabled}
    aria-label={`Ev durumu: ${label}`} aria-pressed={selection.furnished===value}
    onClick={()=>set('furnished',value)} className={card(selection.furnished===value)}>{label}</button>;
  const summary:[string,string][]=[
    ['Hizmet',selection.serviceType??'—'],
    ['Kapsam',choiceLabel(PAINTING_UI_OPTIONS.scope,selection.scopeType)??'—'],
    ['Net alan',selection.netAreaM2?`${selection.netAreaM2} m²`:'—'],
    ['Oda sayısı',selection.paintedRoomCount===null?'—':String(selection.paintedRoomCount)],
    ['Ev durumu',selection.furnished===null?'—':selection.furnished?'Eşyalı':'Boş'],
    ['Tavan yüksekliği',selection.ceilingHeightMode==='standard'?'Standart — 2,50 m':
      selection.ceilingHeightMode==='custom'&&selection.customCeilingHeight?`${selection.customCeilingHeight} m`:'—'],
    ['Boyanacak alan',choiceLabel(PAINTING_UI_OPTIONS.surfaces,selection.surfaces)??'—'],
    ...(walls?[
      ['Yüzey',choiceLabel(PAINTING_UI_OPTIONS.surface,selection.surfaceType)??'—'],
      ['Hasar',choiceLabel(PAINTING_UI_OPTIONS.repair,selection.repairStatus)??'—'],
      ...(selection.repairStatus==='wide_putty'?[['Macun alanı',selection.extraPuttyM2?`${selection.extraPuttyM2} m²`:'—']]:[]),
      ...(!stopForReview?[
        ['Mevcut ton',choiceLabel(PAINTING_UI_OPTIONS.tone,selection.oldColorTone)??'—'],
        ['Yeni ton',choiceLabel(PAINTING_UI_OPTIONS.tone,selection.newColorTone)??'—'],
        ['Boya türü',selection.paintType?paintLabels[selection.paintType]:'—'],
        ['Marka',selection.colorSelectionSource==='dyo_catalog'?'DYO':selection.paintBrand||'—'],
        ['Renk',selection.colorSelectionSource==='dyo_catalog'?
          selection.selectedDyoColor?`${selection.selectedDyoColor.colorName??'DYO'} — ${selection.selectedDyoColor.colorCode}`:'—':
          selection.colorCode||'—'],
      ]:[]),
    ] as [string,string][]:[]),
  ];
  return <ServiceConfiguratorShell title="Boya"
    description="Hizmet bilgilerini seçin, maliyetini öğrenin."
    summary={<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Hizmet özeti">
      <h2 className="text-base font-bold text-[#0B1727]">Hizmet özeti</h2>
      <dl className="mt-3 space-y-3 text-sm text-slate-700">{summary.map(([label,value])=>
        <div key={label} className="flex min-w-0 justify-between gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
          <dt className="min-w-0 break-words">{label}</dt><dd className="max-w-[55%] break-words text-right font-semibold">{value}</dd>
        </div>)}</dl>
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm font-medium text-slate-600">
        {finished?'Değerlendirme tamamlandı.':'Henüz fiyat hesaplanmadı.'}
      </p>
    </section>}
    action={<div className="min-w-0 space-y-2">
      {selection.serviceType==='Duvar Boyama'&&!steps&&<p role="status" className="text-sm font-medium text-slate-600">Fiyat için gerekli alanları tamamlayın.</p>}
      {errorText&&<p role="alert" className="text-sm font-medium text-red-700">{errorText}</p>}
      {selection.serviceType==='Duvar Boyama'&&!awaitingColorConfirmation&&<button type="button"
        disabled={!steps||!ready||busy||finished} onClick={()=>{if(steps)onCalculate(steps);}}
        className="min-h-12 w-full rounded-xl bg-[#EE6C13] px-5 py-3 text-base font-bold text-white shadow-md shadow-orange-500/15 disabled:cursor-not-allowed disabled:opacity-50">
        {busy?'Hesaplanıyor…':'Fiyatı Hesapla'}</button>}
    </div>}
    result={<div className="space-y-3">
      {resultExplanation&&<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800">{resultExplanation}</p>}
      <ServiceResultCard result={result} onRequestTechnician={onRequestTechnician} onReject={onReject} />
    </div>}>
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Hizmet Kapsamı">
      <h2 className="mb-4 text-lg font-bold text-[#0B1727]">Hizmet Kapsamı</h2>
      <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold">Hangi boya hizmetine ihtiyacınız var?</legend>
        <div className="grid gap-2 sm:grid-cols-3">{serviceOptions.map(label=><button key={label} type="button"
          disabled={busy||finished||selection.serviceType!==null} aria-pressed={selection.serviceType===label}
          onClick={()=>onSelectService(label)} className={card(selection.serviceType===label)}>{label}</button>)}</div>
      </fieldset>
      {unavailableText&&<p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800">{unavailableText}</p>}
      {selection.serviceType==='Duvar Boyama'&&<div className="mt-5 space-y-5">
        <fieldset><legend className="mb-2 text-sm font-semibold">Boya işi komple ev için mi, yoksa belirli oda/odalar için mi?</legend>
          {choices(PAINTING_UI_OPTIONS.scope,selection.scopeType,value=>set('scopeType',value))}</fieldset>
        <label className="block min-w-0 text-sm font-semibold">
          <span className="mb-2 block">{selection.scopeType==='specific_area'?'Boyanacak bölümün yaklaşık net zemin alanı kaç m²?':'Evin net kullanım alanı kaç m²?'}</span>
          <input type="text" inputMode="decimal" value={selection.netAreaM2} disabled={fieldDisabled}
            onChange={event=>set('netAreaM2',event.target.value)} placeholder="Örn. 100"
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 focus:border-[#EE6C13] sm:max-w-sm" />
        </label>
        <div><p className="mb-1 text-sm font-semibold">{selection.scopeType==='specific_area'?
          'Boyanacak kaç oda var? Salon sayılmayacak.':'Evde kaç oda var? Salon sayılmayacak.'}</p>
          <div className="flex min-w-0 items-center gap-2" aria-label="Boyanacak oda sayısı seçimi">
            <button type="button" aria-label="Oda azalt" disabled={fieldDisabled||selection.paintedRoomCount===0}
              onClick={()=>set('paintedRoomCount',Math.max(0,(selection.paintedRoomCount??1)-1))}
              className="flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold disabled:opacity-40">−</button>
            <output aria-label="Oda adedi" className="min-w-8 text-center text-base font-bold">{selection.paintedRoomCount??'—'}</output>
            <button type="button" aria-label="Oda artır" disabled={fieldDisabled||selection.paintedRoomCount===500}
              onClick={()=>set('paintedRoomCount',Math.min(500,(selection.paintedRoomCount??0)+1))}
              className="flex size-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-bold disabled:opacity-40">+</button>
          </div>
        </div>
        <fieldset><legend className="mb-2 text-sm font-semibold">Ev eşyalı mı, boş mu?</legend>
          <div className="flex flex-wrap gap-2">{yesNo(true,'Eşyalı')}{yesNo(false,'Boş')}</div></fieldset>
        <fieldset><legend className="mb-2 text-sm font-semibold">Tavan yüksekliği</legend>
          <div className="flex min-w-0 flex-wrap gap-2">
            <button type="button" disabled={fieldDisabled} aria-pressed={selection.ceilingHeightMode==='standard'}
              onClick={()=>set('ceilingHeightMode','standard')} className={card(selection.ceilingHeightMode==='standard')}>
              Standart — 2,50 m</button>
            <button type="button" disabled={fieldDisabled} aria-pressed={selection.ceilingHeightMode==='custom'}
              onClick={()=>set('ceilingHeightMode','custom')} className={card(selection.ceilingHeightMode==='custom')}>
              Başka — Belirtiniz</button>
          </div>
          {selection.ceilingHeightMode==='custom'&&<label className="mt-3 block min-w-0 text-sm font-semibold">
            <span className="mb-2 block">Tavan yüksekliğini belirtiniz</span>
            <span className="flex min-w-0 items-center rounded-xl border border-slate-300 bg-white sm:max-w-sm">
              <input type="text" inputMode="decimal" value={selection.customCeilingHeight} disabled={fieldDisabled}
                onChange={event=>set('customCeilingHeight',event.target.value)} placeholder="Örn. 3,10"
                className="min-h-12 w-full min-w-0 rounded-l-xl px-3 text-base font-normal text-slate-900 outline-none" />
              <span className="shrink-0 pr-3 text-base">m</span>
            </span>
          </label>}
        </fieldset>
      </div>}
    </section>
    {selection.serviceType==='Duvar Boyama'&&<section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Boyanacak Alan">
      <h2 className="mb-4 text-lg font-bold text-[#0B1727]">Boyanacak Alan</h2>
      <fieldset><legend className="mb-2 text-sm font-semibold">Duvarlar mı, tavan mı, yoksa ikisi birden mi boyanacak?</legend>
        {choices(PAINTING_UI_OPTIONS.surfaces,selection.surfaces,value=>set('surfaces',value))}</fieldset>
      {walls&&<div className="mt-5 space-y-5">
        <fieldset><legend className="mb-2 text-sm font-semibold">Duvarların mevcut yüzeyi hangisi?</legend>
          {choices(PAINTING_UI_OPTIONS.surface,selection.surfaceType,value=>onChange({...selection,surfaceType:value,
            paintType:selection.paintType&&paintTypesBySurface[value].includes(selection.paintType)?selection.paintType:null}))}</fieldset>
        <fieldset><legend className="mb-2 text-sm font-semibold">Normal küçük kusurlar dışında ekstra tadilat gerekiyor mu?</legend>
          {choices(PAINTING_UI_OPTIONS.repair,selection.repairStatus,value=>onChange({...selection,repairStatus:value,
            extraPuttyM2:value==='wide_putty'?selection.extraPuttyM2:''}))}</fieldset>
        {selection.repairStatus==='wide_putty'&&<label className="block text-sm font-semibold">
          <span className="mb-2 block">Macun düzeltmesi gereken yaklaşık alan kaç m²?</span>
          <input type="text" inputMode="decimal" value={selection.extraPuttyM2} disabled={fieldDisabled}
            onChange={event=>set('extraPuttyM2',event.target.value)} placeholder="Örn. 10"
            className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 sm:max-w-sm" />
        </label>}
        {stopForReview&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          Ciddi sıva veya derin hasar için yerinde inceleme gerekir.</p>}
      </div>}
    </section>}
    {selection.serviceType==='Duvar Boyama'&&walls&&!stopForReview&&<section
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Renk ve Boya">
      <h2 className="mb-4 text-lg font-bold text-[#0B1727]">Renk ve Boya</h2>
      <div className="space-y-5">
        <fieldset><legend className="mb-2 text-sm font-semibold">Duvarların mevcut rengi açık ton mu, koyu ton mu?</legend>
          {choices(PAINTING_UI_OPTIONS.tone,selection.oldColorTone,value=>set('oldColorTone',value))}</fieldset>
        <fieldset><legend className="mb-2 text-sm font-semibold">İstediğiniz yeni renk açık ton mu, koyu ton mu?</legend>
          {choices(PAINTING_UI_OPTIONS.tone,selection.newColorTone,value=>set('newColorTone',value))}</fieldset>
        <fieldset><legend className="mb-2 text-sm font-semibold">Hangi boya türünü istiyorsunuz?</legend>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">{paintingPaintOptions(selection.surfaceType).map(option=>
            <button key={option.value} type="button" disabled={fieldDisabled} aria-pressed={selection.paintType===option.value}
              onClick={()=>set('paintType',option.value)} className={card(selection.paintType===option.value)}>{option.label}</button>)}</div>
        </fieldset>
        <fieldset><legend className="mb-2 text-sm font-semibold">Renk seçimi</legend>
          <div className="flex min-w-0 flex-wrap gap-2">
            <button type="button" disabled={colorDisabled||fieldsLocked&&!awaitingCatalogColor&&!allowFinalColorEdit}
              aria-pressed={selection.colorSelectionSource==='dyo_catalog'}
              onClick={()=>onSelectColorSource('dyo_catalog')}
              className={card(selection.colorSelectionSource==='dyo_catalog')}>DYO katalogdan seç</button>
            <button type="button" disabled={colorDisabled||fieldsLocked&&!awaitingCatalogColor&&!allowFinalColorEdit}
              aria-pressed={selection.colorSelectionSource==='manual'}
              onClick={()=>onSelectColorSource('manual')}
              className={card(selection.colorSelectionSource==='manual')}>Marka / renk kodunu manuel gir</button>
          </div>
        </fieldset>
        {selection.colorSelectionSource==='dyo_catalog'&&<div className="min-w-0">
          <PaintingColorCatalog expanded disabled={colorDisabled} onSelect={color=>set('selectedDyoColor',color)} />
          {selection.selectedDyoColor&&<p className="text-sm font-semibold text-slate-800">
            Seçilen renk: DYO — {selection.selectedDyoColor.colorName??'Adlandırılmamış'} — {selection.selectedDyoColor.colorCode}</p>}
        </div>}
        {selection.colorSelectionSource==='manual'&&<div className="grid gap-4 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-semibold">Marka
            <input type="text" value={selection.paintBrand} disabled={colorInputDisabled}
              onChange={event=>set('paintBrand',event.target.value)} placeholder="Boya markası"
              className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-900" />
          </label>
          <label className="min-w-0 text-sm font-semibold">Renk kodu
            <input type="text" value={selection.colorCode} disabled={colorInputDisabled}
              onChange={event=>set('colorCode',event.target.value)} placeholder="Renk kodu"
              className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-900" />
          </label>
        </div>}
        {awaitingColorConfirmation&&<fieldset className="rounded-xl border border-orange-200 bg-orange-50 p-3">
          <legend className="px-1 text-sm font-semibold">Bu renkle devam edelim mi?</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={onConfirmColor} className={card(false)}>Evet, devam et</button>
            <button type="button" disabled={busy} onClick={onChangeColor} className={card(false)}>Rengi değiştir</button>
          </div>
        </fieldset>}
      </div>
    </section>}
  </ServiceConfiguratorShell>;
}
