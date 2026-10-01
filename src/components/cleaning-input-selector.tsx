'use client';

import {useState} from 'react';
import {HOME_EXTRA_CHOICES, type HomeExtra} from '@/lib/cleaning-home';
import {UPHOLSTERY_PRODUCTS, type UpholsteryKey} from '@/lib/cleaning-upholstery';

type ExtraKey = Exclude<HomeExtra, 'pet'>;
type Quantities = Partial<Record<UpholsteryKey, number>>;
type ExtraSelection = {selected: ExtraKey[]; none: boolean};

export function toggleHomeExtra(selection: ExtraSelection, key: ExtraKey | 'none'): ExtraSelection {
  if (key === 'none') return {selected: [], none: !selection.none};
  return {selected: selection.selected.includes(key) ? selection.selected.filter(value => value !== key) :
    [...selection.selected, key], none: false};
}
export function changeUpholsteryQuantity(quantities: Quantities, key: UpholsteryKey, delta: number): Quantities {
  return {...quantities, [key]: Math.max(0, Math.min(100, (quantities[key] ?? 0) + delta))};
}
export function upholsterySelectionAnswer(quantities: Quantities): string | null {
  const items = UPHOLSTERY_PRODUCTS.filter(item => (quantities[item.key] ?? 0) > 0);
  return items.length ? items.map(item => `${quantities[item.key]} adet ${item.label}`).join(', ') : null;
}

export function CleaningInputSelector({mode, disabled, onContinue}: {
  mode: 'home_extras' | 'upholstery_items'; disabled: boolean; onContinue: (answer: string) => void;
}) {
  const [extraSelection, setExtraSelection] = useState<ExtraSelection>({selected: [], none: false});
  const [quantities, setQuantities] = useState<Quantities>({});
  if (mode === 'home_extras') {
    const answer = extraSelection.none ? 'Yok' : HOME_EXTRA_CHOICES.filter(item => extraSelection.selected.includes(item.key)).map(item => item.answer).join(', ');
    return <div className="mt-3 min-w-0 rounded-2xl border border-orange-200 bg-orange-50/60 p-3 sm:p-4" aria-label="Ek iş seçimi">
      <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 md:grid-cols-3">
        {HOME_EXTRA_CHOICES.map(item => <button key={item.key} type="button" aria-pressed={extraSelection.selected.includes(item.key)}
          disabled={disabled} onClick={() => setExtraSelection(current => toggleHomeExtra(current, item.key))}
          className={`min-h-11 min-w-0 break-words rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${extraSelection.selected.includes(item.key) ? 'border-[#EE6C13] bg-[#EE6C13] text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-orange-400'}`}>
          {item.label}
        </button>)}
        <button type="button" aria-pressed={extraSelection.none} disabled={disabled} onClick={() => setExtraSelection(current => toggleHomeExtra(current, 'none'))}
          className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${extraSelection.none ? 'border-[#EE6C13] bg-[#EE6C13] text-white' : 'border-slate-300 bg-white text-slate-800'}`}>Yok</button>
      </div>
      <button type="button" disabled={disabled || (!extraSelection.none && extraSelection.selected.length === 0)} onClick={() => onContinue(answer)}
        className="mt-3 min-h-11 w-full rounded-xl bg-[#EE6C13] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">Devam Et</button>
    </div>;
  }
  const answer = upholsterySelectionAnswer(quantities);
  return <div className="mt-3 min-w-0 rounded-2xl border border-orange-200 bg-orange-50/60 p-3 sm:p-4" aria-label="Ürün ve adet seçimi">
    <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-relaxed text-slate-700">Bilgi: 1 oturma grubu, 2 adet 3’lü koltuk + 1 adet berjerden oluşur. Oturma grubuna ek olarak ayrıca yıkanacak berjer, 2’li koltuk, 3’lü koltuk, yatak veya diğer ürünleriniz varsa bunları ayrıca adet olarak ekleyebilirsiniz.</p>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {UPHOLSTERY_PRODUCTS.map(item => <div key={item.key} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <span className="min-w-0 break-words text-sm font-semibold text-slate-800">{item.key === 'sofa_set' ? 'Koltuk takımı / oturma grubu' : item.label}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" aria-label={`${item.label} azalt`} disabled={disabled || !quantities[item.key]}
            onClick={() => setQuantities(current => changeUpholsteryQuantity(current, item.key, -1))}
            className="flex size-11 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold disabled:opacity-40">−</button>
          <output aria-label={`${item.label} adet`} className="w-6 text-center text-base font-bold tabular-nums">{quantities[item.key] ?? 0}</output>
          <button type="button" aria-label={`${item.label} artır`} disabled={disabled || (quantities[item.key] ?? 0) >= 100}
            onClick={() => setQuantities(current => changeUpholsteryQuantity(current, item.key, 1))}
            className="flex size-11 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold">+</button>
        </div>
      </div>)}
    </div>
    <button type="button" disabled={disabled || !answer} onClick={() => {if (answer) onContinue(answer);}}
      className="mt-3 min-h-11 w-full rounded-xl bg-[#EE6C13] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">Devam Et</button>
  </div>;
}
