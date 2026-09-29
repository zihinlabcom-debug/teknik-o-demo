import {createHmac,timingSafeEqual} from 'node:crypto';
import type {DiagnosisMessage} from './diagnosis';
import {normalizePartText} from './parts-catalog';
import {EXTRA_PUTTY_PRICE_M2,OLD_PAINTED_CEILING_POZ,PAINTING_POSITIONS,type PaintingPoz,type PaintingType} from './painting-price-data';
import type {PaintingFields,PaintingQuestionKey,PaintingQuote,PaintingState} from './painting-types';

export const BASE_WALL_COEFFICIENT=3;
export const REFERENCE_CEILING_HEIGHT_M=2.5;
export const PAINTING_RISK_RATE=0.15;
export const PAINTING_SERVICE_FEE_RATE=0.15;
export const REGIONAL_COEFFICIENT=1 as const;
const secret=()=>process.env.DIAGNOSIS_STATE_SECRET||process.env.OPENAI_API_KEY;
const text=(value:string)=>normalizePartText(value);
const money=(value:number)=>`${new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,
 maximumFractionDigits:2}).format(value)} TL`;
const numeric=(value:string)=>Number(value.replace(',','.'));
const paintedWallArea=(netAreaM2:number,heightM:number)=>
 netAreaM2*BASE_WALL_COEFFICIENT*heightM/REFERENCE_CEILING_HEIGHT_M;
const numberText=(value:string)=>value.toLocaleLowerCase('tr-TR').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const numberFrom=(value:string,field:'area'|'height'|'rooms',pending=false):number|null=>{
 const normalized=numberText(value);
 if(field==='rooms'){
  const match=pending?normalized.match(/^(\d{1,3})(?: oda)?$/):
    normalized.match(/(?:boyanacak|boyatacagim|boyatacagiz|yalniz|sadece)\s+(\d{1,3})\s+oda\b|\b(\d{1,3})\s+oda\s+boyanacak\b/);
  const count=match?Number(match[1]??match[2]):NaN;
  return Number.isInteger(count)&&count>=0&&count<=500?count:null;
 }
 if(field==='area'){
  const match=normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metrekare)(?![a-z])/)??
    (pending?normalized.match(/^(\d+(?:[.,]\d+)?)$/):null);
  if(!match||match.index!==undefined&&match.index>0&&normalized[match.index-1]==='-'||
    /\b(?:duvar|tavan)\s+alan\w*/.test(normalized)||
    /\b(?:m²|m2|metrekare)\s+(?:duvar|tavan)\b/.test(normalized))return null;
  const amount=numeric(match[1]);return Number.isFinite(amount)&&amount>0&&amount<=100000?amount:null;
 }
 const match=normalized.match(/(?:tavan yuksekligi|tavan yukseklik|yukseklik)\s*(?:yaklasik|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:m|metre)?\b/)??
   (pending?normalized.match(/^(\d+(?:[.,]\d+)?)\s*(?:m|metre)?$/):null);
 const amount=match?numeric(match[1]):NaN;return Number.isFinite(amount)&&amount>=1.5&&amount<=30?amount:null;
};
const typeLabels:Record<PaintingType,string>={
 white_lime:'Beyaz kireç badana',silicone_matte:'Silikonlu mat',plastic_matte:'Plastik mat',
 silicone_silk_matte:'Silikonlu ipek mat',silicone_semi_matte:'Silikonlu yarı mat',
 antibacterial_silicone_matte:'Antibakteriyel silikonlu mat',
 antibacterial_silicone_silk_matte:'Antibakteriyel silikonlu ipek mat',
 antibacterial_plastic_matte:'Antibakteriyel plastik mat',
 synthetic_gloss:'Sentetik parlak',synthetic_matte:'Sentetik mat',
 silicone_soft_matte:'Silikonlu soft mat',ceiling_water_based:'Tavan boyası',
};
export const availablePaintingTypes=(surface:PaintingFields['surfaceType'])=>
 [...new Set(PAINTING_POSITIONS.filter(p=>p.surface===surface&&!p.widePuttyInputIncluded&&p.paintType!=='ceiling_water_based')
  .map(p=>p.paintType))] as PaintingType[];
