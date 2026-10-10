import 'server-only';
import {adminSupabase} from './account-supabase';
import {OperationError} from './operation-error';
import {requireTechnicianManagementAccount as requireAccount,checkTechnicianManagement as check} from './technician-management-common';

export async function ownTechnicianProfile(){
  const account=await requireAccount('technician');
  const db=adminSupabase();
  const [{data:profile,error:profileError},{data:assignments,error:categoryError},
    {data:areas,error:areaError},{data:categories,error:catalogError},
    {data:cities,error:cityError},{data:districts,error:districtError},
    {data:documents,error:documentsError}]=await Promise.all([
    db.from('technician_profiles').select('approval_status,is_available').eq('user_id',account.id).maybeSingle(),
    db.from('technician_service_categories').select('category_id,approval_status').eq('technician_id',account.id),
    db.from('technician_service_areas').select('city_id,district_id').eq('technician_id',account.id),
    db.from('service_categories').select('id,name,requires_document'),
    db.from('cities').select('id,name'),
    db.from('districts').select('id,name'),
    db.from('technician_documents').select('id,category_id,status,original_file_name').eq('technician_id',account.id),
  ]);
  check(profileError,'Usta profili');check(categoryError,'Usta kategorileri');
  check(areaError,'Hizmet alanları');check(catalogError,'Kategoriler');
  check(cityError,'Şehirler');check(districtError,'İlçeler');check(documentsError,'Belgeler');
  return {isActive:account.is_active,profile,
    categories:(assignments??[]).map(a=>{
      const category=(categories??[]).find(c=>c.id===a.category_id);
      return {id:a.category_id,name:category?.name??'Kategori',
        requiresDocument:category?.requires_document===true,status:a.approval_status,
        hasSubmittedDocument:(documents??[]).some(d=>d.category_id===a.category_id&&d.status==='pending'),
        hasVerifiedDocument:(documents??[]).some(d=>d.category_id===a.category_id&&d.status==='verified')};
    }),documents:documents??[],
    areas:(areas??[]).map(a=>{
      const city=(cities??[]).find(c=>c.id===a.city_id)?.name??'Şehir';
      const district=a.district_id?(districts??[]).find(d=>d.id===a.district_id)?.name:null;
      return district?`${city} / ${district}`:city;
    })};
}

export async function setOwnTechnicianAvailability(isAvailable:boolean){
  const account=await requireAccount('technician');
  if(typeof isAvailable!=='boolean')throw new OperationError('invalid_input',400,'Geçersiz müsaitlik değeri.');
  const {data,error}=await adminSupabase().rpc('set_technician_availability',{
    p_actor_id:account.id,p_is_available:isAvailable,
  });
  if(error)throw new OperationError('availability_unavailable',409,'Müsaitlik yalnız onaylı ve aktif usta için değiştirilebilir.');
  return {changed:data===true};
}

