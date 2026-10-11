import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {adminSupabase} from './account-supabase';
import {normalizePhone} from './account-auth';

export type CustomerApplication={phone:string;fullName:string;email:string|null;cityId:number;
  districtId:number;addressLine:string;issuedAt:number};
export const customerIntentCookie='tekniko-customer-registration';
const emailPattern=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseCustomerApplication(value:unknown):CustomerApplication|null{
  if(!value||typeof value!=='object')return null;
  const data=value as Record<string,unknown>;
  const phone=typeof data.phone==='string'?normalizePhone(data.phone):null;
  const fullName=typeof data.fullName==='string'?data.fullName.trim():'';
  const email=typeof data.email==='string'?data.email.trim():'';
  const addressLine=typeof data.addressLine==='string'?data.addressLine.trim():'';
  if(!phone||fullName.length<2||fullName.length>200||email.length>320||
    (email&&!emailPattern.test(email))||!Number.isSafeInteger(data.cityId)||Number(data.cityId)<=0||
    !Number.isSafeInteger(data.districtId)||Number(data.districtId)<=0||
    addressLine.length<10||addressLine.length>500)return null;
  return {phone,fullName,email:email||null,cityId:Number(data.cityId),districtId:Number(data.districtId),
    addressLine,issuedAt:Date.now()};
}

function signingKey(){const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('Signing key missing');return key;}

export function sealCustomerApplication(application:CustomerApplication){
  const payload=Buffer.from(JSON.stringify(application)).toString('base64url');
  const signature=createHmac('sha256',signingKey()).update(`customer-onboarding.v1.${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}

export function openCustomerApplication(token:string|undefined,phoneInput:string){
  if(!token||token.length>4000)return null;
  const [payload,signature,...extra]=token.split('.');if(!payload||!signature||extra.length)return null;
  const expected=createHmac('sha256',signingKey()).update(`customer-onboarding.v1.${payload}`).digest();
  let provided:Buffer;try{provided=Buffer.from(signature,'base64url');}catch{return null;}
  if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return null;
  try{
    const raw=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as Record<string,unknown>;
    const application=parseCustomerApplication(raw);
    if(!application||application.phone!==normalizePhone(phoneInput)||typeof raw.issuedAt!=='number'||
      !Number.isFinite(raw.issuedAt)||raw.issuedAt>Date.now()+30000||Date.now()-raw.issuedAt>15*60*1000)return null;
    return {...application,issuedAt:raw.issuedAt};
  }catch{return null;}
}

export async function validCustomerSelection(application:CustomerApplication){
  const db=adminSupabase();
  const [{data:city,error:cityError},{data:district,error:districtError}]=await Promise.all([
    db.from('cities').select('id').eq('id',application.cityId).eq('is_active',true).maybeSingle(),
    db.from('districts').select('id').eq('id',application.districtId).eq('city_id',application.cityId).eq('is_active',true).maybeSingle(),
  ]);
  if(cityError||districtError)throw new Error('Catalog lookup failed');
  return !!city&&!!district;
}

export async function completeCustomerApplication(userId:string,application:CustomerApplication){
  const {error}=await adminSupabase().rpc('complete_customer_password_registration',{
    p_user_id:userId,p_phone:application.phone,p_name:application.fullName,p_email:application.email,
    p_city_id:application.cityId,p_district_id:application.districtId,p_address_line:application.addressLine,
  });
  if(error)throw new Error('Customer registration failed');
}
