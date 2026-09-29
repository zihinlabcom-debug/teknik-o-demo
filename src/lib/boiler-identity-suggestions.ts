import {normalizePartText} from './parts-catalog';
import {canonicalManufacturer} from './verified-knowledge';
import {boilerCodeTokens,normalizeBoilerErrorCode} from './boiler-error-code';

export interface BoilerCatalogModel {
  brand: string; name: string; familyId: string; officialModelId: string | null;
  aliases?: string[];
}
export interface BoilerIdentityCatalog { brands: string[]; models: BoilerCatalogModel[] }
export interface BoilerModelSuggestion extends BoilerCatalogModel { exact: boolean; distance: number }
const normalized = (value: string) => normalizePartText(value);
const phonetic = (value: string) => value.replace(/ie/g,'i').replace(/x/g,'ks').replace(/([a-z])\1+/g,'$1');
const numbers = (value: string):string[] => value.match(/\d+/g) ?? [];
const roman = (value: string) => value.split(' ').filter(word=>/^(?:[ivx]+|l|c|d|m)$/.test(word));

// Only complete alternative labels, never capacity lists or structural slashes.
export function officialModelLabelAlternatives(name:string) {
  const parts=name.split(/\s*\/\s*/);
  const stem=normalized(parts[0]).split(' ')[0];
  return parts.length>1&&parts.every(part=>/^\p{L}/u.test(part)&&normalized(part).split(' ').length>=2&&
    normalized(part).split(' ')[0]===stem)?parts:[];
}

export function mentionedCatalogModel(catalog:BoilerIdentityCatalog,brand:string,messages:string[],code:string|null) {
  for(const message of [...messages].reverse()){
    const words=[...message.matchAll(/[\p{L}\p{N}]+/gu)];
    const matches=catalog.models.filter(m=>canonicalManufacturer(m.brand)===canonicalManufacturer(brand)).flatMap(model=>
      [model.name,...(model.aliases??[])].flatMap(label=>{
        const tokens=normalized(label).split(' ');const results:{model:BoilerCatalogModel;literal:string;length:number}[]=[];
        for(let i=0;i<=words.length-tokens.length;i++){
          if(!tokens.every((token,j)=>normalized(words[i+j][0])===token))continue;
          const next=words[i+tokens.length]?.[0];
          const start=words[i].index!,last=words[i+tokens.length-1];
          const following=message.slice(last.index!+last[0].length).trimStart();
          const codeBoundary=!!code&&boilerCodeTokens(following).some(hit=>hit.index===0&&
            normalizeBoilerErrorCode(hit[0])===normalizeBoilerErrorCode(code));
          // A model prefix followed by an unknown capacity/variant is not an
          // exact label. Only an actual fault code or ordinary symptom wording
          // can delimit a recovered catalog label.
          if(next&&!codeBoundary&&!/^(?:kombi\w*|hata\w*|ariza\w*|veriy\w*|gosteriy\w*|calis\w*|sorun\w*|cihaz\w*|icin|var|ve)$/.test(normalized(next)))continue;
          results.push({model,literal:message.slice(start,last.index!+last[0].length),length:tokens.length});
        }
        return results;
      }));
    if(!matches.length)continue;
    const longest=Math.max(...matches.map(m=>m.length));let best=matches.filter(m=>m.length===longest);
    best=best.filter(m=>m.model.officialModelId!==null||!best.some(other=>other.model.familyId===m.model.familyId&&
      other.model.officialModelId!==null&&normalized(other.literal)===normalized(m.literal)));
    const scopes=new Set(best.map(m=>m.model.familyId+'|'+m.model.officialModelId));
    return scopes.size===1?best[0].literal:null;
  }
  return null;
}

// Optimal string alignment: bounded local transposition/insertion/deletion.
export function identityDistance(a: string,b: string) {
  const rows=Array.from({length:a.length+1},()=>Array<number>(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)rows[i][0]=i;
  for(let j=0;j<=b.length;j++)rows[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
    rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
  }
  return rows[a.length][b.length];
}
const closeDistance = (input: string,target: string) => {
  if(input.length<4||target.length<4||input.length>80||target.length>80)return null;
  const d=identityDistance(input,target),max=Math.max(input.length,target.length);
  if(d<=2&&d/max<=0.34)return d;
  if(phonetic(input)===phonetic(target)&&Math.min(input.length,target.length)>=5)return 1;
  return null;
};

export function suggestBrands(catalog: BoilerIdentityCatalog,input: string) {
  const target=canonicalManufacturer(input);
  const values=catalog.brands.flatMap(name=>{
    const key=canonicalManufacturer(name),distance=key===target?0:closeDistance(target,key);
    return distance===null?[]:[{name,exact:key===target,distance}];
  }).sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name));
  return values.filter(item=>item.distance===(values[0]?.distance??-1)).slice(0,4);
}

export function suggestModels(catalog: BoilerIdentityCatalog,brand: string,input: string): BoilerModelSuggestion[] {
  const target=normalized(input),tokens=target.split(' '),numeric=numbers(target),romanTokens=roman(target);
  if(!target||target.length>80)return [];
  const matches=catalog.models.filter(m=>canonicalManufacturer(m.brand)===canonicalManufacturer(brand)).flatMap(model=>{
    let best: {exact:boolean;distance:number;extra:number}|null=null;
    for(const name of [model.name,...(model.aliases??[])]){
      const n=normalized(name);
      if(numeric.some(num=>!numbers(n).includes(num))||romanTokens.some(num=>!roman(n).includes(num)))continue;
      // Missing capacities must not turn a family typo into a specific variant.
      if(!numeric.length&&numbers(n).length)continue;
      if(n===target||(n.replaceAll(' ','')===target.replaceAll(' ','')&&numbers(n).join('|')===numeric.join('|'))){best={exact:true,distance:0,extra:0};break;}
      const prefix=n.split(' ').slice(0,tokens.length).join(' ');
      if(numbers(prefix).join('|')!==numeric.join('|')||roman(prefix).join('|')!==romanTokens.join('|'))continue;
      const distance=closeDistance(target,prefix);
      const extra=Math.max(0,n.split(' ').length-tokens.length);
      if(distance!==null&&(!best||distance<best.distance||(distance===best.distance&&extra<best.extra)))best={exact:false,distance,extra};
    }
    return best?[{...model,...best}]:[];
  }).sort((a,b)=>a.distance-b.distance||a.extra-b.extra||a.name.localeCompare(b.name));
  const closest=matches.filter(m=>m.distance===(matches[0]?.distance??-1)&&m.extra===matches[0]?.extra);
  // Deduplicate aliases of one catalog identity; keep different families/models.
  return [...new Map(closest.map(m=>[`${m.familyId}|${m.officialModelId??''}`,m])).values()].slice(0,4);
}
