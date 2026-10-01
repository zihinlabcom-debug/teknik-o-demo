import type {Candidate} from './diagnostic-state';
import type {BoilerPrice} from './boiler-supabase';
import type {PriceSource} from './part-pricing';
import type {calculateOMF} from './omf-engine';
import type {ServiceCategory} from './service-categories';
import type {PaintingQuote} from './painting-types';
import type {CleaningQuote} from './cleaning-types';

// Display metadata only. None of these fields are inputs to the boiler engine.
export interface ServiceResponse {
  category:ServiceCategory|null; conversationToken:string|null; stateToken:string|null;
  categoryState:{category:Exclude<ServiceCategory,'boiler'>;stage:'start'}|null;
  answeredSystemQuestions:number; visualProgress:number; informationProgress:number; questionCount:number; awaitingAnswer:boolean;
  resultState:string; aiText:string; options:string[]; assessmentComplete:boolean;
  candidateProbabilities:Candidate[];
  groupProbabilities:{key:string;name:string;probability:number;candidateNames:string[]}[];
  diagnosticEvidence:unknown[]; diagnosticStatus:string; researchStatus:string;
  canRouteTechnician:boolean; isReadyForPrice:boolean; pricingStatus:string;
  pricingData:BoilerPrice|null; estimatedPrice:string|null; priceSource:PriceSource|null;
  deterministicOMF:ReturnType<typeof calculateOMF>|null; confidence:number;
  faultTitle:string|null; basePartPrice:number; technicalSource:{title:string;url:string;page:number|null}|null;
  paintingQuote?:PaintingQuote|null;
  cleaningQuote?:CleaningQuote|null;
  cleaningInputMode?:'home_extras'|'upholstery_items';
}
export const visualProgress = (answeredSystemQuestions:number) =>
  Math.min(100,Math.max(0,Math.floor(answeredSystemQuestions))*13);
export const isDebugQuery = (query:string) => new URLSearchParams(query).get('debug')==='1';
const terminalPriceStates=new Set(['priced','priced_candidate','uncertain_price','pricing_missing']);
export const hidesFinalTechnicalText = (state:string) => terminalPriceStates.has(state);

export interface ServicePricePresentation {title:string;amount:string|null;lines:{label:string;value:string}[]}
function money(value:number,currency:string){
  return new Intl.NumberFormat('tr-TR',{style:'currency',currency,maximumFractionDigits:2}).format(value);
}
function priceRange(min:number|null,max:number|null,currency:string){
  if(min!==null&&Number.isFinite(min)&&max!==null&&Number.isFinite(max)&&min!==max)
    return `${money(min,currency)} – ${money(max,currency)}`;
  const value=min??max;return value!==null&&Number.isFinite(value)?money(value,currency):null;
}
export function servicePricePresentation(reply:Pick<ServiceResponse,'resultState'|'estimatedPrice'|'pricingData'|'deterministicOMF'> &
  Partial<Pick<ServiceResponse,'category'|'cleaningQuote'>>):ServicePricePresentation|null {
  if(reply.resultState==='painting_manual_review')return {title:'Fiyat',amount:null,lines:[]};
  if(!terminalPriceStates.has(reply.resultState))return null;
  if(reply.resultState==='uncertain_price'||reply.resultState==='pricing_missing')return {title:'Fiyat',amount:null,lines:[]};
  if('category' in reply&&reply.category==='painting'&&reply.resultState==='priced')
    return {title:'Nihai boya hizmeti fiyatı',amount:reply.estimatedPrice,lines:[]};
  if(reply.cleaningQuote&&reply.resultState==='priced')return {
    title:reply.cleaningQuote.serviceLabel,amount:reply.estimatedPrice,
    lines:reply.cleaningQuote.days&&reply.cleaningQuote.personnel ? [
      {label:'Planlanan süre',value:`${reply.cleaningQuote.days} gün`},
      {label:'Gerekli personel',value:`${reply.cleaningQuote.personnel} kişi`},
    ] : [],
  };
  const total=reply.deterministicOMF?.breakdown.total;
  const amount=reply.estimatedPrice||(typeof total==='number'&&Number.isFinite(total)?money(total,'TRY'):null);
  if(amount)return {title:'Tahmini servis tutarı',amount,lines:[]};
  const price=reply.pricingData,lines:{label:string;value:string}[]=[];
  if(price){
    const currency=price.currency||'TRY';
    for(const [label,min,max] of [['İşçilik',price.labor_price_min,price.labor_price_max],['Parça',price.part_price_min,price.part_price_max]] as const){
      const value=priceRange(min,max,currency);if(value)lines.push({label,value});
    }
    if(price.service_fee!==null&&Number.isFinite(price.service_fee))lines.push({label:'Hizmet bedeli',value:money(price.service_fee,currency)});
  }
  // Only display amounts supplied by the backend; do not invent a total from
  // components or apply the future commercial pricing model here.
  return {title:lines.length?'Servis fiyat bilgisi':'Fiyat',amount:null,lines};
}
