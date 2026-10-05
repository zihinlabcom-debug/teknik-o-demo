import {registerHooks} from 'node:module';

registerHooks({
  resolve(specifier,context,next){
    if(specifier==='server-only')return {url:'test:server-only',shortCircuit:true};
    if(specifier==='./account-supabase'&&['/technician-management.ts','/admin-technician-management.ts','/technician-management-common.ts'].some(s=>context.parentURL?.endsWith(s)))return {
      url:new URL('./technician-management-db-double.mjs',import.meta.url).href,shortCircuit:true};
    if(specifier==='@/lib/operation-server')return {
      url:new URL('./operation-server-test-double.mjs',import.meta.url).href,shortCircuit:true};
    return next(specifier,context);
  },
  load(url,context,next){
    if(url==='test:server-only')return {format:'module',shortCircuit:true,source:'export {};'};
    return next(url,context);
  },
});
