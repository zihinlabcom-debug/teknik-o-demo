export const dynamic='force-dynamic';

import {adminSupabase} from '@/lib/account-supabase';
import {TechnicianSignupForm} from '@/components/technician-signup-form';

export default async function TechnicianSignupPage(){
  const db=adminSupabase();
  const [{data:categories,error:categoryError},{data:cities,error:cityError},
    {data:districts,error:districtError}]=await Promise.all([
    db.from('service_categories').select('id,name').eq('is_active',true).order('name'),
    db.from('cities').select('id,name').eq('is_active',true).order('name'),
    db.from('districts').select('id,city_id,name').eq('is_active',true).order('name').limit(2000),
  ]);
  if(categoryError||cityError||districtError)
    return <main className="mx-auto max-w-md p-8 text-sm text-red-800">Kayıt seçenekleri şu anda yüklenemiyor.</main>;
  return <TechnicianSignupForm categories={categories??[]} cities={cities??[]} districts={districts??[]}/>;
}
