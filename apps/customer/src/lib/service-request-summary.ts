import type {CategoryConversationState} from './service-conversation';
import {UPHOLSTERY_PRODUCTS} from './cleaning-upholstery';
import {CARPET_PRODUCTS} from './cleaning-carpet';

const titles={
  boiler:'Kombi servis talebi',painting:'Boya hizmet talebi',cleaning:'Temizlik hizmet talebi',
  sofa_cleaning:'Koltuk / Yatak Yıkama talebi',carpet_cleaning:'Halı Yıkama talebi',
} as const;
const bounded=(value:string,max:number)=>Array.from(value).slice(0,max).join('');
const amount=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=100000
  ?new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(value):null;
const count=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0&&value<=100000?value:null;
const safeFaultTitle=(value:unknown)=>{
  if(typeof value!=='string')return null;
  const title=value.normalize('NFC').trim().replace(/ +/g,' ');
  return title.length>0&&title.length<=120&&title!=='Ön teşhis'&&
    /^[\p{L}\p{N} .,/'()+\-–—]+$/u.test(title)?title:null;
};

export function serviceRequestSummary(state:CategoryConversationState){
  const {category,lastResponse:final}=state;
  const fallback=category&&category in titles?titles[category as keyof typeof titles]:'Hizmet talebi';
  let issueTitle=fallback;
  let problemDescription=fallback;

  if(category==='painting'&&state.paintingServiceType==='wall_painting'){
    issueTitle='Duvar Boyama';
    if(final?.resultState==='painting_manual_review'){
      issueTitle='Duvar Boyama — yerinde inceleme';
      problemDescription='Duvar Boyama; ciddi sıva veya derin hasar için yerinde inceleme gerekir.';
    }else{
      const quote=final?.resultState==='priced'?final.paintingQuote:null;
      const wall=amount(quote?.wallAreaM2),ceiling=amount(quote?.ceilingAreaM2);
      const scope=[wall&&`${wall} m² hesaplanan duvar alanı`,ceiling&&`${ceiling} m² tavan alanı`].filter(Boolean);
      problemDescription=scope.length?`Duvar Boyama; ${scope.join('; ')}.`:'Duvar Boyama hizmet talebi';
    }
  }else if(category==='boiler'){
    // The legacy price title names a sourced part; it is not a confirmed fault.
    const sourceBacked=final?.isReadyForPrice===true&&final.priceSource&&final.technicalSource;
    const part=sourceBacked?safeFaultTitle(final.faultTitle):null;
    if(part){
      issueTitle=`Kombi servis talebi — ${part}`;
      problemDescription=`Kombi servis talebi; değerlendirmede esas alınan parça: ${part}. Kesin arıza yerinde doğrulanmalıdır.`;
    }
  }else if(category==='cleaning'||category==='sofa_cleaning'||category==='carpet_cleaning'){
    const cleaning=state.cleaningState;
    const type=cleaning?.serviceType;
    const matching=category==='cleaning'||category==='sofa_cleaning'&&type==='upholstery_cleaning'||
      category==='carpet_cleaning'&&type==='carpet_cleaning';
    if(matching&&type==='home_cleaning'){
      issueTitle='Ev Temizliği';
      const fields=cleaning?.home?.fields;
      const area=amount(fields?.areaM2),rooms=count(fields?.rooms),bathrooms=count(fields?.bathrooms);
      problemDescription=['Ev Temizliği',area&&`${area} m²`,rooms&&`${rooms} oda`,bathrooms&&`${bathrooms} banyo`]
        .filter(Boolean).join('; ');
    }else if(matching&&type==='apartment_cleaning'){
      issueTitle='Apartman Temizliği';
      const fields=cleaning?.apartment?.fields;
      const floors=count(fields?.floors),apartments=count(fields?.apartments);
      problemDescription=['Apartman Temizliği',floors&&`${floors} kat`,apartments&&`${apartments} daire`]
        .filter(Boolean).join('; ');
    }else if(matching&&type==='upholstery_cleaning'){
      issueTitle='Koltuk / Yatak Yıkama';
      const items=(cleaning?.upholstery?.items??[]).flatMap(item=>{
        const product=UPHOLSTERY_PRODUCTS.find(p=>p.key===item.key),quantity=count(item.quantity);
        return product&&quantity?[`${quantity} adet ${product.label}`]:[];
      });
      problemDescription=items.length?`${issueTitle}; ${items.join('; ')}.`:`${issueTitle} talebi`;
    }else if(matching&&type==='carpet_cleaning'){
      issueTitle='Halı Yıkama';
      const items=(cleaning?.carpet?.items??[]).flatMap(item=>{
        const product=CARPET_PRODUCTS.find(p=>p.key===item.key);
        if(!product)return [];
        const quantity=product.unit==='m2'?count(item.areasM2?.length):count(item.quantity);
        return quantity?[`${quantity} adet ${product.label}`]:[];
      });
      problemDescription=items.length?`${issueTitle}; ${items.join('; ')}.`:`${issueTitle} talebi`;
    }
  }
  return {issueTitle:bounded(issueTitle,240),problemDescription:bounded(problemDescription,4000)};
}
