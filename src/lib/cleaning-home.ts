import {type CleaningQuote, type CleaningTurn, wholeNumber, yesNo} from './cleaning-types';

export type HomeStep = 'area' | 'rooms' | 'bathrooms' | 'balconies' | 'extras' | 'closetRooms' | 'pet' | 'materials' | 'equipment' | 'duration' | 'done';
export type HomeExtra = 'oven' | 'fridge' | 'kitchenCabinets' | 'roomClosets' | 'sofaChairs' | 'carpetSurface' | 'chandelier' | 'walls' | 'handFloors' | 'pet' | 'windows';
export const HOME_EXTRA_CHOICES: {key: Exclude<HomeExtra, 'pet'>; label: string; answer: string}[] = [
  {key: 'oven', label: 'Fırın', answer: 'Fırın'},
  {key: 'fridge', label: 'Buzdolabı', answer: 'Buzdolabı'},
  {key: 'kitchenCabinets', label: 'Mutfak dolabı', answer: 'Mutfak dolabı'},
  {key: 'roomClosets', label: 'Oda dolabı', answer: 'Oda dolabı'},
  {key: 'sofaChairs', label: 'Koltuk / sandalye silme', answer: 'Koltuk ve sandalye silme'},
  {key: 'carpetSurface', label: 'Halı yüzeyi silme', answer: 'Halı yüzeylerini silme'},
  {key: 'chandelier', label: 'Avize', answer: 'Avize'},
  {key: 'walls', label: 'Duvar silme', answer: 'Duvar silme'},
  {key: 'handFloors', label: 'Yerleri elle silme', answer: 'Yerleri elle silme'},
  {key: 'windows', label: 'Cam silme', answer: 'Cam silme'},
];
export interface HomeFields {
  areaM2: number;
  rooms: number;
  bathrooms: number;
  balconies: number;
  extras: HomeExtra[];
  closetRooms: number;
  materialsAvailable: boolean;
  equipmentAvailable: boolean;
  duration: 'same_day' | 'two_days' | 'flexible';
}
export interface HomeState {step: HomeStep; fields: Partial<HomeFields>; answered: number}

const bands: [number, number][] = [[60, 4], [80, 5], [100, 6], [120, 7], [140, 8], [160, 9], [180, 10], [200, 11], [225, 13], [250, 15], [301, 16]];
const extraMinutes: Partial<Record<HomeExtra, number>> = {
  oven: 30, fridge: 45, kitchenCabinets: 60, sofaChairs: 60, carpetSurface: 30,
  chandelier: 15, walls: 30, handFloors: 120, pet: 120,
};
const extraAliases: [HomeExtra, RegExp][] = [
  ['oven', /^(?:fırın|firin)(?: içi dışı)?$/i],
  ['fridge', /^buzdolabı(?: içi dışı)?$/i],
  ['kitchenCabinets', /^mutfak dolab(?:ı|ı içleri|ı içi)$/i],
  ['roomClosets', /^(?:(?:\d+)\s*)?oda dolab(?:ı|ı içleri|ı içi)$/i],
  ['sofaChairs', /^koltuk (?:ve|\+) sandalye silme$/i],
  ['carpetSurface', /^halı yüzey(?:lerini)? silme$/i],
  ['chandelier', /^avize(?: temizliği)?$/i],
  ['walls', /^duvar silme$/i],
  ['handFloors', /^yerleri elle silme$/i],
  ['pet', /^evcil hayvan$/i],
  ['windows', /^cam(?: silme)?$/i],
];

