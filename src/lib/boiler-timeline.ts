import {normalizePartText} from './parts-catalog';
export type BoilerTiming='immediate'|'after_some_time'|'intermittent';
export interface BoilerTimeline {
  historical:{kind:BoilerTiming|'reset_temporarily_helped';quote:string}[];
  current:{timing:BoilerTiming|null;persistent:boolean;quote:string|null};
  needsClarification:boolean;
}
export function extractBoilerTimeline(message:string):BoilerTimeline {
  // Split before normalization so quoted spans retain their original offsets.
  // Turkish letters do not form JavaScript \b word boundaries.
  const originalBoundary=/(?<![\p{L}\p{N}])(?:art[ıi]k|şimdi|simdi|şu\s+anda|su\s+anda|en\s+son)(?![\p{L}\p{N}])/iu.exec(message);
  const historyQuote=originalBoundary?message.slice(0,originalBoundary.index):message;
  const currentQuote=originalBoundary?message.slice(originalBoundary.index):message;
  const old=originalBoundary?normalizePartText(historyQuote):'',current=normalizePartText(currentQuote);
  const uncertain=/\b(?:bilmiyorum|galiba|sanirim|belki|emin degilim)\b/.test(current);
  const after=/(?:bir sure|\d+\s*(?:dakika|dk|saat)).{0,30}(?:calis|sonra)|calis.{0,25}sonra/;
  const intermittent=/\b(?:aralikli|zaman zaman|bazen)\b/;
  const immediate=/\b(?:hemen|baslar baslamaz|acilir acilmaz)\b/;
  const historical:BoilerTimeline['historical']=[];
  if(old&&after.test(old))historical.push({kind:'after_some_time',quote:historyQuote});
  if(old&&(intermittent.test(old)||/tekrar.{0,35}(?:verdi|devam|oldu|ediyordu|ediyor)\b/.test(old)))historical.push({kind:'intermittent',quote:historyQuote});
  if(old&&/reset.{0,35}duzel(?:di|iyordu|iyormus|iyor)\b/.test(old)&&/tekrar/.test(old))historical.push({kind:'reset_temporarily_helped',quote:historyQuote});
  const persistent=/\b(?:kalici|surekli|hep)\b/.test(current);
  const timing=uncertain?null:immediate.test(current)?'immediate':after.test(current)?'after_some_time':intermittent.test(current)?'intermittent':null;
  return {historical,current:{timing,persistent,quote:timing||persistent?currentQuote:null},
    needsClarification:!!originalBoundary&&historical.length>0&&persistent&&!timing&&!uncertain};
}
