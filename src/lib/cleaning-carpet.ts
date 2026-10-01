import {type CleaningQuote, type CleaningTurn} from './cleaning-types';

export const CARPET_PRODUCTS = [
  {key:'acrylic',label:'Akrilik Halı Yıkama',unit:'m2',price:120},
  {key:'machine',label:'Makina Halısı Yıkama',unit:'m2',price:99},
  {key:'mega',label:'Mega Halı Yıkama',unit:'m2',price:120},
  {key:'fringed',label:'Saçaklı Halı Yıkama',unit:'m2',price:120},
  {key:'shaggy',label:'Shaggy Halı Yıkama',unit:'m2',price:120},
  {key:'machine_wool',label:'Makina Yünü Halı Yıkama',unit:'m2',price:120},
  {key:'hand_wool',label:'El Yünü Halı Yıkama',unit:'m2',price:200},
  {key:'nepal',label:'Nepal Halı Yıkama',unit:'m2',price:200},
  {key:'silk',label:'İpek Halı Yıkama',unit:'m2',price:200},
  {key:'non_slip',label:'Kaymaz Halı Yıkama',unit:'m2',price:100},
  {key:'roller_blind',label:'Stor Perde Yıkama',unit:'m2',price:99},
  {key:'zebra_blind',label:'Zebra Perde Yıkama',unit:'m2',price:120},
  {key:'fiber_duvet',label:'Elyaf Yorgan Yıkama',unit:'adet',price:599},
  {key:'wool_duvet',label:'Yün Yorgan Yıkama',unit:'adet',price:599},
  {key:'blanket',label:'Battaniye Yıkama',unit:'adet',price:499},
] as const;
export type CarpetKey = typeof CARPET_PRODUCTS[number]['key'];
export interface CarpetItem {key:CarpetKey; areasM2?:number[]; quantity?:number}
export interface CarpetState {step:'items'|'done'; items:CarpetItem[]; answered:number}
export interface CarpetQuote extends CleaningQuote {baseTotal:number; hakEdis:number; items:{key:CarpetKey; label:string; quantity:number; billableM2?:number[]; total:number}[]}

const normalize=(value:string)=>value.toLocaleLowerCase('tr-TR').replace(/ı/g,'i')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const productFor=(name:string)=>CARPET_PRODUCTS.find(product=>{
  const label=normalize(product.label);
  return normalize(name)===label||normalize(name)===label.replace(/ yikama$/,'');
});

export function parseCarpetBasket(text:string):{items:CarpetItem[]; missing:string|null; unknown:boolean} {
  const parts=text.split(';').map(part=>part.trim()).filter(Boolean);
  if(!parts.length)return {items:[],missing:null,unknown:false};
  const items:CarpetItem[]=[],seen=new Set<CarpetKey>();
  for(const part of parts){
    const separator=part.indexOf(':');
    if(separator<0)return {items:[],missing:null,unknown:true};
    const product=productFor(part.slice(0,separator));
    if(!product||seen.has(product.key))return {items:[],missing:null,unknown:true};
    seen.add(product.key);
    const values=part.slice(separator+1).trim();
    if(product.unit==='m2'){
      const entries=values.split('+').map(value=>value.trim());
      const areasM2:number[]=[];
      for(const [index,entry] of entries.entries()){
        const match=entry.match(/^(\d+(?:[.,]\d+)?)\s*m(?:²|2)$/iu);
        const area=match?Number(match[1].replace(',','.')):NaN;
        if(!Number.isFinite(area)||area<=0)return {items:[],missing:`${product.label} — ${index+1}. ürünün m² bilgisi eksik veya geçersiz.`,unknown:false};
        areasM2.push(area);
      }
      items.push({key:product.key,areasM2});
    }else{
      const match=values.match(/^(\d+)\s*adet$/iu);
      const quantity=match?Number(match[1]):NaN;
      if(!Number.isSafeInteger(quantity)||quantity<=0)return {items:[],missing:`${product.label} için adet bilgisi eksik veya geçersiz.`,unknown:false};
      items.push({key:product.key,quantity});
    }
  }
  return {items,missing:null,unknown:false};
}

export function quoteCarpetCleaning(items:CarpetItem[]):CarpetQuote|null {
  if(!Array.isArray(items)||!items.length)return null;
  const lines:CarpetQuote['items']=[];
  for(const item of items){
    const product=CARPET_PRODUCTS.find(p=>p.key===item.key);
    if(!product||lines.some(line=>line.key===item.key))return null;
    if(product.unit==='m2'){
      if(!Array.isArray(item.areasM2)||!item.areasM2.length||item.areasM2.length>100||item.quantity!==undefined||
        item.areasM2.some(area=>typeof area!=='number'||!Number.isFinite(area)||area<=0))return null;
      const billableM2=item.areasM2.map(Math.ceil);
      lines.push({key:item.key,label:product.label,quantity:billableM2.length,billableM2,
        total:billableM2.reduce((total,area)=>total+area*product.price,0)});
    }else{
      if(!Number.isSafeInteger(item.quantity)||!item.quantity||item.quantity<0||item.quantity>100||item.areasM2!==undefined)return null;
      lines.push({key:item.key,label:product.label,quantity:item.quantity,total:item.quantity*product.price});
    }
  }
  const baseTotal=lines.reduce((total,line)=>total+line.total,0),hakEdis=Math.max(baseTotal,1000);
  if(!Number.isSafeInteger(baseTotal))return null;
  return {serviceType:'carpet_cleaning',serviceLabel:'Halı, Perde ve Ev Tekstili Yıkama',
    baseTotal,hakEdis,finalPrice:hakEdis*1.15*1.15,items:lines};
}

const question='Yıkanacak halı, perde, yorgan ve battaniyeleri seçip her halı/perdenin m² bilgisini ayrı girin.';
export function advanceCarpetCleaning(message:string,previous?:CarpetState):CleaningTurn<CarpetState> {
  const state:CarpetState=previous?{step:previous.step,items:[...previous.items],answered:previous.answered}:
    {step:'items',items:[],answered:0};
  if(!previous)return {state,text:question,options:[],finished:false,quote:null,answered:0};
  if(state.step==='done')return {state,text:'Halı, Perde ve Ev Tekstili Yıkama fiyatı hazır.',options:[],
    finished:true,quote:quoteCarpetCleaning(state.items),answered:state.answered};
  const parsed=parseCarpetBasket(message);
  if(parsed.unknown)return {state,text:'Ürün türü doğrulanamadı. Bu ürün için otomatik fiyat verilemiyor; yerinde değerlendirme gerekir.',
    options:[],finished:true,quote:null,answered:state.answered};
  if(parsed.missing||!parsed.items.length)return {state,text:`${parsed.missing??'Sepette en az bir ürün bulunmalı.'} ${question}`,
    options:[],finished:false,quote:null,answered:state.answered};
  const quote=quoteCarpetCleaning(parsed.items);
  if(!quote)return {state,text:`Ürün veya ölçü bilgisi geçersiz. ${question}`,options:[],finished:false,quote:null,answered:state.answered};
  state.items=parsed.items;state.step='done';state.answered++;
  return {state,text:'Halı, Perde ve Ev Tekstili Yıkama fiyatı hazır.',options:[],finished:true,quote,answered:state.answered};
}
