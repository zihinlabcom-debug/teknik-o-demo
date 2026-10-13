export const smsDisabledMessage='SMS ile giriş şu anda aktif değil. Lütfen e-posta adresiniz ve şifrenizle giriş yapın.';
export function normalizeEmail(value:unknown):string|null{
  if(typeof value!=='string')return null;
  const email=value.trim().toLowerCase();
  return email.length<=254&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)?email:null;
}
export function validEmailOtp(value:unknown):value is string{
  return typeof value==='string'&&/^[0-9]{6}$/.test(value);
}
export function safeAuthOrigin(value:string|undefined){
  if(!value)throw new Error('EMAIL_AUTH_ORIGIN required');
  const url=new URL(value);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||
    (url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))
    throw new Error('Invalid Auth origin');
  return url.origin;
}
export function sameOriginJson(request:Request,expectedOrigin?:string){
  const origin=request.headers.get('origin');
  return request.headers.get('content-type')?.split(';')[0]==='application/json'&&
    request.headers.get('sec-fetch-site')!=='cross-site'&&
    (!origin||origin===(expectedOrigin??new URL(request.url).origin));
}

export function smsAuthEnabled(){return false;}
