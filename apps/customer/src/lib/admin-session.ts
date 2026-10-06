import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';

export const adminSessionCookie='tekniko-admin-password-session';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lifetimeMs=8*60*60*1000;

function secret(){const value=process.env.ADMIN_SHARED_PASSWORD;
  return value&&value.length>=16?value:null;}

function tokenSessionId(accessToken:string|undefined){
  if(!accessToken)return null;
  try{
    const payload=JSON.parse(Buffer.from(accessToken.split('.')[1],'base64url').toString('utf8'));
    return typeof payload.session_id==='string'&&uuid.test(payload.session_id)?payload.session_id:null;
  }catch{return null;}
}

export function sealAdminSession(userId:string,accessToken:string,now=Date.now()){
  const key=secret();const sessionId=tokenSessionId(accessToken);
  if(!key||!uuid.test(userId)||!sessionId)return null;
  const payload=Buffer.from(JSON.stringify({userId,sessionId,expiresAt:now+lifetimeMs})).toString('base64url');
  const signature=createHmac('sha256',key).update(`admin-password.v1.${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}

export function validAdminSession(marker:string|undefined,userId:string,accessToken:string|undefined,
  now=Date.now()){
  const key=secret();const sessionId=tokenSessionId(accessToken);
  if(!marker||marker.length>512||!key||!sessionId||!uuid.test(userId))return false;
  const [payload,signature,...rest]=marker.split('.');
  if(!payload||!signature||rest.length)return false;
  const expected=createHmac('sha256',key).update(`admin-password.v1.${payload}`).digest();
  let provided:Buffer;
  try{provided=Buffer.from(signature,'base64url');}catch{return false;}
  if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return false;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return data.userId===userId&&data.sessionId===sessionId&&
      Number.isSafeInteger(data.expiresAt)&&data.expiresAt>now&&data.expiresAt<=now+lifetimeMs;
  }catch{return false;}
}
