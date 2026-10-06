import {normalizePartText} from './parts-catalog';

const normalized=(value:string)=>normalizePartText(value.normalize('NFKC').replace(/[‐‑–—]/g,'-'));
const compact=(value:string)=>normalized(value).replace(/ /g,'');
function editDistanceAtMostOne(a:string,b:string) {
  if(Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,edits=0;
  while(i<a.length && j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++edits>1)return false;
    if(a.length>b.length)i++;
    else if(b.length>a.length)j++;
    else{i++;j++;}
  }
  return edits+(a.length-i)+(b.length-j)<=1;
}
export function matchVerifiedModel(input:string,verifiedModels:string[]):
  {status:'exact'|'canonical'|'ambiguous'|'none';model?:string} {
  const source=input.trim(),query=normalized(source),queryCompact=compact(source);
  if(!queryCompact)return {status:'none'};
  const names=[...new Map(verifiedModels.filter(Boolean).map(model=>[normalized(model),model])).values()];
  const exact=names.filter(model=>compact(model)===queryCompact);
  if(exact.length>1)return {status:'ambiguous'};
  if(exact.length===1)return {status:source===exact[0]?'exact':'canonical',model:exact[0]};
  if(queryCompact.length<8)return {status:'none'};
  const queryTokens=query.split(' '),queryDigits=query.match(/\d+/g)??[];
  const close=names.filter(model=>{
    const tokens=normalized(model).split(' ');
    return tokens.length===queryTokens.length &&
      JSON.stringify(normalized(model).match(/\d+/g)??[])===JSON.stringify(queryDigits) &&
      (tokens.length===1 || tokens.some((token,index)=>token===queryTokens[index])) &&
      editDistanceAtMostOne(queryCompact,compact(model));
  });
  return close.length===1?{status:'canonical',model:close[0]}:close.length>1?{status:'ambiguous'}:{status:'none'};
}
