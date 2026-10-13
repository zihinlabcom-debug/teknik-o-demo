import {NextResponse} from 'next/server';
import {adminSupabase} from '@/lib/account-supabase';
// Registration needs a narrow public catalog, never anonymous access to user tables.
export async function GET(request:Request){
 const raw=new URL(request.url).searchParams.get('cityId');
 const cityId=raw===null?null:Number(raw);
 if(raw!==null&&(!Number.isSafeInteger(cityId)||Number(cityId)<=0))
  return NextResponse.json({error:'Geçersiz il seçimi.'},{status:400});
 try{
  const db=adminSupabase();
  if(cityId!==null){
   const city=await db.from('cities').select('id').eq('id',cityId).eq('is_active',true).maybeSingle();
   if(city.error)throw new Error('Catalog unavailable');
   if(!city.data)return NextResponse.json({items:[]});
  }
  const result=cityId===null
   ?await db.from('cities').select('id,name').eq('is_active',true).order('plate_code')
   :await db.from('districts').select('id,city_id,name').eq('city_id',cityId).eq('is_active',true).order('name');
  if(result.error)throw new Error('Catalog unavailable');
  return NextResponse.json({items:result.data??[]},{headers:{'Cache-Control':'public, max-age=60'}});
 }catch{return NextResponse.json({error:'Adres seçenekleri yüklenemedi.'},{status:503});}
}
