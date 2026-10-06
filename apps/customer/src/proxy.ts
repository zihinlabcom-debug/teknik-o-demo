import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';

function isCustomerPath(path:string){
  return path==='/' ||
    path==='/giris' ||
    path==='/kayit' ||
    path.startsWith('/musteri') ||
    path.startsWith('/hizmetler') ||
    path.startsWith('/kategoriler') ||
    path.startsWith('/dashboard') ||
    path.startsWith('/iletisim') ||
    path.startsWith('/teshis') ||
    path.startsWith('/api/');
}

function isProtectedCustomerPath(path:string){
  return path==='/musteri' ||
    path.startsWith('/musteri/') ||
    path==='/hizmetler' ||
    path.startsWith('/hizmetler/') ||
    path==='/kategoriler' ||
    path.startsWith('/kategoriler/') ||
    path==='/dashboard' ||
    path.startsWith('/dashboard/') ||
    path==='/iletisim' ||
    path.startsWith('/iletisim/') ||
    path==='/teshis' ||
    path.startsWith('/teshis/');
}

export async function proxy(request:NextRequest){
  const path=request.nextUrl.pathname;

  if(!isCustomerPath(path)){
    return path.startsWith('/api/')
      ? new NextResponse(null,{status:404})
      : NextResponse.redirect(new URL('/giris',request.url));
  }

  if(!isProtectedCustomerPath(path))
    return NextResponse.next({request});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if(!url||!key)
    return NextResponse.redirect(new URL('/giris',request.url));

  let response=NextResponse.next({request});

  const db=createServerClient(url,key,{
    cookies:{
      getAll(){return request.cookies.getAll();},
      setAll(values){
        values.forEach(({name,value})=>request.cookies.set(name,value));
        response=NextResponse.next({request});
        values.forEach(({name,value,options})=>response.cookies.set(name,value,options));
      },
    },
  });

  try{
    const {data:{user},error:userError}=await db.auth.getUser();

    if(!user||userError)
      return NextResponse.redirect(new URL('/giris',request.url));

    const {data,error}=await db
      .from('users')
      .select('role,is_active')
      .eq('id',user.id)
      .maybeSingle();

    if(error||!data||data.role!=='customer'||data.is_active!==true)
      return NextResponse.redirect(new URL('/giris',request.url));

    return response;
  }catch{
    return NextResponse.redirect(new URL('/giris',request.url));
  }
}

export const config={
  matcher:['/((?!_next|.*\\..*).*)']
};
