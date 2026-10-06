import {normalizePartText} from './parts-catalog';
import {DOMAINS} from './manufacturer-registry';
import {boilerCodeTokens,isBoilerErrorCode} from './boiler-error-code';

export const ACTIVE_SERVICE_CATEGORIES = [
  {id:'boiler',label:'Kombi'}, {id:'painting',label:'Boya'},
  {id:'cleaning',label:'Temizlik'}, {id:'moving',label:'Nakliye'},
  {id:'sofa_cleaning',label:'Koltuk Yıkama'}, {id:'carpet_cleaning',label:'Halı Yıkama'},
] as const;
export type ServiceCategory = typeof ACTIVE_SERVICE_CATEGORIES[number]['id'];
export const isServiceCategory = (value:unknown):value is ServiceCategory =>
  ACTIVE_SERVICE_CATEGORIES.some(c=>c.id===value);
export const serviceCategoryLabel = (category:ServiceCategory) => ACTIVE_SERVICE_CATEGORIES.find(c=>c.id===category)!.label;

export function inspectServiceCategory(message:string) {
  const text=normalizePartText(message),categories:ServiceCategory[]=[];
  const sofa=/\bkoltuk\w*/.test(text),carpet=/\bhali\w*/.test(text);
  if(sofa)categories.push('sofa_cleaning');
  if(carpet)categories.push('carpet_cleaning');
  if(/\bboya\w*|\bbadana\w*/.test(text))categories.push('painting');
  if(!sofa&&!carpet&&/\btemizl\w*/.test(text))categories.push('cleaning');
  if(/\b(?:nakliye|nakliyat|tasin\w*|tasiy\w*|tasima\w*)/.test(text))categories.push('moving');
  const unsupported=/\b(?:klima\w*|buzdolab\w*|camasir\w*|bulasik\w*|cilingir\w*)/.test(text);
  const words=text.split(' ');
  const manufacturer=words.some((word,i)=>[word,word+(words[i+1]??'')].some(w=>Object.hasOwn(DOMAINS,w)));
  const faultCode=boilerCodeTokens(message).some(hit=>isBoilerErrorCode(hit[0])&&
    (/[a-z]/i.test(hit[0])||/^(?:hata|hatasi|ariza|arizasi|kod|kodu)\b/.test(normalizePartText(message.slice(hit.index!+hit[0].length)))));
  if(/\bkombi\w*/.test(text)||!unsupported&&manufacturer&&faultCode)categories.push('boiler');
  const explicitSelection=ACTIVE_SERVICE_CATEGORIES.some(c=>normalizePartText(c.label)===text);
  const explicitRequest=explicitSelection||/\b(?:istiyorum|istiyoruz|ihtiyac\w*|hizmet\w*|yaptirmak|yikatmak|yikatac\w*|boyatmak|boyatac\w*|tasiyac\w*|tasinac\w*|tasiniyorum|tasimak|gecelim)\b/.test(text);
  return {categories,unsupported,explicitRequest,category:!unsupported&&categories.length===1?categories[0]:null};
}
export function classifyServiceCategory(message:string,current:ServiceCategory|null=null):ServiceCategory|null {
  const found=inspectServiceCategory(message);
  return current&&!found.unsupported&&!found.explicitRequest?current:found.category;
}
