import type {CategoryConversationState} from './service-conversation';
import {decodePaintingState} from './painting-engine';
import {decodeBoilerState} from './boiler-diagnosis';
import {findDyoWallColor} from './painting-color-catalog-dyo';
import type {PaintingFields,PaintingQuote} from './painting-types';
import type {HomeFields} from './cleaning-home';
import type {ApartmentFields} from './cleaning-apartment';
import {CARPET_PRODUCTS} from './cleaning-carpet';
import {UPHOLSTERY_PRODUCTS} from './cleaning-upholstery';

// Only accepted domain fields are copied. Engine progress, history and model
// reasoning never become part of an order record.
function selected<T extends object,K extends keyof T>(source:T,keys:readonly K[]):Partial<Pick<T,K>>{
  const result:Partial<Pick<T,K>>={};
  for(const key of keys)if(source[key]!==undefined)result[key]=source[key];
  return result;
}
const paintingKeys=[
  'scopeType','netAreaM2','paintedRoomCount','furnished','ceilingHeightM','ceilingHeightMode',
  'paintWalls','paintCeiling','surfaceType','repairStatus','extraPuttyM2',
  'oldColorTone','newColorTone','paintType','paintBrand','colorCode',
  'colorName','colorSelectionSource',
] as const satisfies readonly (keyof PaintingFields)[];
const paintingPriceKeys=[
  'wallAreaM2','ceilingAreaM2','totalPaintAreaM2','selectedWallPozId',
  'selectedCeilingPozId','referenceCost','riskPremium','serviceFee','finalPrice',
] as const satisfies readonly (keyof PaintingQuote)[];
const homeKeys=[
  'areaM2','rooms','bathrooms','balconies','extras','closetRooms',
  'materialsAvailable','equipmentAvailable','duration',
] as const satisfies readonly (keyof HomeFields)[];
const apartmentKeys=[
  'floors','apartments','glass','elevator','materialsAvailable',
] as const satisfies readonly (keyof ApartmentFields)[];

export function serviceRequestAssessment(state:CategoryConversationState){
  const category=state.category;
  if(!category||!state.lastResponse?.assessmentComplete)return null;
  const base={schemaVersion:1,category};
  if(category==='painting'){
    const painting=decodePaintingState(state.paintingStateToken);
    const selections=selected(painting?.fields??{},paintingKeys);
    const color=selections.colorSelectionSource==='dyo_catalog'&&selections.colorCode?
      findDyoWallColor(selections.colorCode):undefined;
    const calculation=state.lastResponse.resultState==='priced'&&state.lastResponse.paintingQuote?
      selected(state.lastResponse.paintingQuote,paintingPriceKeys):null;
    return {...base,serviceType:state.paintingServiceType,selections,
      ...(color?{colorPreviewHex:color.previewHex}:{}),calculation};
  }
  if(category==='cleaning'||category==='sofa_cleaning'||category==='carpet_cleaning'){
    const cleaning=state.cleaningState;
    if(!cleaning)return {...base,serviceType:null,selections:{}};
    const serviceType=cleaning.serviceType;
    if(serviceType==='home_cleaning'&&category==='cleaning')
      return {...base,serviceType,selections:selected(cleaning.home?.fields??{},homeKeys),
        calculation:state.lastResponse.cleaningQuote??null};
    if(serviceType==='apartment_cleaning'&&category==='cleaning')
      return {...base,serviceType,selections:selected(cleaning.apartment?.fields??{},apartmentKeys),
        calculation:state.lastResponse.cleaningQuote??null};
    if(serviceType==='upholstery_cleaning'&&category==='sofa_cleaning')
      return {...base,serviceType,selections:{items:(cleaning.upholstery?.items??[])
        .filter(item=>UPHOLSTERY_PRODUCTS.some(product=>product.key===item.key))
        .map(item=>({key:item.key,quantity:item.quantity}))},
        calculation:state.lastResponse.cleaningQuote??null};
    if(serviceType==='carpet_cleaning'&&category==='carpet_cleaning')
      return {...base,serviceType,selections:{items:(cleaning.carpet?.items??[])
        .filter(item=>CARPET_PRODUCTS.some(product=>product.key===item.key))
        .map(item=>({key:item.key,...(item.areasM2?{areasM2:[...item.areasM2]}:{}),
          ...(item.quantity!==undefined?{quantity:item.quantity}:{})}))},
        calculation:state.lastResponse.cleaningQuote??null};
    return {...base,serviceType:null,selections:{}};
  }
  if(category==='boiler'){
    const boiler=decodeBoilerState(state.boilerStateToken);
    const final=state.lastResponse;
    const verifiedPart=final.isReadyForPrice===true&&final.priceSource&&final.technicalSource&&
      typeof final.faultTitle==='string'&&final.faultTitle.length<=120?final.faultTitle:null;
    return {...base,device:{brand:boiler?.brand??'',model:boiler?.model??'',
      errorCode:boiler?.errorCode??null,familyId:boiler?.familyId??null,
      officialModelId:boiler?.officialModelId??null,fuelType:boiler?.fuelType??null},
      customerAnswers:(boiler?.answers??[]).map(answer=>({questionId:answer.questionId,
        answerKey:answer.answerKey,evidenceGroup:answer.evidenceGroup})),
      outcome:{resultState:final.resultState,verifiedPart,
        ...(verifiedPart?{technicalSource:final.technicalSource,priceSource:final.priceSource}:{})}};
  }
  return null;
}
