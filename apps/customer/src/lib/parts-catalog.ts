export type PartKey = 'basınç sensörü' | 'kalorifer ntc sensör' | 'sıcak su ntc sensör' | 'fan' | 'kart' | 'üç yollu vana';

export interface PartMapping {
  brand: string;
  model: string;
  part: PartKey;
  sku: string;
  title: string;
  url: string;
  risk: number;
}

// Supplier product codes, not manufacturer OEM numbers. Compatibility is limited
// to the model and component explicitly named on each linked supplier page.
// Never add a generic brand/category URL or a guessed SKU here.
export const PART_MAPPINGS: readonly PartMapping[] = [
  {
    brand: 'Demirdöküm', model: 'Nitromix', part: 'basınç sensörü', sku: 'ONE1247',
    title: 'Demirdöküm Nitromix Kombi Su Basınç Sondası',
    url: 'https://www.oneyedekparca.com/demirdokum-nitromix-kombi-su-basinc-sondasi', risk: 300,
  },
  {
    brand: 'Demirdöküm', model: 'Atron', part: 'basınç sensörü', sku: 'ONE1244',
    title: 'Demirdöküm Atron Kombi Su Basınç Sondası',
    url: 'https://www.oneyedekparca.com/demirdokum-atron-kombi-su-basinc-sondasi', risk: 300,
  },
  {
    brand: 'Arçelik', model: 'DGK 26 H LCD', part: 'kalorifer ntc sensör', sku: 'ONE1874',
    title: 'Arçelik DGK 26 H Lcd Kombi Kalorifer Ntc Sensörü',
    url: 'https://www.oneyedekparca.com/arcelik-dgk-26-h-lcd-kombi-kalorifer-ntc-sensoru', risk: 150,
  },
  {
    brand: 'Arçelik', model: 'DGK 26 H LCD', part: 'fan', sku: 'ONE1883',
    title: 'Arçelik DGK 26 H Lcd Kombi Fan Motoru',
    url: 'https://www.oneyedekparca.com/arcelik-dgk-26-h-lcd-kombi-fan-motoru', risk: 400,
  },
];

export function normalizePartText(value: string) {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function matchPart(brand: string, model: string, part: string) {
  const matches = PART_MAPPINGS.filter(item =>
    normalizePartText(item.brand) === normalizePartText(brand) &&
    normalizePartText(item.model) === normalizePartText(model) &&
    normalizePartText(item.part) === normalizePartText(part));
  return matches.length === 1 ? matches[0] : undefined;
}
