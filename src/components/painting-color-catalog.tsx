'use client';

import {useState} from 'react';
import {DYO_PREVIEW_WARNING,searchDyoWallColors,type DyoColor} from '../lib/painting-color-catalog-dyo';

export function PaintingColorCatalog({onSelect,disabled=false}:{
  onSelect:(color:DyoColor)=>void;disabled?:boolean;
}){
  const [query,setQuery]=useState('');
  const colors=searchDyoWallColors(query);
  return <section aria-label="DYO renk kataloğu" className="rounded-2xl border border-orange-200 bg-orange-50/50 p-3 mb-3">
    <label htmlFor="dyo-color-search" className="block text-xs font-semibold text-slate-800 mb-1.5">DYO renk kataloğu</label>
    <input id="dyo-color-search" type="search" value={query} onChange={event=>setQuery(event.target.value)}
      placeholder="Renk adı veya kodu ara" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500" />
    <p className="mt-2 text-[11px] leading-relaxed text-slate-700">{DYO_PREVIEW_WARNING}</p>
    <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
      {colors.map(color=><button key={color.colorCode} type="button" disabled={disabled}
        onClick={()=>onSelect(color)} aria-label={`DYO ${color.colorName??''} ${color.colorCode}`.trim()}
        className="rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm hover:border-orange-400 focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-50">
        <span className="block h-12 w-full rounded-lg border border-slate-300" style={{backgroundColor:color.previewHex}} aria-hidden="true" />
        <span className="mt-1.5 block text-[11px] font-semibold leading-tight text-slate-800 break-words">{color.colorName??`DYO ${color.colorCode}`}</span>
        <span className="mt-0.5 block text-xs font-bold text-slate-600">{color.colorCode}</span>
      </button>)}
    </div>
    {colors.length===0&&<p className="mt-3 text-xs text-slate-600">Bu aramayla eşleşen renk bulunamadı.</p>}
  </section>;
}
