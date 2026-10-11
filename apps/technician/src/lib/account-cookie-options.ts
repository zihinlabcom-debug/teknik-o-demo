import type {CookieOptions} from '@supabase/ssr';

// Supabase SSR refreshes the browser session from JavaScript, so these Auth
// cookies deliberately remain readable by the Supabase browser client.
export function accountSessionCookieOptions():CookieOptions{
  return {
    httpOnly:false,
    secure:process.env.NODE_ENV==='production',
    sameSite:'lax',
    path:'/',
  };
}
