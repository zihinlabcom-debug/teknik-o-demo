import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
const lines=readFileSync('.local-email-auth/start.log','utf8').split(/\r?\n/);
export const runtime=lines.map(line=>{try{return JSON.parse(line)}catch{return null}}).find(row=>row?.API_URL&&row?.ANON_KEY);
if(!runtime||runtime.API_URL!=='http://127.0.0.1:61321')throw new Error('Refusing non-isolated Supabase');
export const api=role=>'http://127.0.0.1:'+(role==='customer'?'3130':'3131');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
export const admin=createClient(runtime.API_URL,runtime.SERVICE_ROLE_KEY,options);
export const client=()=>createClient(runtime.API_URL,runtime.ANON_KEY,options);
export const password=()=>randomBytes(18).toString('hex')+'aA3!';
export class BrowserSession{
 constructor(role){this.base=api(role);this.jar=new Map();this.headers=[];}
 async request(path,body,method='POST'){
  const headers={Origin:this.base};
  if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json';
  if(this.jar.size)headers.Cookie=[...this.jar].map(([k,v])=>k+'='+v).join('; ');
  const response=await fetch(this.base+path,{method,headers,body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body),redirect:'manual'});
  this.headers=response.headers.getSetCookie();
  for(const value of this.headers){
   const cookie=value.split(';')[0];const i=cookie.indexOf('=');
   const name=cookie.slice(0,i),data=cookie.slice(i+1);
   if(!data||/max-age=0/i.test(value))this.jar.delete(name);else this.jar.set(name,data);
  }
  const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=null}
  return {status:response.status,data,headers:response.headers};
 }
}
export async function mail(email,subject,after=new Set()){
 for(let attempt=0;attempt<40;attempt++){
  const box=await fetch('http://127.0.0.1:61324/api/v1/messages').then(r=>r.json());
  const item=box.messages?.find(m=>!after.has(m.ID)&&m.To?.some(to=>to.Address===email)&&(!subject||m.Subject.includes(subject)));
  if(item){
   const message=await fetch('http://127.0.0.1:61324/api/v1/message/'+item.ID).then(r=>r.json());
   return {id:item.ID,text:message.Text||message.HTML,html:message.HTML};
  }
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw new Error('Local captured email was not received');
}
export function otp(message){
 const code=message.text.match(/\b[0-9]{6}\b/)?.[0];
 if(!code)throw new Error('Six digit OTP absent from captured email');
 return code;
}
