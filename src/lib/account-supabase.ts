import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {cache} from 'react';
import {isAccountRole,type Account} from './account-role';
import {adminSessionCookie,adminSessionHeader,validAdminSession} from './admin-session';

export function publicSupabaseConfig(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error('Supabase public configuration is missing');
  return {url,key};
}

export async function serverSupabase({writeCookies=false,adminSession=false}:{writeCookies?:boolean;adminSession?:boolean}={}){
  const {url,key}=publicSupabaseConfig();
  const store=await cookies();
  // Forward only the server-read HttpOnly cookie, never an inbound caller header.
  const marker=store.get(adminSessionCookie)?.value;
  return createServerClient(url,key,{global:{headers:marker?{[adminSessionHeader]:marker}:{}},...((adminSession||Boolean(marker))?{cookieOptions:{httpOnly:true,
    secure:process.env.NODE_ENV==='production',sameSite:'strict' as const,path:'/'}}:{}),cookies:{
    getAll(){return store.getAll();},
    setAll(values){
      if(writeCookies){values.forEach(({name,value,options})=>store.set(name,value,options));return;}
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

// React shares this verification only within one Server Component render.
// Outside a render (for example a Route Handler), cache calls it afresh.
const readCurrentAccount=cache(async function readCurrentAccount(){
  try{
    const db=await serverSupabase();
    const {data:{user},error:userError}=await db.auth.getUser();
    if(userError||!user)return null;
    const {data,error}=await db.from('users').select('id,role,is_test,is_active').eq('id',user.id).maybeSingle();
    if(error||!data||!isAccountRole(data.role)||data.is_active!==true||typeof data.is_test!=='boolean')return null;
    if(data.role==='admin'){
      if(!user.email_confirmed_at||!user.email)return null;
      const marker=(await cookies()).get(adminSessionCookie)?.value;
      const {data:{session}}=await db.auth.getSession();
      if(!validAdminSession(marker,user.id,session?.access_token))return null;
      const {data:authorized,error:authorizationError}=await db.rpc('is_app_admin');
      if(authorizationError||authorized!==true)return null;
    }
    if(data.role!=='admin'){
      if(!user.email_confirmed_at||!user.email)return null;
      const {data:ready,error:readyError}=await db.rpc('email_account_ready');
      if(readyError||ready!==true)return null;
    }
    return data as Account;
  }catch{return null;}
});

export async function currentAccount(){
  return readCurrentAccount();
}
