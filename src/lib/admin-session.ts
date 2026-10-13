import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';

// Independent of the retired shared administrator password.
export const adminSessionCookie='hizmetpey-admin-email-session';
export const adminSessionHeader='x-hizmetpey-admin-session';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lifetimeMs=8*60*60*1000;

export function adminSessionSecret():string|null{
  const secret=process.env.ADMIN_SESSION_SECRET;
  return secret&&Buffer.byteLength(secret,'utf8')>=32?secret:null;
}
export function tokenSessionId(accessToken:string|undefined){
  if(!accessToken)return null;
  try{
    const part=accessToken.split('.')[1];
    const payload=JSON.parse(Buffer.from(part,'base64url').toString('utf8'));
    return typeof payload.session_id==='string'&&uuid.test(payload.session_id)?payload.session_id:null;
  }catch{return null;}
}
export function sealAdminSession(userId:string,accessToken:string,now=Date.now()){
  const secret=adminSessionSecret();const sessionId=tokenSessionId(accessToken);
  if(!secret||!uuid.test(userId)||!sessionId)return null;
  const payload=Buffer.from(JSON.stringify({userId,sessionId,expiresAt:now+lifetimeMs})).toString('base64url');
  const signature=createHmac('sha256',secret).update(`hizmetpey-admin-email.v1.${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}
export function validAdminSession(marker:string|undefined,userId:string,accessToken:string|undefined,now=Date.now()){
  const secret=adminSessionSecret();const sessionId=tokenSessionId(accessToken);
  if(!marker||marker.length>512||!secret||!sessionId||!uuid.test(userId))return false;
  const [payload,signature,...extra]=marker.split('.');
  if(!payload||!signature||extra.length||!/^[A-Za-z0-9_-]{43}$/.test(signature))return false;
  const expected=createHmac('sha256',secret).update(`hizmetpey-admin-email.v1.${payload}`).digest();
  let provided:Buffer;
  try{provided=Buffer.from(signature,'base64url');}catch{return false;}
  if(provided.length!==expected.length||provided.toString('base64url')!==signature||
    !timingSafeEqual(provided,expected))return false;
  try{
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return data.userId===userId&&data.sessionId===sessionId&&
      Number.isSafeInteger(data.expiresAt)&&data.expiresAt>now&&data.expiresAt<=now+lifetimeMs;
  }catch{return false;}
}
