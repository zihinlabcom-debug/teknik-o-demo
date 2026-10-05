import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {adminSupabase} from './account-supabase';
import {normalizePhone} from './account-auth';

export type TechnicianApplication={phone:string;fullName:string;email:string|null;
  categoryIds:string[];cityId:number;districtIds:number[];issuedAt:number};

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const technicianIntentCookie='tekniko-technician-registration';

export function parseTechnicianApplication(value:unknown):TechnicianApplication|null{
  if(!value||typeof value!=='object')return null;
  const data=value as Record<string,unknown>;
  const phone=typeof data.phone==='string'?normalizePhone(data.phone):null;
  const fullName=typeof data.fullName==='string'?data.fullName.trim():'';
  const rawEmail=typeof data.email==='string'?data.email.trim():'';
  const categories=Array.isArray(data.categoryIds)?data.categoryIds:null;
  const districts=Array.isArray(data.districtIds)?data.districtIds:null;
  if(!phone||fullName.length<2||fullName.length>200||rawEmail.length>320||
    (rawEmail&&!email.test(rawEmail))||!categories||!districts||
    categories.length<1||categories.length>30||districts.length<1||districts.length>100||
    !Number.isSafeInteger(data.cityId)||Number(data.cityId)<=0||
    !categories.every(id=>typeof id==='string'&&uuid.test(id))||
    !districts.every(id=>Number.isSafeInteger(id)&&id>0))return null;
  return {phone,fullName,email:rawEmail||null,categoryIds:[...new Set(categories)].sort(),
    cityId:Number(data.cityId),districtIds:[...new Set(districts)].sort((a,b)=>a-b),issuedAt:Date.now()};
}

export async function validTechnicianSelection(application:TechnicianApplication){
  const db=adminSupabase();
  const [{data:categories,error:categoryError},{data:city,error:cityError},
    {data:districts,error:districtError}]=await Promise.all([
    db.from('service_categories').select('id').in('id',application.categoryIds).eq('is_active',true),
    db.from('cities').select('id').eq('id',application.cityId).eq('is_active',true).maybeSingle(),
    db.from('districts').select('id').in('id',application.districtIds)
      .eq('city_id',application.cityId).eq('is_active',true),
  ]);
  if(categoryError||cityError||districtError)throw new Error('Onboarding catalog lookup failed');
  return categories?.length===application.categoryIds.length&&!!city&&
    districts?.length===application.districtIds.length;
}

function signingKey(){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error('Onboarding signing key missing');
  return key;
}

export function sealTechnicianApplication(application:TechnicianApplication){
  const payload=Buffer.from(JSON.stringify(application)).toString('base64url');
  const signature=createHmac('sha256',signingKey()).update(`technician-onboarding.v1.${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}

export function openTechnicianApplication(token:string|undefined,phone:string):TechnicianApplication|null{
  if(!token||token.length>4000)return null;
  const [payload,signature,...extra]=token.split('.');
  if(!payload||!signature||extra.length)return null;
  const expected=createHmac('sha256',signingKey()).update(`technician-onboarding.v1.${payload}`).digest();
  let provided:Buffer;
  try{provided=Buffer.from(signature,'base64url');}catch{return null;}
  if(expected.length!==provided.length||!timingSafeEqual(expected,provided))return null;
  try{
    const raw=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as Record<string,unknown>;
    const application=parseTechnicianApplication(raw);
    if(!application||application.phone!==normalizePhone(phone)||typeof raw.issuedAt!=='number'||
      !Number.isFinite(raw.issuedAt)||raw.issuedAt>Date.now()+30000||
      Date.now()-raw.issuedAt>10*60*1000)return null;
    return {...application,issuedAt:raw.issuedAt};
  }catch{return null;}
}

export async function completeTechnicianApplication(userId:string,application:TechnicianApplication){
  const {error}=await adminSupabase().rpc('complete_technician_registration',{
    p_user_id:userId,p_phone:application.phone,p_name:application.fullName,p_email:application.email,
    p_category_ids:application.categoryIds,p_city_id:application.cityId,
    p_district_ids:application.districtIds,
  });
  if(error)throw new Error('Technician registration failed');
}