function selectWallPoz(fields:PaintingFields):PaintingPoz|null {
 const matches=PAINTING_POSITIONS.filter(p=>p.surface===fields.surfaceType&&p.paintType===fields.paintType&&!p.widePuttyInputIncluded);
 return matches.length===1?matches[0]:null;
}
export function calculatePaintingPrice(fields:PaintingFields):PaintingQuote|null {
 const {netAreaM2:n,paintedRoomCount:rooms,ceilingHeightM:height}=fields;
 if(!fields.scopeType||n===undefined||rooms===undefined||fields.furnished===undefined||height===undefined||
   fields.paintWalls===undefined||fields.paintCeiling===undefined||!fields.paintWalls&&!fields.paintCeiling||
   !Number.isFinite(n)||n<=0||!Number.isInteger(rooms)||rooms<0||!Number.isFinite(height)||height<1.5)return null;
 if(fields.repairStatus==='serious_plaster_damage')return null;
 const wall=fields.paintWalls?selectWallPoz(fields):null;
 if(fields.paintWalls&&(!wall||!fields.surfaceType||!fields.repairStatus||!fields.oldColorTone||!fields.newColorTone||
    !fields.paintBrand?.trim()||!fields.colorCode?.trim()))return null;
 const wallAreaM2=fields.paintWalls?paintedWallArea(n,height):0;
 const ceilingAreaM2=fields.paintCeiling?n:0;
 if(fields.paintWalls&&fields.repairStatus==='wide_putty'&&
   (fields.extraPuttyM2===undefined||!Number.isFinite(fields.extraPuttyM2)||fields.extraPuttyM2<=0||
     fields.extraPuttyM2>wallAreaM2))return null;
 // Excel labor is a combined input. For light walls only the listed primer
 // MATERIAL (including its source ×1.20 market coefficient) is subtracted;
 // no guessed primer-application labor is removed.
 const wallUnit=wall?wall.priceM2-(fields.oldColorTone==='light'?wall.primerMaterialCostM2:0):0;
 const wallReferenceCost=wallAreaM2*wallUnit;
 const ceilingReferenceCost=ceilingAreaM2*OLD_PAINTED_CEILING_POZ.priceM2;
 const repairCost=fields.repairStatus==='wide_putty'?fields.extraPuttyM2!*EXTRA_PUTTY_PRICE_M2:0;
 const furnishedExtraFee=fields.furnished?rooms*1000:0;
 const scaffoldExtraFee=height>4?2000:0;
 const referenceCost=(wallReferenceCost+ceilingReferenceCost+repairCost+furnishedExtraFee+scaffoldExtraFee)*REGIONAL_COEFFICIENT;
 const riskPremium=referenceCost*PAINTING_RISK_RATE,serviceFee=referenceCost*PAINTING_SERVICE_FEE_RATE;
 const finalPrice=Math.round((referenceCost+riskPremium+serviceFee+Number.EPSILON)*100)/100;
 return {wallAreaM2,ceilingAreaM2,totalPaintAreaM2:wallAreaM2+ceilingAreaM2,
   selectedWallPozId:wall?.id??null,selectedCeilingPozId:fields.paintCeiling?OLD_PAINTED_CEILING_POZ.id:null,
   wallReferenceCost,ceilingReferenceCost,repairCost,furnishedExtraFee,scaffoldExtraFee,
   regionalCoefficient:REGIONAL_COEFFICIENT,referenceCost,riskPremium,serviceFee,finalPrice};
}

