import {advanceHomeCleaning, type HomeState} from './cleaning-home';
import {advanceApartmentCleaning, type ApartmentState} from './cleaning-apartment';
import {advanceUpholsteryCleaning, type UpholsteryState} from './cleaning-upholstery';
import {advanceCarpetCleaning, type CarpetState} from './cleaning-carpet';
import {CLEANING_SERVICES, moneyTRY, type CleaningQuote, type CleaningServiceType} from './cleaning-types';

export interface CleaningState {
  serviceType: CleaningServiceType | null;
  home: HomeState | null;
  apartment: ApartmentState | null;
  upholstery: UpholsteryState | null;
  carpet: CarpetState | null;
}
export interface CleaningReply {
  state: CleaningState;
  aiText: string;
  options: string[];
  resultState: 'cleaning_service_selection' | 'cleaning_question' | 'priced' | 'uncertain_price' | 'minimum_order_not_met';
  estimatedPrice: string | null;
  cleaningQuote: CleaningQuote | null;
  answeredSystemQuestions: number;
  questionCount: number;
  awaitingAnswer: boolean;
  assessmentComplete: boolean;
  isReadyForPrice: boolean;
  canRouteTechnician: boolean;
  cleaningInputMode?: 'home_extras' | 'upholstery_items' | 'carpet_items';
}

export const MINIMUM_CLEANING_ORDER_TL=1000;
export const MINIMUM_CLEANING_ORDER_MESSAGE='Minimum sipariş tutarı 1.000 TL’dir. Bu tutarın altındaki siparişleri alamıyoruz.';

const fresh = (): CleaningState => ({serviceType: null, home: null, apartment: null, upholstery: null, carpet: null});
function selectedService(message: string): CleaningServiceType | null {
  const text = message.trim().toLocaleLowerCase('tr-TR');
  const exact = CLEANING_SERVICES.find(service => service.label.toLocaleLowerCase('tr-TR') === text);
  if (exact) return exact.type;
  if (/\bev temizliğ[^ ]*/u.test(text) || /evimi temizlet/u.test(text)) return 'home_cleaning';
  if (/apartman temizliğ/u.test(text)) return 'apartment_cleaning';
  if (/(?:koltuk|yatak|berjer|çekyat).*(?:yıkama|yıkat)/u.test(text)) return 'upholstery_cleaning';
  if (/(?:halı|hali|perde|yorgan|battaniye).*(?:yıkama|yıkat)/u.test(text)) return 'carpet_cleaning';
  return null;
}
export function runCleaning(message: string, previous?: CleaningState | null,
  forcedType?: CleaningServiceType): CleaningReply {
  const state = previous ? {...previous} : fresh();
  const selected = forcedType ?? selectedService(message);
  if (selected && (selected !== state.serviceType || CLEANING_SERVICES.some(s =>
    s.type === selected && s.label.toLocaleLowerCase('tr-TR') === message.trim().toLocaleLowerCase('tr-TR')))) {
    Object.assign(state, fresh(), {serviceType: selected});
  }
  if (!state.serviceType) return {state, aiText: 'Hangi temizlik hizmetine ihtiyacınız var?',
    options: CLEANING_SERVICES.map(service => service.label), resultState: 'cleaning_service_selection',
    estimatedPrice: null, cleaningQuote: null, answeredSystemQuestions: 0, questionCount: 1,
    awaitingAnswer: true, assessmentComplete: false, isReadyForPrice: false, canRouteTechnician: false};
  const turn = state.serviceType === 'home_cleaning' ?
    advanceHomeCleaning(message, state.home ?? undefined) :
    state.serviceType === 'apartment_cleaning' ? advanceApartmentCleaning(message, state.apartment ?? undefined) :
      state.serviceType === 'upholstery_cleaning' ? advanceUpholsteryCleaning(message, state.upholstery ?? undefined) :
        advanceCarpetCleaning(message, state.carpet ?? undefined);
  if (state.serviceType === 'home_cleaning') state.home = turn.state as HomeState;
  else if (state.serviceType === 'apartment_cleaning') state.apartment = turn.state as ApartmentState;
  else if (state.serviceType === 'upholstery_cleaning') state.upholstery = turn.state as UpholsteryState;
  else state.carpet = turn.state as CarpetState;
  // The other child states stay empty even after switching services.
  if (!turn.finished) return {state, aiText: turn.text, options: turn.options, resultState: 'cleaning_question',
    cleaningInputMode: state.serviceType === 'home_cleaning' && state.home?.step === 'extras' ? 'home_extras' :
      state.serviceType === 'upholstery_cleaning' && state.upholstery?.step === 'items' ? 'upholstery_items' :
        state.serviceType === 'carpet_cleaning' && state.carpet?.step === 'items' ? 'carpet_items' : undefined,
    estimatedPrice: null, cleaningQuote: null, answeredSystemQuestions: turn.answered,
    questionCount: turn.answered + 1, awaitingAnswer: true, assessmentComplete: false,
    isReadyForPrice: false, canRouteTechnician: false};
  const quote = turn.quote;
  if(quote&&(state.serviceType==='upholstery_cleaning'||state.serviceType==='carpet_cleaning')&&
    quote.finalPrice<MINIMUM_CLEANING_ORDER_TL)return {
    state,aiText:MINIMUM_CLEANING_ORDER_MESSAGE,options:[],resultState:'minimum_order_not_met',
    estimatedPrice:null,cleaningQuote:null,answeredSystemQuestions:turn.answered,
    questionCount:turn.answered+1,awaitingAnswer:true,assessmentComplete:false,isReadyForPrice:false,
    canRouteTechnician:false,cleaningInputMode:state.serviceType==='upholstery_cleaning'?'upholstery_items':'carpet_items',
  };
  return {state, aiText: turn.text, options: [], resultState: quote ? 'priced' : 'uncertain_price',
    estimatedPrice: quote ? moneyTRY(quote.finalPrice) : null, cleaningQuote: quote,
    answeredSystemQuestions: turn.answered, questionCount: turn.answered, awaitingAnswer: false,
    assessmentComplete: true, isReadyForPrice: !!quote, canRouteTechnician: true};
}
