import {type CleaningQuote, type CleaningTurn} from './cleaning-types';

export const UPHOLSTERY_PRODUCTS = [
  {key: 'armchair', label: 'Berjer', price: 500, aliases: ['berjer']},
  {key: 'sofa_bed', label: 'Tek çekyat', price: 1000, aliases: ['tek çekyat', 'çekyat']},
  {key: 'sofa_2', label: "2'li koltuk", price: 1000, aliases: ["2'li koltuk", '2li koltuk', 'ikili koltuk']},
  {key: 'sofa_3', label: "3'lü koltuk", price: 1000, aliases: ["3'lü koltuk", '3lü koltuk', 'üçlü koltuk', 'uclu koltuk']},
  {key: 'single_bed', label: 'Tek kişilik yatak', price: 1000, aliases: ['tek kişilik yatak']},
  {key: 'double_bed', label: 'Çift kişilik yatak', price: 1800, aliases: ['çift kişilik yatak', 'çift yatak']},
  {key: 'sofa_set', label: 'Koltuk takımı yıkama', price: 2500, aliases: ['koltuk takımı yıkama', 'koltuk takımı', 'oturma grubu']},
  {key: 'cushioned_set', label: 'Minderli koltuk takımı', price: 3000, aliases: ['minderli koltuk takımı']},
  {key: 'leather_set', label: 'Deri koltuk takımı', price: 5500, aliases: ['deri koltuk takımı']},
] as const;
export type UpholsteryKey = typeof UPHOLSTERY_PRODUCTS[number]['key'];
export interface UpholsteryItem {key: UpholsteryKey; quantity: number}
export interface UpholsteryState {step: 'items' | 'done'; items: UpholsteryItem[]; answered: number}
const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’‘`´]/g, '')
  .replace(/[,;.!?\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
const productAliases = UPHOLSTERY_PRODUCTS.flatMap(product => product.aliases.map(alias =>
  ({key: product.key, text: normalize(alias)}))).sort((a, b) => b.text.length - a.text.length);
export function parseUpholsteryItems(text: string): UpholsteryItem[] | null {
  let remaining = normalize(text);
  if (!remaining) return null;
  const amounts = new Map<UpholsteryKey, number>();
  while (remaining) {
    const match = remaining.match(/^(\d+)\s*(?:adet|tane|x|×)?\s+(.+)$/);
    if (!match) return null;
    const quantity = Number(match[1]);
    const alias = productAliases.find(item => match[2] === item.text || match[2].startsWith(`${item.text} `));
    if (!alias || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) return null;
    amounts.set(alias.key, (amounts.get(alias.key) ?? 0) + quantity);
    if (amounts.get(alias.key)! > 100) return null;
    remaining = match[2].slice(alias.text.length).trim().replace(/^ve\s+/, '');
  }
  const items = [...amounts].map(([key, quantity]) => ({key, quantity}));
  return items;
}

export function quoteUpholsteryCleaning(items: UpholsteryItem[]): (CleaningQuote & {basePrice: number}) | null {
  if (!Array.isArray(items) || !items.length) return null;
  let basePrice = 0;
  for (const item of items) {
    const product = UPHOLSTERY_PRODUCTS.find(p => p.key === item.key);
    if (!product || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) return null;
    basePrice += product.price * item.quantity;
  }
  return {serviceType: 'upholstery_cleaning', serviceLabel: 'Koltuk / Yatak Yıkama',
    basePrice, finalPrice: basePrice * 1.15 * 1.15};
}

const question = 'Yıkanacak ürünleri seçip adetlerini belirleyin.';
export function advanceUpholsteryCleaning(message: string, previous?: UpholsteryState): CleaningTurn<UpholsteryState> {
  const state: UpholsteryState = previous ? {step: previous.step, items: [...previous.items], answered: previous.answered} :
    {step: 'items', items: [], answered: 0};
  if (!previous) return {state, text: question, options: [], finished: false, quote: null, answered: 0};
  const items = parseUpholsteryItems(message);
  if (!items) return {state, text: `Ürün veya adet net değil. ${question}`, options: [],
    finished: false, quote: null, answered: state.answered};
  state.items = items;
  state.step = 'done';
  state.answered++;
  return {state, text: 'Koltuk / Yatak Yıkama fiyatı hazır.', options: [], finished: true,
    quote: quoteUpholsteryCleaning(items), answered: state.answered};
}