function encode(state:PaintingState){
 const key=secret();if(!key)throw Error('Missing painting state secret');
 const body=Buffer.from(JSON.stringify({state,expires:Date.now()+24*60*60*1000})).toString('base64url');
 const mac=createHmac('sha256',key).update('painting-v1:'+body).digest('base64url');
 return `painting.${body}.${mac}`;
}
export function decodePaintingState(token:unknown):PaintingState|null {
 if(!token)return null;
 const key=secret();if(!key||typeof token!=='string'||token.length>20000||!token.startsWith('painting.'))throw Error('Invalid painting state');
 const [,body,mac]=token.split('.'),expected=createHmac('sha256',key).update('painting-v1:'+body).digest();
 const received=Buffer.from(mac??'','base64url');
 if(received.length!==expected.length||!timingSafeEqual(received,expected))throw Error('Invalid painting signature');
 const parsed=JSON.parse(Buffer.from(body,'base64url').toString()),state=parsed.state;
 if(parsed.expires<Date.now()||state?.version!==1||!state.fields||!Array.isArray(state.answeredQuestionKeys)||
   !Number.isInteger(state.answeredSystemQuestions)||state.answeredSystemQuestions<0||state.answeredSystemQuestions>50)
   throw Error('Invalid painting state data');
 return state;
}
function parseScope(message:string){
 const s=text(message);
 return /\b(?:komple|tum|butun)\s+(?:evi|ev|daire)/.test(s)?'complete_home':
   /\b(?:belirli|yalniz|sadece)\s+(?:oda|odalar|bir|\d+\s+oda|bolum)/.test(s)?'specific_area':null;
}
function parseFurnished(message:string):boolean|null {
 const s=text(message),f=/\besyali\b/.test(s),e=/\bbos\b/.test(s);
 return f===e?null:f;
}
function parseSurfaces(message:string,asked=false):{paintWalls:boolean;paintCeiling:boolean}|null {
 const s=text(message).replace(/\btavan yuksekl\w*/g,''),walls=/\bduvar\w*/.test(s),ceiling=/\btavan\w*/.test(s);
 if(walls&&ceiling)return {paintWalls:true,paintCeiling:true};
 if(!asked&&!/\bboya\w*|\bbadana\w*/.test(s))return null;
 return walls?{paintWalls:true,paintCeiling:false}:ceiling?{paintWalls:false,paintCeiling:true}:null;
}
function parseSurface(message:string):PaintingFields['surfaceType']|null {
 const s=text(message),matches=[/\beski boyali\b/.test(s),/\byeni siva\w*/.test(s),
   /\bsaten alci\w*|\balcipan\w*|\balcipanel\w*/.test(s)];
 return matches.filter(Boolean).length===1?(['old_painted','new_plaster','satin_plaster_drywall'] as const)[matches.indexOf(true)]:null;
}
function parseRepair(message:string):PaintingFields['repairStatus']|null {
 const s=text(message);
 if(/\bciddi\s+(?:siva|onarim)|\bderin hasar\b/.test(s))return 'serious_plaster_damage';
 if(/\bgenis\s+alan\s+macun|\bekstra\s+macun/.test(s))return 'wide_putty';
 if(/^(?:yok|hayir|gerekmiyor|normal|kucuk kusurlar)$/i.test(s)||/\btadilat yok\b/.test(s))return 'none';
 return null;
}
function parseTone(message:string,key:'oldColorTone'|'newColorTone',pending=false):'light'|'dark'|null {
 const s=text(message),light=/\bacik\b/.test(s),dark=/\bkoyu\b/.test(s);
 const labelled=s.match(key==='oldColorTone'?/\b(?:mevcut|eski) renk\s*(?:acik|koyu)\b/:
  /\b(?:yeni|istenen) renk\s*(?:acik|koyu)\b/);
 if(labelled)return /\bkoyu\b/.test(labelled[0])?'dark':'light';
 if(light&&dark){
  if(/\b(?:mevcut|eski|yeni|istenen) renk\b/.test(s))return null;
  const pair=s.match(/\b(koyu|acik)\b.*\b(acik|koyu)\b/);
  if(!pair||pair[1]===pair[2])return null;
  return (key==='oldColorTone'?pair[1]:pair[2])==='koyu'?'dark':'light';
 }
 if(!pending&&!new RegExp(key==='oldColorTone'?'(?:mevcut|eski) renk':'(?:yeni|istenen) renk').test(s))return null;
 return light?'light':dark?'dark':null;
}
function parsePaintType(message:string,available:PaintingType[]):PaintingType|null {
 const words=new Set(text(message).split(' '));
 const found=available.filter(type=>text(typeLabels[type]).split(' ').every(word=>words.has(word)));
 const longest=Math.max(0,...found.map(type=>text(typeLabels[type]).split(' ').length));
 const specific=found.filter(type=>text(typeLabels[type]).split(' ').length===longest);
 return specific.length===1?specific[0]:null;
}
function parseBrandColor(message:string,prior:PaintingFields):Pick<PaintingFields,'paintBrand'|'colorCode'> {
 const s=message.trim();if(!s||/^(?:bilmiyorum|emin degilim)$/i.test(text(s)))return {};
 const brandLabel=s.match(/\bmarka(?:sı|si)?\s*[:=]?\s*(.+?)(?=\s*[,;]|\s+renk(?:\s+kodu)?\b|$)/iu);
 const colorLabel=s.match(/\brenk\s+kodu\s*[:=]?\s*([^,;.]+)/iu)??
  s.match(/\brenk\s*[:=]\s*([^,;.]+)/iu);
 if(brandLabel||colorLabel)return {
  ...(brandLabel?.[1]?.trim()?{paintBrand:brandLabel[1].trim().slice(0,80)}:{}),
  ...(colorLabel?.[1]?.trim()?{colorCode:colorLabel[1].trim().slice(0,80)}:{}),
 };
 const split=s.match(/^(.+?)\s*[-–,:]\s*(.+)$/);
 if(split&&split[1].length<=80&&split[2].length<=80)return {paintBrand:split[1].trim(),colorCode:split[2].trim()};
 const brand=s.match(/^marka\s+(.+)$/i),color=s.match(/^renk(?:\s+kodu)?\s+(.+)$/i);
 if(brand)return {paintBrand:brand[1].trim()};
 if(color)return {colorCode:color[1].trim()};
 if(prior.paintBrand&&s.length<=80)return {colorCode:s};
 const one=s.match(/^(\S+)\s+(\d[\p{L}\p{N} -]{1,79})$/u);
 return one?{paintBrand:one[1],colorCode:one[2].trim()}:{};
}
function apply(state:PaintingState,key:PaintingQuestionKey,message:string,pending=false):boolean {
 const fields=state.fields;
 switch(key){
  case 'scopeType':{const v=parseScope(message);if(v){fields.scopeType=v;return true;}return false;}
  case 'netAreaM2':{const v=numberFrom(message,'area',pending);if(v!==null){fields.netAreaM2=v;return true;}return false;}
  case 'paintedRoomCount':{const v=numberFrom(message,'rooms',pending);if(v!==null){fields.paintedRoomCount=v;return true;}return false;}
  case 'furnished':{const v=parseFurnished(message);if(v!==null){fields.furnished=v;return true;}return false;}
  case 'ceilingHeightM':{const v=numberFrom(message,'height',pending);if(v!==null){fields.ceilingHeightM=v;return true;}return false;}
  case 'surfaces':{const v=parseSurfaces(message,pending);if(v){Object.assign(fields,v);return true;}return false;}
  case 'surfaceType':{const v=parseSurface(message);if(v){fields.surfaceType=v;return true;}return false;}
  case 'repairStatus':{const v=parseRepair(message);if(v){fields.repairStatus=v;return true;}return false;}
  case 'extraPuttyM2':{const v=numberFrom(message,'area',pending);const wall=paintedWallArea(fields.netAreaM2!,fields.ceilingHeightM!);
   if(v!==null&&v<=wall){fields.extraPuttyM2=v;return true;}return false;}
  case 'oldColorTone':case 'newColorTone':{const v=parseTone(message,key,pending);if(v){fields[key]=v;return true;}return false;}
  case 'paintType':{const v=parsePaintType(message,availablePaintingTypes(fields.surfaceType));if(v){fields.paintType=v;return true;}return false;}
  case 'brandColor':{const parsed=parseBrandColor(message,fields);Object.assign(fields,parsed);
   return !!fields.paintBrand?.trim()&&!!fields.colorCode?.trim();}
 }
}
function extractSpontaneous(state:PaintingState,message:string){
 for(const key of ['scopeType','netAreaM2','paintedRoomCount','furnished','ceilingHeightM','surfaces','surfaceType',
  'repairStatus','extraPuttyM2','oldColorTone','newColorTone','paintType'] as PaintingQuestionKey[]){
  if(key==='extraPuttyM2'&&state.fields.repairStatus!=='wide_putty')continue;
  if(key==='paintType'&&!state.fields.surfaceType)continue;
  if(key==='oldColorTone'||key==='newColorTone'){
    if(state.fields[key]===undefined)apply(state,key,message);continue;
  }
  if(key==='surfaces'&&state.fields.paintWalls!==undefined)continue;
  if(key!=='surfaces'&&key!=='paintType'&&key!=='extraPuttyM2'&&
    state.fields[key as keyof PaintingFields]!==undefined)continue;
  apply(state,key,message);
 }
 if(state.fields.paintWalls&&(!state.fields.paintBrand||!state.fields.colorCode)&&
   /\bmarka\w*\b|\brenk kodu\b|\brenk\s*[:=]/.test(text(message)))
   apply(state,'brandColor',message);
}
function nextQuestion(state:PaintingState):PaintingQuestionKey|null {
 const f=state.fields;
 for(const key of ['scopeType','netAreaM2','paintedRoomCount','furnished','ceilingHeightM'] as const)
  if(f[key]===undefined)return key;
 if(f.paintWalls===undefined||f.paintCeiling===undefined)return 'surfaces';
 if(!f.paintWalls)return null;
 for(const key of ['surfaceType','repairStatus'] as const)if(!f[key])return key;
 if(f.repairStatus==='serious_plaster_damage')return null;
 if(f.repairStatus==='wide_putty'&&f.extraPuttyM2===undefined)return 'extraPuttyM2';
 for(const key of ['oldColorTone','newColorTone','paintType'] as const)if(!f[key])return key;
 if(!f.paintBrand||!f.colorCode)return 'brandColor';
 return null;
}
function prompt(key:PaintingQuestionKey,fields:PaintingFields){
 switch(key){
  case 'scopeType':return {aiText:'Boya işi komple ev için mi, yoksa belirli oda/odalar için mi?',options:['Komple ev','Belirli oda/odalar']};
  case 'netAreaM2':return {aiText:fields.scopeType==='complete_home'?'Evin net kullanım alanı kaç m²?':
   'Boyanacak bölümün yaklaşık net zemin alanı kaç m²?',options:[]};
  case 'paintedRoomCount':return {aiText:fields.scopeType==='complete_home'?'Evde kaç oda var? Salon sayılmayacak.':
   'Boyanacak kaç oda var? Salon sayılmayacak.',options:[]};
  case 'furnished':return {aiText:'Ev eşyalı mı, boş mu?',options:['Eşyalı','Boş']};
  case 'ceilingHeightM':return {aiText:'Tavan yüksekliği kaç metre?',options:[]};
  case 'surfaces':return {aiText:'Duvarlar mı, tavan mı, yoksa ikisi birden mi boyanacak?',options:['Yalnız duvarlar','Yalnız tavan','Duvarlar ve tavan']};
  case 'surfaceType':return {aiText:'Duvarların mevcut yüzeyi hangisi?',options:['Eski boyalı','Yeni sıvalı','Saten alçılı / alçıpan']};
  case 'repairStatus':return {aiText:'Normal küçük kusurlar dışında ekstra tadilat gerekiyor mu?',
   options:['Yok','Geniş alan macun düzeltmesi var','Ciddi sıva / derin hasar var']};
  case 'extraPuttyM2':return {aiText:'Macun düzeltmesi gereken yaklaşık alan kaç m²?',options:[]};
  case 'oldColorTone':return {aiText:'Duvarların mevcut rengi açık ton mu, koyu ton mu?',options:['Açık','Koyu']};
  case 'newColorTone':return {aiText:'İstediğiniz yeni renk açık ton mu, koyu ton mu?',options:['Açık','Koyu']};
  case 'paintType':return {aiText:'Hangi boya türünü istiyorsunuz?',options:availablePaintingTypes(fields.surfaceType).map(type=>typeLabels[type])};
  case 'brandColor':return {aiText:fields.paintBrand?'Renk kodunu paylaşır mısınız?':
   fields.colorCode?'Boya markası nedir?':'Boya markası ve renk kodu nedir?',options:[]};
 }
}
export async function diagnosePainting(message:string,history:DiagnosisMessage[],token?:unknown){
 const state=decodePaintingState(token)??{version:1 as const,fields:{},currentQuestionKey:null,answeredQuestionKeys:[],
  answeredSystemQuestions:0,stage:'collecting' as const} satisfies PaintingState;
 if(state.stage==='collecting'){
  if(state.currentQuestionKey){
   if(apply(state,state.currentQuestionKey,message,true)){
    state.answeredQuestionKeys.push(state.currentQuestionKey);state.answeredSystemQuestions++;state.currentQuestionKey=null;
    extractSpontaneous(state,message);
   }
  }else{
   if(!token)for(const entry of history)if(entry.role==='user')extractSpontaneous(state,entry.content);
   extractSpontaneous(state,message);
  }
 }
 const question=state.stage==='collecting'?nextQuestion(state):null;
 if(state.fields.repairStatus==='serious_plaster_damage'){
  state.stage='manual_review';state.currentQuestionKey=null;
  return {aiText:'Ciddi sıva veya derin hasar standart Boya V1 fiyatına dahil değil. Yerinde inceleme gerekir.',
   options:[],stateToken:encode(state),resultState:'painting_manual_review',isReadyForPrice:false,
   paintingQuote:null,answeredSystemQuestions:state.answeredSystemQuestions,questionCount:state.answeredSystemQuestions,
   assessmentComplete:true,estimatedPrice:null};
 }
 if(question){
  state.currentQuestionKey=question;
  return {...prompt(question,state.fields),stateToken:encode(state),resultState:'painting_question',isReadyForPrice:false,
   paintingQuote:null,answeredSystemQuestions:state.answeredSystemQuestions,questionCount:state.answeredSystemQuestions+1,
   assessmentComplete:false,estimatedPrice:null};
 }
 const quote=calculatePaintingPrice(state.fields);
 if(!quote)throw Error('Painting inputs incomplete or incompatible with source prices');
 state.stage='priced';state.currentQuestionKey=null;
 return {aiText:'Nihai boya hizmeti fiyatı hazır.',options:[],stateToken:encode(state),resultState:'priced',
  isReadyForPrice:true,paintingQuote:quote,answeredSystemQuestions:state.answeredSystemQuestions,
  questionCount:state.answeredSystemQuestions,assessmentComplete:true,estimatedPrice:money(quote.finalPrice)};
}
