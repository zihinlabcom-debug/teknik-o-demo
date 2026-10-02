export type AccountRole = 'customer' | 'technician' | 'admin';
export type Account = {id:string; role:AccountRole; is_test:boolean; is_active:boolean};

export function isAccountRole(value:unknown):value is AccountRole {
  return value==='customer'||value==='technician'||value==='admin';
}

export function accountDestination(role:AccountRole) {
  return role==='customer'?'/hizmetler':role==='technician'?'/usta':'/admin';
}

export function requiredRole(pathname:string):AccountRole|null {
  if(pathname==='/admin'||pathname.startsWith('/admin/'))return 'admin';
  if(pathname==='/usta'||pathname.startsWith('/usta/'))return 'technician';
  if(pathname==='/musteri'||pathname.startsWith('/musteri/')||
     ['/hizmetler','/kategoriler','/dashboard','/iletisim','/teshis'].some(path=>pathname===path||pathname.startsWith(`${path}/`)))return 'customer';
  return null;
}

export function authorizePath(pathname:string,account:Account|null):{allowed:true}|{allowed:false;redirect:string} {
  const required=requiredRole(pathname);
  if(!required)return {allowed:true};
  if(!account)return {allowed:false,redirect:'/giris'};
  if(!account.is_active||!isAccountRole(account.role))return {allowed:false,redirect:'/giris?error=account'};
  if(account.role!==required)return {allowed:false,redirect:accountDestination(account.role)};
  return {allowed:true};
}

export function normalizePhone(value:string):string|null {
  const digits=value.replace(/\D/g,'');
  const local=digits.startsWith('90')&&digits.length===12?digits.slice(2):digits.startsWith('0')&&digits.length===11?digits.slice(1):digits;
  return /^5\d{9}$/.test(local)?`+90${local}`:null;
}

export function testOtpEnvironment(input:{nodeEnv:string|undefined;vercelEnv:string|undefined;appEnv:string|undefined;enabled:string|undefined}):boolean {
  return input.enabled==='true'&&input.vercelEnv!=='production'&&
    (input.nodeEnv==='development'||input.nodeEnv==='test'||
      (input.appEnv==='staging'&&input.vercelEnv==='preview'));
}

export function testOtpAllowed(input:{nodeEnv:string|undefined;vercelEnv:string|undefined;appEnv:string|undefined;enabled:string|undefined;configuredCode:string|undefined;submittedCode:string;isTest:boolean}):boolean {
  if(!testOtpEnvironment(input)||!input.isTest)return false;
  const expected=input.configuredCode;
  if(!expected||!/^\d{6}$/.test(expected)||!/^\d{6}$/.test(input.submittedCode))return false;
  // Compare without disclosing the configured code or accepting prefixes.
  if(expected.length!==input.submittedCode.length)return false;
  let difference=0;
  for(let i=0;i<expected.length;i++)difference|=expected.charCodeAt(i)^input.submittedCode.charCodeAt(i);
  return difference===0;
}
