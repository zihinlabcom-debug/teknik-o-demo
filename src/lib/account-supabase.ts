import {createClient} from '@supabase/supabase-js';
import {createServerClient,type CookieOptions} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {isAccountRole,type Account} from './account-auth';

export function publicSupabaseConfig(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error('Supabase public configuration is missing');
  return {url,key};
}

export type PendingCookie={name:string;value:string;options:CookieOptions};

export async function serverSupabase({
  writeCookies=false,
  onCookies,
}:{writeCookies?:boolean;onCookies?:(values:PendingCookie[])=>void}={}){
  const {url,key}=publicSupabaseConfig();
  const store=await cookies();
  return createServerClient(url,key,{cookies:{
    getAll(){return store.getAll();},
    setAll(values){
      if(writeCookies){
        onCookies?.(values);
        values.forEach(({name,value,options})=>store.set(name,value,options));
        return;
      }
      try{values.forEach(({name,value,options})=>store.set(name,value,options));}
      catch{/* Server Component: proxy refreshes cookies. */}
    },
  }});
}

export function adminSupabase(){
  const {url}=publicSupabaseConfig();
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error('Supabase admin configuration is missing');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export async function currentAccount(){
  try{
    const db=await serverSupabase();
    const {data:{user},error:userError}=await db.auth.getUser();
    if(userError||!user)return null;
    const {data,error}=await db.from('users').select('id,role,is_test,is_active').eq('id',user.id).maybeSingle();
    if(error||!data||!isAccountRole(data.role)||data.is_active!==true||typeof data.is_test!=='boolean')return null;
    return data as Account;
  }catch{return null;}
}
