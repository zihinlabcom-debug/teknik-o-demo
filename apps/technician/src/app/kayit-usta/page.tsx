export const dynamic='force-dynamic';

import {adminSupabase} from '@/lib/account-supabase';
import {TechnicianSignupForm} from '@/components/technician-signup-form';
import {TechnicianAuthShell} from '@/components/technician-auth-shell';

export default async function TechnicianSignupPage(){
  const db=adminSupabase();
  const [{data:categories,error:categoryError},{data:cities,error:cityError},
    {data:districts,error:districtError}]=await Promise.all([
    db.from('service_categories').select('id,name').eq('is_active',true).order('name'),
    db.from('cities').select('id,name').eq('is_active',true).order('name'),
    db.from('districts').select('id,city_id,name').eq('is_active',true).order('name').limit(2000),
  ]);
  if(categoryError||cityError||districtError)
    return <TechnicianAuthShell eyebrow="USTA BAŞVURUSU" title="Kayıt seçenekleri yüklenemedi" description="Başvuru formu için gerekli hizmet ve bölge bilgilerine şu anda ulaşılamıyor."><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">Lütfen daha sonra yeniden deneyin.</p></TechnicianAuthShell>;
  return <TechnicianSignupForm categories={categories??[]} cities={cities??[]} districts={districts??[]}/>;
}