export function parseHomeExtras(text: string): {extras: HomeExtra[]; closetRooms: number} | null {
  if (/^(yok|hayır|hayir)$/i.test(text.trim())) return {extras: [], closetRooms: 0};
  const parts = text.split(/[,;\n]+/).map(part => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const extras: HomeExtra[] = [];
  let closetRooms = 0;
  for (const part of parts) {
    const found = extraAliases.find(([, pattern]) => pattern.test(part));
    if (!found || extras.includes(found[0])) return null;
    extras.push(found[0]);
    if (found[0] === 'roomClosets') {
      const quantity = part.match(/^(\d+)\s/);
      if (quantity) closetRooms = Number(quantity[1]);
    }
  }
  if (closetRooms > 100) return null;
  return {extras, closetRooms};
}

export function roundUpHalfHour(hours: number): number {
  if (!Number.isFinite(hours) || hours < 0) throw Error('Invalid person-hours');
  return Math.ceil(hours * 2 - 1e-10) / 2;
}

export function quoteHomeCleaning(fields: HomeFields): (CleaningQuote & {
  baseHours: number; roundedHours: number; laborPay: number; extraMinutes: number;
}) | null {
  const {areaM2, rooms, bathrooms, balconies, extras, closetRooms, materialsAvailable, equipmentAvailable, duration} = fields;
  if (!Number.isFinite(areaM2) || areaM2 <= 0 || !Number.isInteger(rooms) || rooms < 1 ||
      !Number.isInteger(bathrooms) || bathrooms < 1 || !Number.isInteger(balconies) || balconies < 0 ||
      !Array.isArray(extras) || !Number.isInteger(closetRooms) || closetRooms < 0 ||
      typeof materialsAvailable !== 'boolean' || typeof equipmentAvailable !== 'boolean' ||
      !['same_day', 'two_days', 'flexible'].includes(duration)) return null;
  if (areaM2 > 300) return null;
  const baseHours = bands.find(([limit]) => Math.max(40, areaM2) < limit)?.[1];
  if (baseHours === undefined || extras.some(extra => !extraAliases.some(([id]) => id === extra)) ||
      (extras.includes('roomClosets') ? closetRooms < 1 : closetRooms !== 0)) return null;
  const windowsHours = extras.includes('windows') ? rooms === 1 ? 1 : rooms <= 3 ? 2 : 3 : 0;
  const minutes = (bathrooms - 1) * 20 + closetRooms * 30 + windowsHours * 60 +
    extras.reduce((sum, extra) => sum + (extraMinutes[extra] ?? 0), 0);
  const roundedHours = Math.ceil((baseHours * 60 + minutes) / 30) / 2;
  const laborPay = Math.max(2300, roundedHours * 350);
  const maxFlexibleDays = rooms >= 4 ? 3 : 2;
  const days = duration === 'same_day' ? 1 : duration === 'two_days' ? 2 :
    Math.min(Math.max(1, Math.ceil(roundedHours / 8)), maxFlexibleDays);
  const personnel = Math.ceil(roundedHours / (days * 8));
  const finalPrice = laborPay * 1.15 * 1.15 + (materialsAvailable ? 0 : 1000) + (equipmentAvailable ? 0 : 1000);
  return {serviceType: 'home_cleaning', serviceLabel: 'Ev Temizliği', finalPrice, baseHours,
    roundedHours, laborPay, extraMinutes: minutes, days, personnel};
}

const prompts: Record<Exclude<HomeStep, 'done'>, {text: string; options: string[]}> = {
  area: {text: 'Eviniz kaç metrekare?', options: []},
  rooms: {text: 'Ev tipi nedir? (Örneğin 3+1)', options: ['1+1', '2+1', '3+1', '4+1']},
  bathrooms: {text: 'Kaç banyo temizlenecek?', options: []},
  balconies: {text: 'Kaç balkon var?', options: []},
  extras: {text: 'Hangi ek işleri istersiniz? Birden fazla seçim yapıp Devam Et’e basabilirsiniz.', options: []},
  closetRooms: {text: 'Kaç oda dolabının içi temizlenecek?', options: []},
  pet: {text: 'Evde evcil hayvan var mı?', options: ['Evet', 'Hayır']},
  materials: {text: 'Temizlik malzemeleri evde mevcut mu?', options: ['Evet', 'Hayır']},
  equipment: {text: 'Elektrik süpürgesi ve temel ekipman mevcut mu?', options: ['Evet', 'Hayır']},
  duration: {text: 'Tamamlanma süresi tercihiniz nedir?', options: ['Aynı gün', '2 gün', 'Süre önemli değil']},
};
const next: Record<Exclude<HomeStep, 'done'>, HomeStep> = {
  area: 'rooms', rooms: 'bathrooms', bathrooms: 'balconies', balconies: 'extras', extras: 'pet',
  closetRooms: 'pet', pet: 'materials', materials: 'equipment', equipment: 'duration', duration: 'done',
};
function prompt(state: HomeState, invalid = false): CleaningTurn<HomeState> {
  const question = prompts[state.step as Exclude<HomeStep, 'done'>];
  return {state, text: invalid ? `Yanıtı anlayamadım. ${question.text}` : question.text,
    options: question.options, finished: false, quote: null, answered: state.answered};
}
export function advanceHomeCleaning(message: string, previous?: HomeState): CleaningTurn<HomeState> {
  const state: HomeState = previous ? {step: previous.step, fields: {...previous.fields}, answered: previous.answered} :
    {step: 'area', fields: {}, answered: 0};
  if (!previous) return prompt(state);
  if (state.step === 'done') {
    const quote = quoteHomeCleaning(state.fields as HomeFields);
    return {state, text: quote ? 'Ev Temizliği fiyatı hazır.' : 'Fiyat belirsiz; yerinde inceleme gerekir.',
      options: [], finished: true, quote, answered: state.answered};
  }
  const answer = message.trim();
  switch (state.step) {
    case 'area': {
      const match = answer.match(/^(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metrekare)?$/i);
      const area = match ? Number(match[1].replace(',', '.')) : NaN;
      if (!Number.isFinite(area) || area <= 0) return prompt(state, true);
      state.fields.areaM2 = area;
      break;
    }
    case 'rooms': {
      const match = answer.match(/^([1-9]\d?)\s*\+\s*1(?:\s*ve üzeri)?$/i);
      if (!match) return prompt(state, true);
      state.fields.rooms = Number(match[1]);
      break;
    }
    case 'bathrooms': {
      const count = wholeNumber(answer, 1, 100);
      if (count === null) return prompt(state, true);
      state.fields.bathrooms = count;
      break;
    }
    case 'balconies': {
      const count = wholeNumber(answer, 0, 100);
      if (count === null) return prompt(state, true);
      state.fields.balconies = count;
      break;
    }
    case 'extras': {
      const parsed = parseHomeExtras(answer);
      if (!parsed) return prompt(state, true);
      state.fields.extras = parsed.extras;
      state.fields.closetRooms = parsed.closetRooms;
      break;
    }
    case 'closetRooms': {
      const count = wholeNumber(answer, 1, 100);
      if (count === null) return prompt(state, true);
      state.fields.closetRooms = count;
      break;
    }
    case 'pet': {
      const value = yesNo(answer);
      if (value === null) return prompt(state, true);
      state.fields.extras = value ? [...(state.fields.extras??[]), 'pet'] : state.fields.extras??[];
      break;
    }
    case 'materials': {
      const value = yesNo(answer);
      if (value === null) return prompt(state, true);
      state.fields.materialsAvailable = value;
      break;
    }
    case 'equipment': {
      const value = yesNo(answer);
      if (value === null) return prompt(state, true);
      state.fields.equipmentAvailable = value;
      break;
    }
    case 'duration': {
      const value = answer.toLocaleLowerCase('tr-TR');
      if (value === 'aynı gün') state.fields.duration = 'same_day';
      else if (value === '2 gün') state.fields.duration = 'two_days';
      else if (value === 'süre önemli değil') state.fields.duration = 'flexible';
      else return prompt(state, true);
      break;
    }
  }
  state.answered++;
  if (state.fields.areaM2! > 300) {
    state.step = 'done';
    return {state, text: '300 m² üzerindeki evler için fiyat belirsiz; yerinde inceleme gerekir.',
      options: [], finished: true, quote: null, answered: state.answered};
  }
  const justAnswered = state.step;
  state.step = justAnswered === 'extras' && state.fields.extras?.includes('roomClosets') && !state.fields.closetRooms ?
    'closetRooms' : next[justAnswered];
  if (state.step === 'pet' && state.fields.extras?.includes('pet')) state.step = 'materials';
  if (state.step !== 'done') return prompt(state);
  const quote = quoteHomeCleaning(state.fields as HomeFields);
  return {state, text: quote ? 'Ev Temizliği fiyatı hazır.' : 'Fiyat belirsiz; yerinde inceleme gerekir.',
    options: [], finished: true, quote, answered: state.answered};
}
