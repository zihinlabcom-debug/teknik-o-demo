import type {AccountRole} from './account-auth';

export type AppSurface='all'|AccountRole;

export function appSurface(input:{configured?:string;nodeEnv?:string;vercelEnv?:string}={
  configured:process.env.APP_SURFACE,nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV,
}):AppSurface{
  if(input.configured==='customer'||input.configured==='technician'||input.configured==='admin')return input.configured;
  // Combined mode is for local development and offline tests only.
  if((!input.configured||input.configured==='all')&&
     (input.nodeEnv==='development'||input.nodeEnv==='test')&&
     input.vercelEnv!=='preview'&&input.vercelEnv!=='production')return 'all';
  return 'customer';
}

export function surfaceHome(surface:AppSurface){
  return surface==='technician'?'/giris-usta':surface==='admin'?'/giris-admin':'/';
}

function matches(path:string,root:string){return path===root||path.startsWith(`${root}/`);}

export function surfaceAllowsPath(path:string,surface:AppSurface){
  if(surface==='all')return true;
  if(path==='/')return true;
  if(path==='/api/auth/logout')return true;
  if(surface==='customer')return ['/giris','/kayit','/musteri','/hizmetler','/kategoriler',
    '/dashboard','/iletisim','/teshis','/api/auth/otp','/api/chat','/api/diagnose',
    '/api/category-demand','/api/hr-applications','/api/operations/requests',
    '/api/operations/quotes'].some(root=>matches(path,root));
  if(surface==='technician')return ['/giris-usta','/kayit-usta','/usta',
    '/api/auth/technician','/api/technician','/api/operations/dispatches',
    '/api/operations/jobs'].some(root=>matches(path,root));
  return ['/giris-admin','/admin','/api/auth/admin','/api/admin'].some(root=>matches(path,root));
}
