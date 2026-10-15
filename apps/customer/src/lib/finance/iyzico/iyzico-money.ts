import {IyzicoError} from './iyzico-errors';

export type TryAmount = string & {readonly __tryAmount: unique symbol};

export function canonicalTryAmount(value: string, allowZero=false): TryAmount {
  if (!/^(0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value))
    throw new IyzicoError('invalid_amount','validation',false,'Para tutarı geçersiz.');
  const [whole,fraction=''] = value.split('.');
  const canonical=`${whole}.${fraction.padEnd(2,'0')}`;
  if (!allowZero && canonical === '0.00')
    throw new IyzicoError('invalid_amount','validation',false,'Para tutarı sıfırdan büyük olmalı.');
  return canonical as TryAmount;
}

export function tryAmountToMinorUnits(value: TryAmount): bigint {
  const [whole,fraction]=value.split('.');
  return BigInt(whole)*BigInt(100)+BigInt(fraction);
}

export function amountForIyzicoSignature(value: unknown): string {
  const text=typeof value==='number'&&Number.isFinite(value)?String(value):typeof value==='string'?value:'';
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text))
    throw new IyzicoError('invalid_response_amount','validation',false,'Sağlayıcı tutarı doğrulanamadı.');
  if (!text.includes('.')) return text;
  const normalized=text.replace(/0+$/,'').replace(/\.$/,'');
  return normalized==='-0'?'0':normalized;
}
