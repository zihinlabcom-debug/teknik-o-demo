import {registerHooks} from 'node:module';
registerHooks({
  resolve(specifier,context,next){
    if(specifier==='server-only')return {url:'test:server-only',shortCircuit:true};
    if(specifier==='./account-supabase'&&context.parentURL?.endsWith('/admin-password-auth.ts'))
      return {url:new URL('./admin-auth-db-double.mjs',import.meta.url).href,shortCircuit:true};
    return next(specifier,context);
  },
  load(url,context,next){if(url==='test:server-only')return {format:'module',shortCircuit:true,source:'export {};'};
    return next(url,context);},
});
