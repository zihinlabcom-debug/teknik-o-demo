export type CleaningServiceType = 'home_cleaning' | 'apartment_cleaning' | 'upholstery_cleaning' | 'carpet_cleaning';

export const CLEANING_SERVICES = [
  {type: 'home_cleaning', label: 'Ev Temizliği'},
  {type: 'apartment_cleaning', label: 'Apartman Temizliği'},
  {type: 'upholstery_cleaning', label: 'Koltuk / Yatak Yıkama'},
  {type: 'carpet_cleaning', label: 'Halı Yıkama'},
] as const;

export interface CleaningQuote {
  serviceType: CleaningServiceType;
  serviceLabel: string;
  finalPrice: number;
  personnel?: number;
  days?: number;
}

export interface CleaningTurn<T> {
  state: T;
  text: string;
  options: string[];
  finished: boolean;
  quote: CleaningQuote | null;
  answered: number;
}

export function moneyTRY(value: number): string {
  return new Intl.NumberFormat('tr-TR', {style: 'currency', currency: 'TRY', maximumFractionDigits: 2}).format(value);
}

export function wholeNumber(text: string, min: number, max = 1000): number | null {
  const match = text.trim().match(/^(\d+)(?:\s*(?:adet|tane|banyo|balkon|kat|daire))?$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

export function yesNo(text: string): boolean | null {
  const normalized = text.trim().toLocaleLowerCase('tr-TR');
  if (/^(evet|var|mevcut)$/.test(normalized)) return true;
  if (/^(hayır|hayir|yok|mevcut değil)$/.test(normalized)) return false;
  return null;
}
