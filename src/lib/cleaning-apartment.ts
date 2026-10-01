import {type CleaningQuote, type CleaningTurn, wholeNumber, yesNo} from './cleaning-types';

export type ApartmentStep = 'floors' | 'apartments' | 'glass' | 'elevator' | 'materials' | 'done';
export interface ApartmentFields {
  floors: number;
  apartments: number;
  glass: 'none' | 'normal' | 'full';
  glassCount: number;
  elevator: boolean;
  materialsAvailable: boolean;
}
export interface ApartmentState {step: ApartmentStep; fields: Partial<ApartmentFields>; answered: number}

export function quoteApartmentCleaning(fields: ApartmentFields): (CleaningQuote & {
  personHours: number; laborPay: number; costBase: number;
}) | null {
  const {floors, apartments, glass, glassCount, elevator, materialsAvailable} = fields;
  if (!Number.isSafeInteger(floors) || floors < 1 || floors > 1000 ||
      !Number.isSafeInteger(apartments) || apartments < 1 || apartments > 100000 ||
      !['none', 'normal', 'full'].includes(glass) || !Number.isSafeInteger(glassCount) || glassCount < 0 ||
      typeof elevator !== 'boolean' || typeof materialsAvailable !== 'boolean') return null;
  const personHours = floors * 1.5 + (glass === 'full' ? floors * 3 : glass === 'normal' ? floors : 0) +
    (elevator ? 1 : 0);
  const laborPay = Math.max(personHours * 350, 2000);
  const costBase = laborPay + (materialsAvailable ? 0 : 1000);
  return {serviceType: 'apartment_cleaning', serviceLabel: 'Apartman Temizliği', finalPrice: costBase * 1.15 * 1.15,
    personHours, laborPay, costBase};
}

const prompts: Record<Exclude<ApartmentStep, 'done'>, {text: string; options: string[]}> = {
  floors: {text: 'Apartman kaç katlı?', options: []},
  apartments: {text: 'Apartmanda toplam kaç daire var?', options: []},
  glass: {text: 'Her kattaki cam tipi nedir?', options: ['Cam yok', 'Normal cam', 'Full cam']},
  elevator: {text: 'Asansör temizlenecek mi?', options: ['Evet', 'Hayır']},
  materials: {text: 'Apartman yönetiminde yeterli temizlik malzemesi var mı?', options: ['Evet', 'Hayır']},
};
const next: Record<Exclude<ApartmentStep, 'done'>, ApartmentStep> = {
  floors: 'apartments', apartments: 'glass', glass: 'elevator',
  elevator: 'materials', materials: 'done',
};
function prompt(state: ApartmentState, invalid = false): CleaningTurn<ApartmentState> {
  const question = prompts[state.step as Exclude<ApartmentStep, 'done'>];
  return {state, text: invalid ? `Yanıtı anlayamadım. ${question.text}` : question.text,
    options: question.options, finished: false, quote: null, answered: state.answered};
}
export function advanceApartmentCleaning(message: string, previous?: ApartmentState): CleaningTurn<ApartmentState> {
  const state: ApartmentState = previous ? {step: previous.step, fields: {...previous.fields}, answered: previous.answered} :
    {step: 'floors', fields: {}, answered: 0};
  if (!previous) return prompt(state);
  if (state.step === 'done') {
    const quote = quoteApartmentCleaning(state.fields as ApartmentFields);
    return {state, text: quote ? 'Apartman Temizliği fiyatı hazır.' : 'Fiyat belirsiz; yerinde inceleme gerekir.',
      options: [], finished: true, quote, answered: state.answered};
  }
  const answer = message.trim();
  switch (state.step) {
    case 'floors': {
      const value = wholeNumber(answer, 1, 1000);
      if (value === null) return prompt(state, true);
      state.fields.floors = value;
      break;
    }
    case 'apartments': {
      const value = wholeNumber(answer, 1, 100000);
      if (value === null) return prompt(state, true);
      state.fields.apartments = value;
      break;
    }
    case 'glass': {
      const value = answer.toLocaleLowerCase('tr-TR');
      if (value === 'cam yok') state.fields.glass = 'none';
      else if (value === 'normal cam') state.fields.glass = 'normal';
      else if (value === 'full cam') state.fields.glass = 'full';
      else return prompt(state, true);
      break;
    }
    case 'elevator': {
      const value = yesNo(answer);
      if (value === null) return prompt(state, true);
      state.fields.elevator = value;
      break;
    }
    case 'materials': {
      const value = yesNo(answer);
      if (value === null) return prompt(state, true);
      state.fields.materialsAvailable = value;
      break;
    }
  }
  state.answered++;
  const justAnswered = state.step;
  state.step = next[justAnswered];
  if (justAnswered === 'glass') state.fields.glassCount = 0;
  if (state.step !== 'done') return prompt(state);
  const quote = quoteApartmentCleaning(state.fields as ApartmentFields);
  return {state, text: quote ? 'Apartman Temizliği fiyatı hazır.' : 'Fiyat belirsiz; yerinde inceleme gerekir.',
    options: [], finished: true, quote, answered: state.answered};
}
