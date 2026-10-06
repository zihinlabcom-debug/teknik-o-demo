import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';

export async function proxy(request:NextRequest){
  const path=request.nextUrl.pathname;

  const protectedPage=
    path==='/usta'||
    path.startsWith('/usta/');

  const protectedApi=
    path.startsWith('/api/technician/')||
    path.startsWith('/api/operations/dispatches/')||
    path.startsWith('/api/operations/jobs/');

  if(!protectedPage&&!protectedApi)
    return NextResponse.next({request});

  const deny=(status:number)=>
    protectedApi
      ?NextResponse.json(
        {error:'Bu işlem için yetkiniz yok.'},
        {status,headers:{'Cache-Control':'no-store'}}
      )
      :NextResponse.redirect(new URL('/giris-usta',request.url));

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if(!url||!key)return deny(503);

  let response=NextResponse.next({request});

  const db=createServerClient(url,key,{
    cookies:{
      getAll(){
        return request.cookies.getAll();
      },
      setAll(values){
        values.forEach(({name,value})=>
          request.cookies.set(name,value)
        );

        response=NextResponse.next({request});

        values.forEach(({name,value,options})=>
          response.cookies.set(name,value,options)
        );
      },
    },
  });

  try{
    const {
      data:{user},
      error:userError
    }=await db.auth.getUser();

    if(!user||userError)return deny(401);

    const {data,error}=await db
      .from('users')
      .select('role,is_active')
      .eq('id',user.id)
      .maybeSingle();

    if(error||!data)return deny(503);

    if(data.role!=='technician'||data.is_active!==true)
      return deny(403);

    return response;
  }catch{
    return deny(503);
  }
}

export const config={
  matcher:[
    '/usta/:path*',
    '/api/technician/:path*',
    '/api/operations/dispatches/:path*',
    '/api/operations/jobs/:path*'
  ]
};
