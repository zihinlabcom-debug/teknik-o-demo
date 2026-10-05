import 'server-only';
import {adminSupabase} from './account-supabase';
import {OperationError} from './operation-error';
import {requireTechnicianManagementAccount as requireAccount,checkTechnicianManagement as check} from './technician-management-common';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions=new Set(['approve','reject','suspend','pending','activate','deactivate',
  'category_add','category_remove','area_add','area_remove','document_verify','document_reject']);

export async function adminTechnicianOverview(){
  await requireAccount('admin');
  const db=adminSupabase();
  const [{data:users,error:usersError},{data:categories,error:categoriesError},
    {data:cities,error:citiesError},{data:districts,error:districtsError}]=await Promise.all([
    db.from('users').select('id,name,is_active,is_test,created_at').eq('role','technician').order('created_at',{ascending:false}).limit(200),
    db.from('service_categories').select('id,code,name,is_active,requires_document').order('name'),
    db.from('cities').select('id,name,is_active').order('name'),
    db.from('districts').select('id,city_id,name,is_active').order('name'),
  ]);
  check(usersError,'Usta listesi');check(categoriesError,'Kategoriler');
  check(citiesError,'Şehirler');check(districtsError,'İlçeler');
  const ids=(users??[]).map(u=>u.id);
  if(!ids.length)return {technicians:[],categories:categories??[],cities:cities??[],districts:districts??[]};
  const [{data:profiles,error:profilesError},{data:assignedCategories,error:assignedCategoriesError},
    {data:areas,error:areasError},{data:documents,error:documentsError}]=await Promise.all([
    db.from('technician_profiles').select('user_id,approval_status,is_available,address_city_id,address_district_id,address_line').in('user_id',ids),
    db.from('technician_service_categories').select('technician_id,category_id,approval_status').in('technician_id',ids),
    db.from('technician_service_areas').select('technician_id,city_id,district_id').in('technician_id',ids),
    db.from('technician_documents').select('id,technician_id,category_id,document_type,status,original_file_name').in('technician_id',ids),
  ]);
  check(profilesError,'Usta profilleri');check(assignedCategoriesError,'Usta kategorileri');
  check(areasError,'Hizmet alanları');check(documentsError,'Usta belgeleri');
  return {technicians:(users??[]).map(user=>({
    ...user,profile:(profiles??[]).find(p=>p.user_id===user.id)??null,
    categories:(assignedCategories??[]).filter(c=>c.technician_id===user.id),
    areas:(areas??[]).filter(a=>a.technician_id===user.id),
    documents:(documents??[]).filter(d=>d.technician_id===user.id),
  })),categories:categories??[],cities:cities??[],districts:districts??[]};
}

export async function adminChangeTechnicianCategory(technicianId:string,categoryId:string,action:'approve'|'reject'){
  const account=await requireAccount('admin');
  if(!uuid.test(technicianId)||!uuid.test(categoryId)||!['approve','reject'].includes(action))
    throw new OperationError('invalid_input',400,'Geçersiz kategori işlemi.');
  const {data,error}=await adminSupabase().rpc('admin_change_technician_category',{
    p_actor_id:account.id,p_technician_id:technicianId,p_category_id:categoryId,p_action:action,
  });
  if(error)throw new OperationError('invalid_transition',409,'Kategori onayı için doğrulanmış belge veya uygun kayıt gerekli.');
  return {changed:data===true};
}

export async function adminCategoryCatalog(){
  await requireAccount('admin');
  const {data,error}=await adminSupabase().from('service_categories')
    .select('id,code,name,is_active,requires_document').order('name');
  check(error,'Kategoriler');return data??[];
}

export async function adminSetCategoryDocumentRequirement(categoryId:string,requiresDocument:boolean){
  await requireAccount('admin');
  if(!uuid.test(categoryId)||typeof requiresDocument!=='boolean')
    throw new OperationError('invalid_input',400,'Geçersiz kategori işlemi.');
  const {data,error}=await adminSupabase().from('service_categories')
    .update({requires_document:requiresDocument}).eq('id',categoryId).select('id').single();
  if(error||!data)throw new OperationError('operation_failed',500,'Kategori güncellenemedi.');
  return {changed:true};
}

export async function adminChangeTechnician(technicianId:string,input:{
  action:string;categoryId?:string;cityId?:number;districtId?:number;documentId?:string;
}){
  const account=await requireAccount('admin');
  if(!uuid.test(technicianId)||!actions.has(input.action) ||
    (input.categoryId!==undefined&&!uuid.test(input.categoryId)) ||
    (input.documentId!==undefined&&!uuid.test(input.documentId)) ||
    (input.cityId!==undefined&&(!Number.isSafeInteger(input.cityId)||input.cityId<=0)) ||
    (input.districtId!==undefined&&(!Number.isSafeInteger(input.districtId)||input.districtId<=0)))
    throw new OperationError('invalid_input',400,'Geçersiz usta işlemi.');
  const {data,error}=await adminSupabase().rpc('admin_change_technician',{
    p_actor_id:account.id,p_technician_id:technicianId,p_action:input.action,
    p_category_id:input.categoryId??null,p_city_id:input.cityId??null,
    p_district_id:input.districtId??null,p_document_id:input.documentId??null,
  });
  if(error)throw new OperationError('invalid_transition',409,'Usta işlemi mevcut kayıtlarla doğrulanamadı.');
  return {changed:data===true};
}
