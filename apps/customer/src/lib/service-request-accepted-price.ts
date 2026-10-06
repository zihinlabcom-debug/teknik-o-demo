import type {CategoryConversationState} from './service-conversation';

export interface AcceptedMaximumPrice {
  currency:'TRY';
  subtotal:number;
  serviceFee:number;
  totalAmount:number;
  breakdown:Record<string,unknown>;
}

const cents=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=9999999999.99
  ?Math.round((value+Number.EPSILON)*100)/100:null;

// The signed final response is produced by a server-side pricing engine. This
// function only copies its verified price components into the accepted quote.
export function acceptedMaximumPrice(state:CategoryConversationState):AcceptedMaximumPrice|null {
  const final=state.lastResponse;
  if(!final||final.assessmentComplete!==true||final.resultState==='painting_manual_review'||
    final.resultState==='uncertain_price'||final.resultState==='pricing_missing')return null;

  if(state.category==='painting'&&final.resultState==='priced'){
    const quote=final.paintingQuote;
    const total=quote&&cents(quote.finalPrice),fee=quote&&cents(quote.serviceFee);
    if(total===null||total===undefined||total<=0||fee===null||fee===undefined||fee>total)return null;
    return {currency:'TRY',subtotal:cents(total-fee)!,serviceFee:fee,totalAmount:total,
      breakdown:{source:'painting_quote',...quote}};
  }

  if(['cleaning','sofa_cleaning','carpet_cleaning'].includes(state.category??'')&&final.resultState==='priced'){
    const quote=final.cleaningQuote;
    const total=quote&&cents(quote.finalPrice);
    if(total===null||total===undefined||total<=0)return null;
    return {currency:'TRY',subtotal:total,serviceFee:0,totalAmount:total,
      breakdown:{source:'cleaning_quote',...quote}};
  }

  if(state.category==='boiler'&&final.isReadyForPrice===true&&final.canRouteTechnician===true&&
    final.priceSource&&final.technicalSource&&final.deterministicOMF){
    const pricing=final.deterministicOMF.breakdown;
    const total=cents(pricing.total),fee=cents(pricing.service);
    if(total===null||total<=0||fee===null||fee>total)return null;
    return {currency:'TRY',subtotal:cents(total-fee)!,serviceFee:fee,totalAmount:total,
      breakdown:{source:'deterministic_omf',...pricing,warrantyDays:final.deterministicOMF.warrantyDays}};
  }
  return null;
}
