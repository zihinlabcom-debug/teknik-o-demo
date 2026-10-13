import {NextResponse} from 'next/server';
export async function POST(){
  return NextResponse.json({error:'SMS ile giriş şu anda aktif değil. Lütfen e-posta adresiniz ve şifrenizle giriş yapın.'},
    {status:410,headers:{'Cache-Control':'no-store'}});
}
